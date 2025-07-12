exports.getLanguagePrompts = async (parameters) => {
  const { language } = parameters;
  const matrix = {
    identifyTarget: {
      english:
        "Thank you for calling! If you're inquiring about a number different from the one you're calling from, press 1. Otherwise, please stay on the line.",
      spanish:
        '¡Gracias por su llamada! Si necesita asistencia sobre un número diferente al que está utilizando para esta llamada, marque 1. Y si no, permanezca en la línea.',
      french:
        'Merci de nous appeler! Si vous avez une question sur un autre numéro que celui utilisé pour cet appel, appuyez sur 1. Sinon, veuillez rester en ligne.',
    },
    provideNumber: {
      english: 'Please input the 10 digit number you are calling about.',
      spanish: 'Por favor, ingrese el número de teléfono por el cual necesita ayuda.',
      french: 'Veuillez saisir le numéro à 10 chiffres concerné par votre demande.',
    },
    informRecording: {
      english: 'This call may be recorded for quality assurance.',
      spanish: 'Esta llamada puede ser grabada para garantizar la calidad del servicio al cliente.',
      french: "Cet appel peut être enregistré afin d'assurer la qualité du service.",
    },
    weClosed: {
      english: 'We are currently closed. Please call back during our normal business hours.',
      spanish: 'En este momento nuestra oficina está cerrada. Por favor, llámenos de nuevo durante nuestro horario.',
      french: 'Nos bureaux sont actuellement fermés. Merci de rappeler pendant nos horaires d’ouverture.',
    },
    leaveVoicemail: {
      english: 'To leave a voicemail, press 1. If you prefer not to leave a message, you may hang up at any time.',
      spanish: 'Para dejar un mensaje de voz, oprima 1. Si no, puede colgar en cualquier momento.',
      french: 'Pour laisser un message vocal, appuyez sur 1. Sinon, vous pouvez raccrocher à tout moment.',
    },
    initialGreeting: {
      english: 'Please wait while we direct your call to the next available representative.',
      spanish: 'Por favor espere mientras dirigimos su llamada al siguiente representante disponible.',
      french: 'Veuillez patienter pendant que nous transférons votre appel au prochain représentant disponible.',
    },
    repeatingPrompt: {
      english:
        'To request a callback, or to leave a voicemail, press the star key at anytime... Otherwise, please continue to hold.',
      spanish:
        'Para solicitar una devolución de llamada o dejar un mensaje de voz, presione la tecla de asterisco en cualquier momento... De lo contrario, continúe en espera.',
      french:
        'Pour demander un rappel ou laisser un message vocal, appuyez sur la touche étoile à tout moment... Sinon, veuillez continuer à patienter.',
    },
    callbackOrVoicemailChoice: {
      english:
        'To request a callback when a representative becomes available, press 1. To leave a voicemail for the next available representative, press 2. To continue holding, press any other key, or remain on the line.',
      spanish:
        'Para solicitar una devolución de llamada cuando un representante esté disponible, presione 1. Para dejar un mensaje de voz, presione 2. Para seguir esperando, presione cualquier otra tecla o permanezca en la línea.',
      french:
        "Pour demander un rappel lorsqu'un représentant sera disponible, appuyez sur 1. Pour laisser un message vocal, appuyez sur 2. Pour continuer à attendre, appuyez sur une autre touche ou restez en ligne.",
    },
    callbackChoice: {
      english:
        'To request a callback to the same number you have called from, press 1. To request a callback to a different number, press 2. To continue holding, press any other key, or remain on the line.',
      spanish:
        'Para solicitar una devolución de llamada al mismo número desde el que llamó, presione 1. Para otro número, presione 2. Para seguir esperando, presione cualquier otra tecla o permanezca en la línea.',
      french:
        'Pour demander un rappel au même numéro, appuyez sur 1. Pour un autre numéro, appuyez sur 2. Pour continuer à attendre, appuyez sur une autre touche ou restez en ligne.',
    },
    callbackSubmitted: {
      english: 'Thank you. A callback has been requested. You will receive a call shortly. Goodbye.',
      spanish: 'Gracias. Se ha solicitado una devolución de llamada. Recibirá una llamada pronto. Adiós.',
      french: 'Merci. Un rappel a été demandé. Vous recevrez un appel sous peu. Au revoir.',
    },
    callbackForOtherNumber: {
      english:
        'Please enter the phone number, starting with the country code. When you are finished, press the # sign.',
      spanish:
        'Por favor, ingrese el número de teléfono comenzando por el código de país. Cuando termine, presione la tecla numeral (#).',
      french:
        "Veuillez entrer le numéro de téléphone, en commençant par l'indicatif du pays. Lorsque vous avez terminé, appuyez sur le dièse (#).",
    },
    callbackForOtherNumberConfirm1: {
      english: 'You entered',
      spanish: 'Usted ingresó',
      french: 'Vous avez saisi',
    },
    callbackForOtherNumberConfirm2: {
      english: 'Press 1 to confirm or 2 to re-enter.',
      spanish: 'Presione 1 para confirmar o 2 para volver a ingresar el número.',
      french: 'Appuyez sur 1 pour confirmer ou sur 2 pour saisir à nouveau le numéro.',
    },
    recordVoicemailPrompt: {
      english:
        'Please leave a message at the tone. When you are finished recording, you may hang up, or press the star key.',
      spanish:
        'Por favor deje un mensaje después del tono. Cuando termine, puede colgar o presionar la tecla de asterisco.',
      french:
        'Veuillez laisser un message après le bip sonore. Lorsque vous avez terminé, vous pouvez raccrocher ou appuyer sur la touche étoile.',
    },
    voicemailNotCaptured: {
      english: "Sorry. We weren't able to capture your message.",
      spanish: 'Lo sentimos. No pudimos capturar su mensaje.',
      french: "Désolé. Nous n'avons pas pu enregistrer votre message.",
    },
    voicemailRecorded: {
      english: 'Your voicemail has been successfully recorded... Goodbye',
      spanish: 'Su mensaje de voz ha sido grabado exitosamente... Adiós',
      french: 'Votre message vocal a été enregistré avec succès... Au revoir',
    },
    callbackAndVoicemailUnavailable: {
      english:
        'The option to request a callback or leave a voicemail is not available at this time. Please continue to hold.',
      spanish:
        'La opción de solicitar una devolución de llamada o dejar un mensaje de voz no está disponible en este momento. Por favor, continúe en espera.',
      french:
        "L'option de demander un rappel ou de laisser un message vocal n'est pas disponible pour le moment. Veuillez continuer à patienter.",
    },
    processingError: {
      english: 'Sorry, we were unable to perform this operation. Please remain on the line.',
      spanish: 'Lo sentimos, no pudimos realizar esta operación. Por favor, permanezca en la línea.',
      french: "Désolé, nous n'avons pas pu effectuer cette opération. Veuillez rester en ligne.",
    },
    invalidInput: {
      english: 'You have entered an invalid selection. Please try again.',
      spanish: 'Ha ingresado una selección inválida. Por favor, intente de nuevo.',
      french: 'Vous avez fait une sélection invalide. Veuillez réessayer.',
    },
  };

  let chosenLanguage = (language || 'english').toLowerCase();
  if (!matrix.identifyTarget[chosenLanguage]) {
    chosenLanguage = 'english';
  }

  const prompts = {};
  Object.keys(matrix).forEach((key) => {
    prompts[key] = matrix[key][chosenLanguage];
  });

  return prompts;
};
