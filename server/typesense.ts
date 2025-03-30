// server/typesense.ts
import Typesense from 'typesense';
import type { CollectionCreateSchema } from 'typesense/lib/Typesense/Collections';
// Import your data types from shared schema
import type { Suggestion, Comment } from '../shared/zero/schema';

// --- Configuration ---
const typesenseHost = process.env.TYPESENSE_HOST;
const typesensePort = Number.parseInt(process.env.TYPESENSE_PORT || '443', 10);
const typesenseProtocol = process.env.TYPESENSE_PROTOCOL || 'https';
const typesenseApiKey = process.env.TYPESENSE_API_KEY;

if (!typesenseHost || !typesenseApiKey) {
    console.warn(
        'Typesense environment variables (TYPESENSE_HOST, TYPESENSE_API_KEY) are not fully configured. Indexing will be disabled.'
    );
}

// --- Initialize Client ---
// Initialize only if configuration is present
const typesenseClient =
    typesenseHost && typesenseApiKey
        ? new Typesense.Client({
              nodes: [
                  {
                      host: typesenseHost,
                      port: typesensePort,
                      protocol: typesenseProtocol,
                  },
              ],
              apiKey: typesenseApiKey,
              connectionTimeoutSeconds: 5, // Adjust as needed
              numRetries: 3,
              retryIntervalSeconds: 1,
          })
        : null; // Set to null if not configured

if (typesenseClient) {
    console.log(`Typesense client initialized for host: ${typesenseHost}`);
}

// --- Define Typesense Schemas ---
// Adjust fields based on what you want to search/filter/facet on

const suggestionCollectionSchema: CollectionCreateSchema = {
    name: 'suggestions',
    fields: [
        // --- Core Fields ---
        { name: 'id', type: 'string', index: true }, // Indexed for retrieval/updates
        { name: 'body', type: 'string', index: true }, // *** Key field for keyword search ***
        { name: 'userId', type: 'string', facet: true, index: true }, // Facet for filtering by user
        { name: 'displayName', type: 'string', optional: true, index: true }, // Searchable user name
        { name: 'categoryId', type: 'string', facet: true, index: true }, // Facet for filtering by category
        { name: 'timestamp', type: 'int64', sort: true }, // Sort by creation time
        { name: 'updatedAt', type: 'int64', sort: true, optional: true }, // Sort by update time

        // --- Embedding Field for Semantic Search ---
        {
            name: 'embedding', // Name of the field to store the vector embedding
            type: 'float[]', // Must be float[]
            embed: { // Configuration for automatic embedding generation
                from: ['body'], // *** Field(s) to generate embedding from ***
                model_config: {
                    // Good general-purpose English model (Default in Typesense)
                    model_name: 'ts/all-MiniLM-L12-v2',
                },
            },
        },
        // Do NOT index deletedAt directly unless needed for specific queries.
        // We handle deletion by removing the document.
    ],
    default_sorting_field: 'timestamp', // Or '_text_match' if relevance is primary default
};

const commentCollectionSchema: CollectionCreateSchema = {
    name: 'comments',
    fields: [
        { name: 'id', type: 'string', index: true },
        { name: 'body', type: 'string', index: true }, // For keyword search
        { name: 'suggestionId', type: 'string', facet: true, index: true }, // Filter comments by suggestion
        { name: 'userId', type: 'string', facet: true, index: true }, // Filter by user
        { name: 'displayName', type: 'string', optional: true, index: true },
        { name: 'timestamp', type: 'int64', sort: true },
        { name: 'isRootComment', type: 'bool', facet: true }, // Filter root comments vs replies
        { name: 'parentCommentId', type: 'string', optional: true, index: true }, // Useful for threading if needed
        // Enable embedding for semantic search on comments
        {
            name: 'embedding', 
            type: 'float[]',
            embed: { 
                from: ['body'], 
                model_config: { 
                    model_name: 'ts/all-MiniLM-L12-v2' 
                } 
            }
        },
        // Do NOT index deletedAt - remove document instead
    ],
    default_sorting_field: 'timestamp',
};

// --- Helper to Ensure Collections Exist ---
export async function ensureTypesenseCollections(): Promise<void> {
    if (!typesenseClient) return; // Do nothing if client isn't configured

    const schemasToEnsure = [suggestionCollectionSchema, commentCollectionSchema];
    console.log('Ensuring Typesense collections exist...');

    for (const schema of schemasToEnsure) {
        try {
            await typesenseClient.collections(schema.name).retrieve();
            console.log(`Collection "${schema.name}" already exists.`);
        } catch (error: unknown) {
            if (error instanceof Error && 'httpStatus' in error && error.httpStatus === 404) {
                console.log(`Collection "${schema.name}" not found, creating...`);
                try {
                    await typesenseClient.collections().create(schema);
                    console.log(`Collection "${schema.name}" created successfully.`);
                } catch (createError: unknown) {
                    console.error(`Failed to create collection "${schema.name}":`, createError);
                }
            } else {
                console.error(`Error retrieving collection "${schema.name}":`, error);
            }
        }
    }
}

// --- Indexing Functions ---

export async function indexSuggestion(suggestion: Suggestion | null): Promise<void> {
    if (!typesenseClient || !suggestion) return;

    // IMPORTANT: Check if the suggestion is soft-deleted
    if (suggestion.deletedAt) {
        console.log(`[Typesense] Suggestion ${suggestion.id} soft-deleted, removing from index.`);
        await deleteSuggestionFromIndex(suggestion.id);
        return;
    }

    // Prepare the document matching the Typesense schema *exactly*
    // DO NOT include the 'embedding' field - Typesense generates it
    const document = {
        id: suggestion.id,
        body: suggestion.body,
        userId: suggestion.userId,
        displayName: suggestion.displayName, // Send even if optional, let Typesense handle it
        categoryId: suggestion.categoryId,
        timestamp: suggestion.timestamp,   // Ensure this is epoch milliseconds (number)
        updatedAt: suggestion.updatedAt,   // Ensure this is epoch milliseconds (number)
    };

    try {
        console.log(`[Typesense] Upserting suggestion ${suggestion.id}`);
        // Provide the specific type for better type checking if possible
        await typesenseClient.collections<typeof document>('suggestions').documents().upsert(document);
        console.log(`[Typesense] Upserted suggestion ${suggestion.id} successfully.`);
    } catch (error) {
        console.error(`[Typesense] Failed to upsert suggestion ${suggestion.id}:`, error);
        // Add more robust error handling/logging if needed
    }
}

export async function deleteSuggestionFromIndex(suggestionId: string): Promise<void> {
    if (!typesenseClient || !suggestionId) return;
    try {
        await typesenseClient.collections('suggestions').documents(suggestionId).delete();
        console.log(`Deleted suggestion ${suggestionId} from Typesense.`);
    } catch (error: unknown) {
        // It's okay if the document is already gone (404)
        if (error instanceof Error && 'httpStatus' in error && error.httpStatus !== 404) {
            console.error(`Failed to delete suggestion ${suggestionId} from Typesense:`, error);
        } else {
             console.log(`Suggestion ${suggestionId} already deleted or never existed in Typesense.`);
        }
    }
}

export async function indexComment(comment: Comment | null): Promise<void> {
     if (!typesenseClient || !comment) return;

     // Check for soft deletion if your comment schema supports it
    // if (comment.deletedAt) {
    //     console.log(`[Typesense] Comment ${comment.id} soft-deleted, removing from index.`);
    //     await deleteCommentFromIndex(comment.id);
    //     return;
    // }

     const document = {
        id: comment.id,
        body: comment.body,
        suggestionId: comment.suggestionId,
        userId: comment.userId,
        displayName: comment.displayName,
        timestamp: comment.timestamp,
        isRootComment: comment.isRootComment,
        parentCommentId: comment.parentCommentId,
        // DO NOT include embedding here if schema handles it automatically
    };

     try {
        console.log(`[Typesense] Upserting comment ${comment.id}`);
        await typesenseClient.collections<typeof document>('comments').documents().upsert(document);
        console.log(`[Typesense] Upserted comment ${comment.id} successfully.`);
    } catch (error) {
        console.error(`[Typesense] Failed to upsert comment ${comment.id}:`, error);
    }
}

export async function deleteCommentFromIndex(commentId: string): Promise<void> {
     if (!typesenseClient || !commentId) return;
    try {
        await typesenseClient.collections('comments').documents(commentId).delete();
        console.log(`Deleted comment ${commentId} from Typesense.`);
    } catch (error: unknown) {
        if (error instanceof Error && 'httpStatus' in error && error.httpStatus !== 404) {
            console.error(`Failed to delete comment ${commentId} from Typesense:`, error);
        } else {
             console.log(`Comment ${commentId} already deleted or never existed in Typesense.`);
        }
    }
}