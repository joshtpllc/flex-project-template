/*
 * TwiML for the <Enqueue> waitUrl. Callers will hear the messaging and hold music while in queue to speak to an agent.
 * They can - at any point - press the star key to leave a voicemail and abandon the ongoing call.
 *
 */
const { twilioExecute } = require(Runtime.getFunctions()['common/helpers/function-helper'].path);
const TaskRouterOperations = require(Runtime.getFunctions()['common/twilio-wrappers/taskrouter'].path);
const CallbackOperations = require(Runtime.getFunctions()['features/callback-and-voicemail/common/callback-operations']
  .path);
const LanguagePrompts = require(Runtime.getFunctions()['features/callback-and-voicemail/common/language-prompts'].path);

const options = {
  retainPlaceInQueue: true,
  sayOptions: { voice: 'Google.en-US-Neural2-A' },
  holdMusicUrl: 'http://com.twilio.music.soft-rock.s3.amazonaws.com/_ghost_-_promo_2_sample_pack.mp3',
  messages: {},
};

/**
 * Utility function to retrieve all recent pending tasks for the supplied workflow, and find the one that matches our call SID.
 * This avoids the need to use EvaluateTaskAttributes which is strictly rate limited to 3 RPS.
 * @param {*} context
 * @param {*} callSid
 * @param {*} workflowSid
 * @returns
 */
async function getPendingTaskByCallSid(context, callSid, workflowSid) {
  // Limiting to a single max payload size of 50 since the task should be top of the list.
  // Fine tuning of this value can be done based on anticipated call volume and validated through load testing.
  const result = await TaskRouterOperations.getTasks({
    context,
    assignmentStatus: ['pending', 'reserved'],
    workflowSid,
    ordering: 'DateCreated:desc',
    limit: 50,
  });

  return result.data?.find((task) => task.attributes.call_sid === callSid);
}

/**
 *
 * @param {*} context
 * @param {*} taskSid
 * @returns
 */
async function fetchTask(context, taskSid) {
  const result = await TaskRouterOperations.fetchTask({
    context,
    taskSid,
  });
  return result.data;
}
/**
 * Cancels the task and updates the attributes to reflect the abandoned status.
 * We don't want callbacks or voicemails to contribute to abandoned task metrics.
 *
 * @param {*} context
 * @param {*} task
 * @param {*} cancelReason
 */
async function cancelTask(context, task, cancelReason) {
  const newAttributes = {
    ...task.attributes,
    conversations: {
      ...task.attributes.conversations,
      abandoned: 'Follow-Up',
    },
  };

  return TaskRouterOperations.updateTask({
    context,
    taskSid: task.sid,
    updateParams: {
      assignmentStatus: 'canceled',
      reason: cancelReason,
      attributes: JSON.stringify(newAttributes),
    },
  });
}

exports.handler = async (context, event, callback) => {
  const twiml = new Twilio.twiml.VoiceResponse();
  const baseUrl = `https://${context.DOMAIN_NAME}/features/callback-and-voicemail/studio/wait-experience`;
  let holdMusicUrl = options.holdMusicUrl;

  // Make relative hold music URLs absolute
  // <Play> does not support relative URLs
  if (!holdMusicUrl.startsWith('http://') && !holdMusicUrl.startsWith('https://')) {
    holdMusicUrl = domain + holdMusicUrl;
  }

  const { Digits, CallSid, QueueSid, mode, enqueuedTaskSid, skipGreeting } = event;
  let selectedLanguage = 'english';
  let enqueuedTask = null;

  if (mode === 'initialize' || mode === undefined || !enqueuedTaskSid) {
    const workflowSid = (await twilioExecute(context, (client) => client.queues(QueueSid).fetch())).data.friendlyName;
    enqueuedTask = await getPendingTaskByCallSid(context, CallSid, workflowSid);
    if (enqueuedTask?.attributes?.selected_language) {
      selectedLanguage = enqueuedTask.attributes.selected_language.toLowerCase();
    }
  } else {
    const taskData = await fetchTask(context, enqueuedTaskSid);
    if (taskData?.attributes?.selected_language) {
      selectedLanguage = taskData.attributes.selected_language.toLowerCase();
    }
  }

  try {
    const prompts = await LanguagePrompts.getLanguagePrompts({ language: selectedLanguage });

    options.sayOptions.voice = selectedLanguage === 'spanish' ? 'Google.es-US-Neural2-A' : options.sayOptions.voice;
    options.messages = prompts;
  } catch (err) {
    console.error('Error fetching language prompts:', err);
  }

  switch (mode) {
    case 'initialize':
    case undefined:
      // Initial logic to find the associated task for the call, and propagate it through to the rest of the TwiML execution
      // If the lookup fails to find the task, the remaining TwiML logic will not offer any callback or voicemail options.
      const enqueuedWorkflowSid = (await twilioExecute(context, (client) => client.queues(QueueSid).fetch())).data
        .friendlyName;
      console.log(`Enqueued workflow sid: ${enqueuedWorkflowSid}`);
      enqueuedTask = await getPendingTaskByCallSid(context, CallSid, enqueuedWorkflowSid);

      const redirectBaseUrl = `${baseUrl}?mode=main-wait-loop&CallSid=${CallSid}`;

      if (enqueuedTask) {
        twiml.redirect(redirectBaseUrl + (enqueuedTask ? `&enqueuedTaskSid=${enqueuedTask.sid}` : ''));
      } else {
        // Log an error for our own debugging purposes, but don't fail the call
        console.error(
          `Failed to find the pending task with callSid: ${CallSid}. This is potentially due to higher call volume than the API query had accounted for.`,
        );
        twiml.redirect(redirectBaseUrl);
      }
      return callback(null, twiml);

    case 'main-wait-loop':
      if (skipGreeting !== 'true') {
        twiml.say(options.sayOptions, options.messages.initialGreeting);
      }
      if (enqueuedTaskSid) {
        // Nest the <Say>/<Play> within the <Gather> to allow the caller to press a key at any time during the nested verbs' execution.
        const initialGather = twiml.gather({
          input: 'dtmf',
          timeout: '2',
          action: `${baseUrl}?mode=handle-initial-choice&CallSid=${CallSid}&enqueuedTaskSid=${enqueuedTaskSid}`,
        });
        initialGather.say(options.sayOptions, options.messages.repeatingPrompt);
        initialGather.play(holdMusicUrl);
      } else {
        // If the task lookup failed to find the task previously, don't offer callback or voicemail options - since we aren't able to cancel
        // the ongoing call task
        twiml.say(options.sayOptions, options.messages.callbackAndVoicemailUnavailable);
        twiml.play(holdMusicUrl);
      }
      // Loop back to the start if we reach this point
      twiml.redirect(
        `${baseUrl}?mode=main-wait-loop&CallSid=${CallSid}&enqueuedTaskSid=${enqueuedTaskSid}&skipGreeting=true`,
      );
      return callback(null, twiml);

    case 'handle-initial-choice':
      // If the caller pressed the star key, prompt for callback or voicemail
      if (Digits === '*') {
        // Nest the <Say>/<Play> within the <Gather> to allow the caller to press a key at any time during the nested verbs' execution.
        const callbackOrVoicemailGather = twiml.gather({
          input: 'dtmf',
          timeout: '2',
          action: `${baseUrl}?mode=handle-callback-or-voicemail-choice&CallSid=${CallSid}&enqueuedTaskSid=${enqueuedTaskSid}`,
        });
        callbackOrVoicemailGather.say(options.sayOptions, options.messages.callbackOrVoicemailChoice);
      }

      // Loop back to the start of the wait loop
      twiml.redirect(
        `${baseUrl}?mode=main-wait-loop&CallSid=${CallSid}&enqueuedTaskSid=${enqueuedTaskSid}&skipGreeting=true`,
      );
      return callback(null, twiml);

    case 'handle-callback-or-voicemail-choice':
      // Redirect call to callback or voicemail logic.
      if (Digits === '1') {
        // Callback option selected
        // Prompt the caller if they wish to use the number they called from, or another number.
        const callbackOptionsGather = twiml.gather({
          input: 'dtmf',
          timeout: '5',
          numDigits: 1,
          action: `${baseUrl}?mode=handle-callback-choice&CallSid=${CallSid}&enqueuedTaskSid=${enqueuedTaskSid}`,
        });
        callbackOptionsGather.say(options.sayOptions, options.messages.callbackChoice);
        return callback(null, twiml);
      } else if (Digits === '2') {
        // Voicemail option selected
        // We need to update the call with a new TwiML URL vs using twiml.redirect() since we are still in the waitUrl TwiML execution
        // and it's not possible to use the <Record> verb in here.
        // First, cancel (update) the task with handy attributes for reporting, which we can't do later.
        const task = await fetchTask(context, enqueuedTaskSid);
        const cancelResult = await cancelTask(context, task, 'Opted to leave a voicemail');
        const result = await twilioExecute(context, (client) =>
          client.calls(CallSid).update({
            method: 'POST',
            url: `${baseUrl}?mode=record-voicemail&CallSid=${CallSid}&enqueuedTaskSid=${enqueuedTaskSid}`,
          }),
        );
        const { success, status } = result;
        if (success) {
          return callback(null, '');
        }
        console.error(`Failed to update call ${CallSid} with new TwiML. Status: ${status}`);
        twiml.say(options.sayOptions, options.messages.processingError);
        if (cancelResult.success) {
          // The task was canceled, so we have nothing to route now.
          twiml.hangup();
          return callback(null, twiml);
        }
      }

      // Loop back to the start of the wait loop if the caller pressed any other key
      twiml.redirect(
        `${baseUrl}?mode=main-wait-loop&CallSid=${CallSid}&enqueuedTaskSid=${enqueuedTaskSid}&skipGreeting=true`,
      );
      return callback(null, twiml);

    case 'handle-callback-choice':
      if (Digits && Digits === '1') {
        // Caller selected option to use the number they called from
        twiml.redirect(
          `${baseUrl}?mode=submit-callback&CallSid=${CallSid}&enqueuedTaskSid=${enqueuedTaskSid}&to=${encodeURIComponent(
            event.Caller,
          )}`,
        );
        return callback(null, twiml);
      } else if (Digits && Digits === '2') {
        // Get desired phone number from caller
        const gather = twiml.gather({
          input: 'dtmf',
          timeout: 10,
          numDigits: 13,
          finishOnKey: '#',
          action: `${baseUrl}?mode=handle-callback-for-other-number-confirmation-option&enqueuedTaskSid=${enqueuedTaskSid}&CallSid=${CallSid}`,
          method: 'GET',
        });
        gather.say(options.sayOptions, options.messages.callbackForOtherNumber);
      }

      // Loop back to the start of the wait loop
      twiml.redirect(
        `${baseUrl}?mode=main-wait-loop&CallSid=${CallSid}&enqueuedTaskSid=${enqueuedTaskSid}&skipGreeting=true`,
      );
      return callback(null, twiml);

    case 'handle-callback-for-other-number-confirmation-option':
      if (Digits) {
        const say = twiml.say(options.sayOptions, `${options.messages.callbackForOtherNumberConfirm1} `);
        say.sayAs(
          {
            'interpret-as': 'telephone',
          },
          Digits.trim(),
        );

        const gather = twiml.gather({
          input: 'dtmf',
          timeout: 15,
          numDigits: 1,
          finishOnKey: '#',
          action: `${baseUrl}?mode=handle-callback-for-other-number-confirmation&enqueuedTaskSid=${enqueuedTaskSid}&updatedPhoneNumber=${Digits.trim()}`,
          method: 'GET',
        });
        gather.say(options.sayOptions, ` ${options.messages.callbackForOtherNumberConfirm2}`);
      } else {
        twiml.say(options.sayOptions, options.messages.invalidInput);
      }
      return callback(null, twiml);

    case 'handle-callback-for-other-number-confirmation':
      if (Digits && Digits === '1') {
        twiml.redirect(
          `${baseUrl}?mode=submit-callback&CallSid=${CallSid}&enqueuedTaskSid=${enqueuedTaskSid}&to=${event.updatedPhoneNumber}`,
        );
      } else {
        const gather = twiml.gather({
          input: 'dtmf',
          timeout: 10,
          numDigits: 13,
          finishOnKey: '#',
          action: `${baseUrl}?mode=handle-callback-for-other-number-confirmation-option&enqueuedTaskSid=${enqueuedTaskSid}`,
          method: 'GET',
        });
        gather.say(options.sayOptions, options.messages.callbackForOtherNumber);
      }
      return callback(null, twiml);

    case 'submit-callback':
      // Cancel the original task and create the Callback task
      const originalTask = await fetchTask(context, enqueuedTaskSid);
      await cancelTask(context, originalTask, 'Opted to request a callback');

      // Here you can optionally adjust callback parameters, such as a overriddenWorkflowSid
      const callbackParams = {
        context,
        originalTask,
        numberToCall: event.to,
        numberToCallFrom: event.Called,
      };

      if (options.retainPlaceInQueue && enqueuedTaskSid) {
        // Get the original task's start time to maintain queue ordering.
        callbackParams.virtualStartTime = originalTask?.dateCreated;
      }

      await CallbackOperations.createCallbackTask(callbackParams);

      // End the interaction. Hangup the call.
      twiml.say(options.sayOptions, options.messages.callbackSubmitted);
      twiml.hangup();
      return callback(null, twiml);

    case 'record-voicemail':
      // Main logic for Recording the voicemail
      twiml.say(options.sayOptions, options.messages.recordVoicemailPrompt);
      // Manually append caller and called number to the transcribeCallback, as it passes incorrect values when Caller Name Lookup is enabled
      twiml.record({
        action: `${baseUrl}?mode=voicemail-recorded&CallSid=${CallSid}&enqueuedTaskSid=${enqueuedTaskSid}`,
        transcribeCallback: `${baseUrl}?mode=submit-voicemail&CallSid=${CallSid}&enqueuedTaskSid=${enqueuedTaskSid}&calledNumber=${encodeURIComponent(
          event.Called,
        )}&callerNumber=${encodeURIComponent(event.Caller)}`,
        method: 'GET',
        playBeep: 'true',
        transcribe: true,
        timeout: 10,
        finishOnKey: '*',
      });
      twiml.say(options.sayOptions, options.messages.voicemailNotCaptured);
      twiml.redirect(`${baseUrl}?mode=record-voicemail&CallSid=${CallSid}&enqueuedTaskSid=${enqueuedTaskSid}`);
      return callback(null, twiml);

    case 'voicemail-recorded':
      // End the interaction. Hangup the call.
      twiml.say(options.sayOptions, options.messages.voicemailRecorded);
      twiml.hangup();
      return callback(null, twiml);

    case 'submit-voicemail':
      // Submit the voicemail to TaskRouter (and/or to your backend if you have a voicemail handling solution)
      const originalTaskForVm = await fetchTask(context, enqueuedTaskSid);

      // Create the Voicemail task
      // Here you can optionally adjust voicemail parameters, such as a overriddenWorkflowSid
      const vmParams = {
        context,
        originalTask: originalTaskForVm,
        numberToCall: event.callerNumber,
        numberToCallFrom: event.calledNumber,
        recordingSid: event.RecordingSid,
        recordingUrl: event.RecordingUrl,
        transcriptSid: event.TranscriptionSid,
        transcriptText: event.TranscriptionText,
      };

      if (options.retainPlaceInQueue && enqueuedTaskSid) {
        // Get the original task's start time to maintain queue ordering.
        vmParams.virtualStartTime = originalTaskForVm?.dateCreated;
      }

      await CallbackOperations.createCallbackTask(vmParams);

      return callback(null, '');

    default:
      //  Default case - if we don't recognize the mode, redirect to the main wait loop
      twiml.say(options.sayOptions, options.messages.processingError);
      twiml.redirect(
        `${baseUrl}?mode=main-wait-loop&CallSid=${CallSid}&enqueuedTaskSid=${enqueuedTaskSid}&skipGreeting=true`,
      );
      return callback(null, twiml);
  }
};
