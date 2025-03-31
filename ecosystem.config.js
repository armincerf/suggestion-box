const prod_secret = "zero";
export const apps = [
	{
		name: "zero-cache",
		script: `export ZERO_AUTH_SECRET='${prod_secret}' && bun run prod:zero-cache`,
		env_production: {
			NODE_ENV: "production",
			ZERO_UPSTREAM_DB:
				"postgresql://user:password@localhost:5469/suggestion-box-prod",
			ZERO_AUTH_SECRET: prod_secret,
			ZERO_REPLICA_FILE: "/tmp/zstart_solid_replica.db",
		},
	},
	{
		name: "frontend",
		script: `export VITE_PUBLIC_SERVER='https://zero.agileapp3000.com' && export VITE_ZERO_AUTH_SECRET='${prod_secret}' && bun run prod:ui:build && bun run prod:ui:preview`,
		env_production: {
			NODE_ENV: "production",
			VITE_PUBLIC_SERVER: "https://zero.agileapp3000.com",
			VITE_ZERO_AUTH_SECRET: prod_secret,
		},
	},
];
