import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

// Dev playground for the library. Aliases `fork` to the live source so edits in
// src/ hot-reload here. Not part of the published package.
export default defineConfig({
	root: fileURLToPath(new URL(".", import.meta.url)),
	plugins: [vue()],
	resolve: {
		alias: {
			fork: fileURLToPath(new URL("../src/index.ts", import.meta.url)),
		},
	},
	server: { port: 5177, open: true },
});
