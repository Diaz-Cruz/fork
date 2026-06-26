import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

// Vite's lib mode extracts the `import "./styles.css"` out of the JS bundle into
// a sibling dist/styles.css and drops the import statement — so `import "fork"`
// would ship zero styles and the toast would render unpositioned/unanimated.
// Upstream sileo (bunchee) keeps the CSS import in its built entry so styles
// auto-load on import; this plugin restores that behaviour by re-injecting the
// import at the top of the emitted entry chunk.
const injectCssImport = () => ({
	name: "sileo-inject-css-import",
	generateBundle(_options: unknown, bundle: Record<string, { type: string; isEntry?: boolean; code?: string }>) {
		for (const file of Object.values(bundle)) {
			if (file.type === "chunk" && file.isEntry && file.code) {
				if (!file.code.includes('"./styles.css"')) {
					file.code = `import "./styles.css";\n${file.code}`;
				}
			}
		}
	},
});

export default defineConfig({
	plugins: [
		vue(),
		injectCssImport(),
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
