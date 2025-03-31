# Anonymous Suggestion Box

An anonymous suggestion box application built with SolidJS and Zero. This app allows users to:

- Submit anonymous suggestions
- View all submitted suggestions
- Comment on suggestions (including selection-based comments)
- Add nested replies to comments
- React to suggestions and comments with emojis
- Edit their own suggestions
- Delete their own comments

## Setting Up

### Prerequisites

- Node.js (v16 or later)
- Docker and Docker Compose
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   bun i
   ```

### Running the Application

1. Start a postgres db at port 5469 (or modify port in package.json)

2. Run the Zero Cache development server:
   ```bash
   bun dev:zero-cache
   ```

3. In a separate terminal, start the frontend development server:
   ```bash
   bun dev:ui
   ```

4. Open your browser and navigate to the URL shown in the terminal (typically http://localhost:5173)

## User Identification

Users are assigned a random identifier stored in localStorage when they first visit the site. This identifier is used to:

- Track which suggestions, comments, and reactions belong to them
- Allow them to edit or delete their own content
- Prevent them from reacting multiple times with the same emoji

## Permissions

- Anyone can create suggestions
- Users can only edit their own suggestions (not delete them)
- Users can only delete their own comments and reactions
- Anyone can view all content

## Technical Details

- Frontend: SolidJS
- Database: PostgreSQL
- Data Sync: Zero (Rocicorp)
- Storage: Client-side localStorage for user identification

## File Structure

- `src/` - Frontend code
  - `App.tsx` - Main application component
  - `schema.ts` - Zero schema definition
- `docker/` - Docker configuration
  - `docker-compose.yml` - Container setup
  - `seed.sql` - Database initialization

## Logging

The application uses HyperDX for logging in production environments. In development, logs are formatted and displayed in the console.

### Using the logger

```typescript
import { logger } from './hyperdx-logger';

// Basic logging
logger.info('User logged in');
logger.warn('Failed login attempt', { username: 'testuser' });
logger.error('Request failed', new Error('Network error'), { url: '/api/data' });
logger.debug('Debug information', { requestId: '123' });

// Setting user information
logger.setUserInfo({
  userId: 'user123',
  userEmail: 'user@example.com',
  userName: 'Test User',
  teamName: 'Engineering'
});

// Tracking custom actions
logger.trackAction('Button-Clicked', {
  buttonId: 'submit-form',
  formName: 'Signup Form'
});
```

In development, logs are formatted for the console. In production, logs are sent to HyperDX for centralized logging and monitoring.

HyperDX will also automatically capture:
- Console logs
- Network requests (XHR/fetch/websocket)
- Exceptions
- Session replays (to see what users were experiencing)