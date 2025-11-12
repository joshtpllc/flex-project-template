# Twilio Flex Serverless Functions

This is a Twilio Flex serverless functions project built with Node.js 18+ that provides backend API support for a customer contact center platform. The codebase deploys to Twilio's serverless infrastructure and serves as the API layer for Twilio Flex UI features and integrations.

## Project Structure

```
serverless-functions/
├── src/
│   ├── functions/           # All serverless functions
│   │   ├── common/          # Shared utilities and Flex/Studio API wrappers
│   │   └── features/        # Feature-specific implementations
│   └── assets/              # Static assets (HTML, CSS, JS, audio files)
├── package.json             # Node dependencies
├── .env                     # Environment variables (create from .env.example)
├── .env.example             # Environment variable template
└── .twilioserverlessrc      # Twilio Serverless deployment configuration
```

## Core Features

### 1. Common Utilities

Located in [src/functions/common/](src/functions/common/)

Provides shared functionality and API wrappers for all features:

- Helper Functions - Token validation, parameter validation, retry logic, and Twilio SDK execution
- Twilio API Wrappers - Abstraction layer for TaskRouter, Programmable Voice, and Configuration APIs
- Flex API Functions - Phone number management, conversations, call control, and TaskRouter operations
- Studio Functions - Task creation from Studio workflows

### 2. Callback and Voicemail

Located in [features/callback-and-voicemail](src/functions/features/callback-and-voicemail/)

Enables callers to request callbacks or leave voicemails while waiting in queue:
- Multi-language IVR wait experience (English, Spanish, French)
- Voice selection based on caller's language preference
- Menu-driven DTMF input gathering
- Voicemail recording with transcription
- Queue position preservation for callbacks
- Voicemail retrieval for agents

### 3. Chat Transfer

Located in [features/chat-transfer](src/functions/features/chat-transfer/)

Enables agents to transfer chat conversations:
- Transfer to specific workers or queues
- Conversation context preservation
- Task linking for reporting

### 4. Conversation Transfer

Located in [features/conversation-transfer](src/functions/features/conversation-transfer/)

Manages participant transfers in conversations:
- Add/remove participants from conversations
- Conversation state management

### 5. Internal Call

Located in [features/internal-call](src/functions/features/internal-call/)

Enables internal agent-to-agent calls and outbound calling:
- Agent-to-agent conference calls
- Outbound dialing with TwiML handling
- Rejected call cleanup

### 6. Admin UI

Located in [features/admin-ui](src/functions/features/admin-ui/)

Configuration management for Flex UI attributes:
- Fetch current UI configuration
- Update UI configuration

### 7. Canned Responses

Located in [features/canned-responses](src/functions/features/canned-responses/)

Provides pre-written message templates for chat agents to improve response time and consistency.

## Function Types

### Flex Functions (.js)
- Called from Flex UI with JWT token validation
- Require Flex authentication token
- Return JSON responses

### Studio Functions (.protected.js)
- Called from Twilio Studio workflows
- Protected by Twilio Studio authentication
- Return TwiML or JSON

### Private Functions (.private.js)
- Internal utility and helper functions
- Not callable from external clients
- Accessed via Runtime.getFunctions() by other functions

## Environment Configuration

Create a `.env` file based on `.env.example` with the following variables:

```bash
# Required Twilio Credentials
ACCOUNT_SID=your_account_sid
AUTH_TOKEN=your_auth_token

# Flex Configuration
TWILIO_FLEX_WORKSPACE_SID=your_workspace_sid
TWILIO_FLEX_SYNC_SID=your_sync_service_sid
TWILIO_FLEX_CHAT_SERVICE_SID=your_chat_service_sid

# API Credentials (for Video)
TWILIO_API_KEY=your_api_key
TWILIO_API_SECRET=your_api_secret

# Workflow SIDs
TWILIO_FLEX_CALLBACK_WORKFLOW_SID=your_callback_workflow_sid
TWILIO_FLEX_CHAT_TRANSFER_WORKFLOW_SID=your_chat_transfer_workflow_sid
TWILIO_FLEX_INTERNAL_CALL_WORKFLOW_SID=your_internal_call_workflow_sid

# Service Configuration (optional - defaults provided)
TWILIO_SERVICE_RETRY_LIMIT=5
TWILIO_SERVICE_MIN_BACKOFF=100
TWILIO_SERVICE_MAX_BACKOFF=300

# Video Configuration (optional - defaults provided)
VIDEO_CODE_LENGTH=7
VIDEO_CODE_TTL=60
VIDEO_ROOM_ALLOW_CREATE=false
VIDEO_ROOM_TYPE=group
VIDEO_RECORD_BY_DEFAULT=false

# Development
ENABLE_LOCAL_LOGGING=true
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create your `.env` file:
```bash
cp .env.example .env
# Edit .env with your Twilio credentials
```

## Deployment

### Deploy to Twilio Serverless

Deploy the functions and assets to Twilio's serverless environment:

```bash
npm run deploy
```

This will:
- Build and upload all functions from `src/functions/`
- Upload all assets from `src/assets/`
- Create or update the Twilio Serverless service
- Display the deployed function URLs

### Deploy Using Twilio CLI Directly

You can also use the Twilio Serverless Toolkit CLI directly:

```bash
# Deploy with default profile
twilio serverless:deploy

# Deploy with a specific Twilio profile
twilio serverless:deploy --profile=your-profile-name

# Deploy to a specific environment
twilio serverless:deploy --environment=dev

# Deploy with custom service name
twilio serverless:deploy --service-name=your-service-name

# Deploy and override environment variables
twilio serverless:deploy --override-existing-project
```

### View Deployed Functions

List all deployed services:
```bash
twilio serverless:list
```

View function logs in real-time:
```bash
twilio serverless:logs --tail
```

### Local Development

Run functions locally for testing:

```bash
npm start
```

This starts a local development server at `http://localhost:3000` with hot-reloading enabled.

## Key Technologies

- Node.js 18+ - Runtime environment
- Twilio SDK v4.23.0 - Twilio API interactions
- @twilio/runtime-handler v2.0.0 - Serverless function handler
- twilio-flex-token-validator - JWT token validation for Flex functions
- Axios - HTTP client for REST API calls
- Lodash - Utility functions

## Response Pattern

All functions follow a standardized response structure:

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {},
  "status": 200,
  "twilioDocPage": "https://...",
  "twilioErrorCode": null
}
```

## Documentation

For more information about Twilio Flex and Serverless:
- [Twilio Flex Documentation](https://www.twilio.com/docs/flex)
- [Twilio Serverless Toolkit](https://www.twilio.com/docs/labs/serverless-toolkit)
- [Twilio Functions Quickstart](https://www.twilio.com/docs/serverless/functions-assets/quickstart)
