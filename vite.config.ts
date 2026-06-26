import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
	plugins: [
		vue(),
		dts({
			rollupTypes: true,
			tsconfigPath: "./tsconfig.build.json",
		}),
	],
	build: {
		lib: {
			entry: fileURLToPath(new URL("./src/index.ts", import.meta.url)),
			// ESM-only: motion-v is ESM-only (no `require` export), so a CJS build
			// would emit an unrequireable `require("motion-v")`. Anyone who can use
			// motion-v can consume ESM, so shipping CJS would only ship a broken entry.
			formats: ["es"],
			fileName: () => "index.mjs",
			cssFileName: "styles",
		},
		rollupOptions: {
			external: ["vue", "motion-v", "@vueuse/core"],
			output: {
				exports: "named",
			},
		},
		cssCodeSplit: false,
		sourcemap: true,
		emptyOutDir: true,
	},
});
