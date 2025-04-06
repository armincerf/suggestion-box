import { config } from "dotenv";

config();

export const apps = [
	{
		name: "zero-cache",
		script: "bun run prod:zero-cache",
		env_production: {
			NODE_ENV: "production",
			ZERO_AUTH_SECRET: process.env.ZERO_AUTH_SECRET,
			ZERO_APP_ID: process.env.ZERO_APP_ID,
			ZERO_UPSTREAM_DB:
				process.env.ZERO_UPSTREAM_DB,
			ZERO_REPLICA_FILE:
				process.env.ZERO_REPLICA_FILE,
		},
	},
	{
		name: "frontend",
		script: "bun run prod:ui:build && bun run prod:ui:preview",
		env_production: {
			NODE_ENV: "production",
			VITE_PUBLIC_SERVER:
				process.env.VITE_PUBLIC_SERVER,
			VITE_ZERO_AUTH_SECRET: process.env.ZERO_AUTH_SECRET,
			VITE_TYPESENSE_SUGGESTIONS_COLLECTION:
				process.env.VITE_TYPESENSE_SUGGESTIONS_COLLECTION,
			VITE_TYPESENSE_COMMENTS_COLLECTION:
				process.env.VITE_TYPESENSE_COMMENTS_COLLECTION,
		},
	},
	{
		name: "polling-service",
		script: "bun run prod:poll-service",
		env_production: {
			NODE_ENV: "production",
			PROD_DB_URL:
				process.env.PROD_DB_URL, 
			VITE_TYPESENSE_SUGGESTIONS_COLLECTION:
				process.env.VITE_TYPESENSE_SUGGESTIONS_COLLECTION,
			VITE_TYPESENSE_COMMENTS_COLLECTION:
				process.env.VITE_TYPESENSE_COMMENTS_COLLECTION,
		},
	},
];
