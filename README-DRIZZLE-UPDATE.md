# Drizzle ORM Update

This project has been updated to use [Drizzle ORM](https://orm.drizzle.team) for database schema management and querying, replacing the direct SQL schema definitions previously used. Additionally, [drizzle-zero](https://github.com/drizzle-team/drizzle-zero) has been integrated to convert Drizzle schemas to Zero schemas.

## What Changed

1. **Schema Definition**: Moved from direct SQL definitions in `docker/seed.sql` to TypeScript-based schema definitions in `src/db/schema.ts` using Drizzle ORM.

2. **Zero Schema Generation**: Now using `drizzle-zero` to automatically generate Zero schemas from Drizzle schemas in `src/zero-schema.ts`.

3. **Migrations**: Added support for Drizzle's migration system to manage database schema changes through code.

4. **New Tools**: Added Drizzle Studio for database visualization and management.

## New Features

- **Type Safety**: Full TypeScript type safety for database operations
- **Relationship Handling**: Simplified relationship definitions between tables
- **Migration Management**: Easier schema versioning and tracking
- **Query Building**: Improved query building with Drizzle's query API

## New Scripts

The following scripts have been added to `package.json`:

- `db:generate` - Generate SQL migrations using Drizzle Kit
- `db:push` - Push schema changes directly to the database
- `db:seed` - Run the database seeding script
- `db:studio` - Launch Drizzle Studio to view and edit data

## How to Use

See the detailed documentation in `DRIZZLE.md` for comprehensive information about the Drizzle integration.

### Quick Start

1. To push schema changes directly to the database:
   ```bash
   npm run db:push
   ```

2. To seed the database with initial data:
   ```bash
   npm run db:seed
   ```

3. To explore your database with Drizzle Studio:
   ```bash
   npm run db:studio
   ```

4. To test the Drizzle integration:
   ```bash
   bun tsx scripts/test-drizzle.ts
   ```

## Database Code Examples

```typescript
// Import the database client and schema
import { db } from "./src/db";
import { suggestions, comments } from "./src/db/schema";
import { eq } from "drizzle-orm";

// Query suggestions
const allSuggestions = await db.select().from(suggestions);

// Insert a comment
await db.insert(comments).values({
  id: "comment-id",
  body: "This is a comment",
  timestamp: new Date(),
  suggestionId: "suggestion-id",
  userId: "user-123",
  isRootComment: true,
});

// Query with relationships
const suggestionsWithComments = await db.query.suggestions.findMany({
  with: {
    comments: true,
    category: true,
  },
});
```

For more information about the Drizzle ORM integration, see the `DRIZZLE.md` file. 