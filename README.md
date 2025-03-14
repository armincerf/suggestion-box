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
   npm install
   ```

### Running the Application

1. Start the database and Zero Cache service:
   ```bash
   docker-compose -f docker/docker-compose.yml up -d
   ```

2. Run the Zero Cache development server:
   ```bash
   npm run zero-dev
   ```

3. In a separate terminal, start the frontend development server:
   ```bash
   npm run dev
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

## Troubleshooting

If you encounter the error `Failed to load zero schema from src/schema.ts`, make sure:

1. You have `"type": "module"` in your package.json
2. The schema.ts file uses ESM syntax (not using `type` imports)
3. Your tsconfig.json has the correct ESM configuration
