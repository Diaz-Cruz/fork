<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { DEFAULT_TOAST_DURATION } from "./constants";
import Sileo from "./Sileo.vue";
import { dismissToast, type SileoItem, store, timeoutKey } from "./store";
import type {
	SileoOffsetValue,
	SileoPosition,
	SileoSlots,
	SileoToasterProps,
} from "./types";
import { THEME_FILLS, useResolvedTheme } from "./useResolvedTheme";

const props = withDefaults(defineProps<SileoToasterProps>(), {
	position: "top-right",
});

defineSlots<SileoSlots>();

/* --------------------------------- Helpers -------------------------------- */

const pillAlign = (pos: SileoPosition): "left" | "center" | "right" =>
	pos.includes("right") ? "right" : pos.includes("center") ? "center" : "left";

const expandDir = (pos: SileoPosition): "top" | "bottom" =>
	pos.startsWith("top") ? "bottom" : "top";

/* ---------------------------------- State --------------------------------- */

const theme = computed(() => props.theme);
const resolvedTheme = useResolvedTheme(theme);

const toasts = shallowRef<SileoItem[]>([]);
const mounted = ref(false);
const activeOverride = shallowRef<string | undefined>(undefined);

const timers = new Map<string, ReturnType<typeof setTimeout>>();
let hover = false;

const listener = (next: SileoItem[]) => {
	toasts.value = next;
};

/* --------------------------------- Timers --------------------------------- */

function clearAllTimers() {
	for (const t of timers.values()) clearTimeout(t);
	timers.clear();
}

function schedule(items: SileoItem[]) {
	if (hover) return;
	for (const item of items) {
		if (item.exiting) continue;
		const key = timeoutKey(item);
		if (timers.has(key)) continue;
		if (item.duration === null) continue;
		const dur = item.duration ?? DEFAULT_TOAST_DURATION;
		if (dur <= 0) continue;
		timers.set(
			key,
			setTimeout(() => dismissToast(item.id), dur),
		);
	}
}

/* ------------------------------ Subscription ------------------------------ */

onMounted(() => {
	store.position = props.position;
	store.options = props.options;
	toasts.value = store.toasts;
	store.listeners.add(listener);
	mounted.value = true;
	// scheduling is owned by the `toasts` watcher, which the assignment above triggers.
});

onBeforeUnmount(() => {
	store.listeners.delete(listener);
	clearAllTimers();
});

watch(
	() => [props.position, props.options] as const,
	() => {
		store.position = props.position;
		store.options = props.options;
	},
);

// Prune dead timers when the toast list changes, then (re)schedule.
watch(
	toasts,
	(next) => {
		const keys = new Set(next.map(timeoutKey));
		for (const [key, t] of timers) {
			if (!keys.has(key)) {
				clearTimeout(t);
				timers.delete(key);
			}
		}
		// Release a hover override pinned to a toast that has been removed (e.g.
		// dismiss()/clear() while hovered, where no mouseleave fires) so later
		// toasts can expand and get rescheduled — mirrors React's activeId re-sync.
		if (
			activeOverride.value !== undefined &&
			!next.some((t) => t.id === activeOverride.value)
		) {
			activeOverride.value = undefined;
			hover = false;
		}
		schedule(next);
	},
);

/* ------------------------------- Active id -------------------------------- */

const latest = computed(() => {
	for (let i = toasts.value.length - 1; i >= 0; i--) {
		if (!toasts.value[i].exiting) return toasts.value[i].id;
	}
	return undefined;
});
const activeId = computed(() => activeOverride.value ?? latest.value);

function onPillEnter(id: string) {
	activeOverride.value = id;
	if (!hover) {
		hover = true;
		clearAllTimers();
	}
}

function onPillLeave() {
	activeOverride.value = undefined;
	if (hover) {
		hover = false;
		schedule(toasts.value);
	}
}

/* ------------------------------- Grouping --------------------------------- */

const groups = computed(() => {
	const map = new Map<SileoPosition, SileoItem[]>();
	for (const t of toasts.value) {
		const pos = t.position ?? props.position;
		const arr = map.get(pos);
		if (arr) arr.push(t);
		else map.set(pos, [t]);
	}
	return Array.from(map, ([pos, items]) => ({ pos, items }));
});

function viewportStyle(
	pos: SileoPosition,
): Record<string, string> | undefined {
	if (props.offset === undefined) return undefined;
	const o =
		typeof props.offset === "object"
			? props.offset
			: {
					top: props.offset,
					right: props.offset,
					bottom: props.offset,
					left: props.offset,
				};
	const px = (v: SileoOffsetValue) => (typeof v === "number" ? `${v}px` : v);
	const s: Record<string, string> = {};
	if (pos.startsWith("top") && o.top) s.top = px(o.top);
	if (pos.startsWith("bottom") && o.bottom) s.bottom = px(o.bottom);
	if (pos.endsWith("left") && o.left) s.left = px(o.left);
	if (pos.endsWith("right") && o.right) s.right = px(o.right);
	return s;
}

function fillFor(item: SileoItem): string | undefined {
	return item.fill ?? (props.theme ? THEME_FILLS[resolvedTheme.value] : undefined);
}
</script>

<template>
	<slot />
	<template v-if="mounted">
		<section
			v-for="g in groups"
			:key="g.pos"
			data-sileo-viewport
			:data-position="g.pos"
			:data-theme="theme ? resolvedTheme : undefined"
			aria-live="polite"
			:style="viewportStyle(g.pos)"
		>
			<Sileo
				v-for="item in g.items"
				:id="item.id"
				:key="item.id"
				:state="item.state"
				:title="item.title"
				:description="item.description"
				:position="pillAlign(g.pos)"
				:expand="expandDir(g.pos)"
				:fill="fillFor(item)"
				:styles="item.styles"
				:button="item.button"
				:roundness="item.roundness"
				:exiting="item.exiting"
				:auto-expand-delay-ms="item.autoExpandDelayMs"
				:auto-collapse-delay-ms="item.autoCollapseDelayMs"
				:refresh-key="item.instanceId"
				:can-expand="activeId === undefined || activeId === item.id"
				@enter="onPillEnter(item.id)"
				@leave="onPillLeave()"
				@dismiss="dismissToast(item.id)"
			>
				<template v-if="$slots.icon" #icon="s"><slot name="icon" v-bind="s" /></template>
				<template v-if="$slots.title" #title="s"><slot name="title" v-bind="s" /></template>
				<template v-if="$slots.description" #description="s">
					<slot name="description" v-bind="s" />
				</template>
				<template v-if="$slots.button" #button="s"><slot name="button" v-bind="s" /></template>
			</Sileo>
		</section>
	</template>
</template>
