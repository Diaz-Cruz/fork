import { onBeforeUnmount, onMounted, type Ref, ref, watch } from "vue";

export const THEME_FILLS = {
	light: "#1a1a1a",
	dark: "#f2f2f2",
} as const;

type Theme = "light" | "dark" | "system" | undefined;

/**
 * Resolves a `light`/`dark`/`system` theme to a concrete `light`/`dark` value.
 *
 * Hydration-safe: returns a deterministic value on the server and on the first
 * client render (explicit theme, otherwise `"light"`); the `matchMedia` read is
 * deferred to `onMounted` so SSR markup and the hydrated markup always match.
 */
export function useResolvedTheme(theme: Ref<Theme>): Ref<"light" | "dark"> {
	const resolved = ref<"light" | "dark">(
		theme.value === "light" || theme.value === "dark" ? theme.value : "light",
	);

	let mq: MediaQueryList | null = null;
	const onChange = (e: MediaQueryListEvent) => {
		resolved.value = e.matches ? "dark" : "light";
	};

	const teardown = () => {
		mq?.removeEventListener("change", onChange);
		mq = null;
	};

	const sync = () => {
		teardown();
		if (theme.value === "light" || theme.value === "dark") {
			resolved.value = theme.value;
			return;
		}
		if (typeof window === "undefined" || !window.matchMedia) return;
		mq = window.matchMedia("(prefers-color-scheme: dark)");
		resolved.value = mq.matches ? "dark" : "light";
		mq.addEventListener("change", onChange);
	};

	onMounted(sync);
	watch(theme, sync);
	onBeforeUnmount(teardown);

	return resolved;
}
