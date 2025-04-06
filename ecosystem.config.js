import { config } from "dotenv";

config();

export const apps = [
	{
		name: "zero-cache",
		script: "bun run prod:zero-cache",
		env_production: {
			NODE_ENV: "production",
			ZERO_AUTH_SECRET: process.env.ZERO_AUTH_SECRET,
			ZERO_APP_ID: process.env.ZERO_APP_ID || "suggestionbprod",
			ZERO_UPSTREAM_DB:
				process.env.ZERO_UPSTREAM_DB ||
				"postgresql://user:password@localhost:5469/suggestion-box-prod",
			ZERO_REPLICA_FILE:
				process.env.ZERO_REPLICA_FILE || "/tmp/zstart_solid_replica_prod.db",
		},
	},
	{
		name: "frontend",
		script: "bun run prod:ui:build && bun run prod:ui:preview",
		env_production: {
			NODE_ENV: "production",
			VITE_PUBLIC_SERVER:
				process.env.VITE_PUBLIC_SERVER || "https://api.example.com",
			VITE_ZERO_AUTH_SECRET: process.env.ZERO_AUTH_SECRET,
			VITE_TYPESENSE_SUGGESTIONS_COLLECTION:
				process.env.VITE_TYPESENSE_SUGGESTIONS_COLLECTION || "suggestions_prod",
			VITE_TYPESENSE_COMMENTS_COLLECTION:
				process.env.VITE_TYPESENSE_COMMENTS_COLLECTION || "comments_prod",
		},
	},
	{
		name: "polling-service",
		script: "bun run prod:poll-service",
		env_production: {
			NODE_ENV: "production",
			PROD_DB_URL:
				process.env.PROD_DB_URL ||
				"postgresql://user:password@localhost:5469/suggestion-box-prod",
			VITE_TYPESENSE_SUGGESTIONS_COLLECTION:
				process.env.VITE_TYPESENSE_SUGGESTIONS_COLLECTION || "suggestions_prod",
			VITE_TYPESENSE_COMMENTS_COLLECTION:
				process.env.VITE_TYPESENSE_COMMENTS_COLLECTION || "comments_prod",
		},
	},
];
