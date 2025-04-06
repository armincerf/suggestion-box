import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import devtools from 'solid-devtools/vite'
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig({
	optimizeDeps: {
		esbuildOptions: {
			supported: {
				"top-level-await": true,
			},
		},
	},
	esbuild: {
		supported: {
			"top-level-await": true,
		},
	},
	plugins: [
		devtools({
			autoname: true,
		}),
		solid(),
		tailwindcss(),
		visualizer(),
	],
	build: {
		target: "esnext",
		cssMinify: "esbuild",
		assetsInlineLimit: 4096,
		rollupOptions: {
			treeshake: "smallest",
		},
	},
	server: {
		allowedHosts: true,
	},
});
