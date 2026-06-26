<script setup lang="ts">
import { motion } from "motion-v";
import {
	computed,
	getCurrentInstance,
	onBeforeUnmount,
	onMounted,
	ref,
	shallowRef,
	useTemplateRef,
	watch,
	watchEffect,
} from "vue";
import {
	BLUR_RATIO,
	DEFAULT_ROUNDNESS,
	HEADER_EXIT_MS,
	HEIGHT,
	MIN_EXPAND_RATIO,
	PILL_PADDING,
	SPRING,
	SWAP_COLLAPSE_MS,
	WIDTH,
} from "./constants";
import { STATE_ICON } from "./icons";
import type { SileoButton, SileoSlotProps, SileoState, SileoStyles } from "./types";

defineOptions({ inheritAttrs: false });

const MotionRect = motion.rect;

interface View {
	title?: string;
	description?: string;
	state: SileoState;
	styles?: SileoStyles;
	button?: SileoButton;
	fill: string;
}

const props = withDefaults(
	defineProps<{
		id: string;
		fill?: string;
		state?: SileoState;
		title?: string;
		description?: string;
		position?: "left" | "center" | "right";
		expand?: "top" | "bottom";
		styles?: SileoStyles;
		button?: SileoButton;
		roundness?: number;
		exiting?: boolean;
		autoExpandDelayMs?: number;
		autoCollapseDelayMs?: number;
		canExpand?: boolean;
		interruptKey?: string;
		refreshKey?: string;
	}>(),
	{
		fill: "#FFFFFF",
		state: "success",
		position: "left",
		expand: "bottom",
		exiting: false,
	},
);

const emit = defineEmits<{
	enter: [ev: MouseEvent];
	leave: [ev: MouseEvent];
	dismiss: [];
}>();

const slots = defineSlots<{
	icon?: (props: SileoSlotProps) => unknown;
	title?: (props: SileoSlotProps) => unknown;
	description?: (props: SileoSlotProps) => unknown;
	button?: (props: SileoSlotProps) => unknown;
}>();

/* ------------------------------ Derived view ------------------------------ */

const resolvedTitle = computed(() => props.title ?? props.state);

const next = computed<View>(() => ({
	title: resolvedTitle.value,
	description: props.description,
	state: props.state,
	styles: props.styles,
	button: props.button,
	fill: props.fill,
}));

const view = shallowRef<View>(next.value);
const applied = ref<string | undefined>(props.refreshKey);
const isExpanded = ref(false);
const ready = ref(false);
const pillWidth = ref(0);
const contentHeight = ref(0);

const hasDesc = computed(
	() =>
		Boolean(view.value.description) ||
		Boolean(view.value.button) ||
		// a consumer-supplied #description/#button slot is custom content too
		Boolean(slots.description) ||
		Boolean(slots.button),
);
const isLoading = computed(() => view.value.state === "loading");
const open = computed(
	() => hasDesc.value && isExpanded.value && !isLoading.value,
);
const allowExpand = computed(() =>
	isLoading.value
		? false
		: (props.canExpand ??
			(!props.interruptKey || props.interruptKey === props.id)),
);

const headerKey = computed(() => `${view.value.state}-${view.value.title}`);
const filterId = `sileo-gooey-${props.id}`;
const resolvedRoundness = computed(() =>
	Math.max(0, props.roundness ?? DEFAULT_ROUNDNESS),
);
const blur = computed(() => resolvedRoundness.value * BLUR_RATIO);

const headerLayer = shallowRef<{
	current: { key: string; view: View };
	prev: { key: string; view: View } | null;
}>({ current: { key: headerKey.value, view: view.value }, prev: null });

function slotProps(v: View): SileoSlotProps {
	return {
		id: props.id,
		state: v.state,
		title: v.title,
		description: v.description,
		button: v.button,
		styles: v.styles,
	};
}

/* ------------------------------ Template refs ----------------------------- */

const headerRef = useTemplateRef<HTMLDivElement>("headerRef");
const contentRef = useTemplateRef<HTMLDivElement>("contentRef");
const innerRef = useTemplateRef<HTMLDivElement>("innerRef");
const buttonRef = useTemplateRef<HTMLButtonElement>("buttonRef");

/* -------------------------- Non-reactive mutables ------------------------- */

let headerExitTimer: ReturnType<typeof setTimeout> | null = null;
let autoExpandTimer: ReturnType<typeof setTimeout> | null = null;
let autoCollapseTimer: ReturnType<typeof setTimeout> | null = null;
let swapTimer: ReturnType<typeof setTimeout> | null = null;
let lastRefreshKey = props.refreshKey;
let pending: { key?: string; payload: View } | null = null;
let headerPad: number | null = null;
let pillRo: ResizeObserver | null = null;
let pillRaf = 0;
let pillObserved: Element | null = null;
let contentRo: ResizeObserver | null = null;
let contentRaf = 0;
let pointerStart: number | null = null;
let readyRaf = 0;

/* ------------------------------ Measurements ------------------------------ */

function measurePill() {
	const inner = innerRef.value;
	if (!inner) return;
	const w = inner.scrollWidth + (headerPad ?? 0) + PILL_PADDING;
	if (w > PILL_PADDING && pillWidth.value !== w) pillWidth.value = w;
}

function setupPillObserver() {
	if (typeof ResizeObserver === "undefined") return;
	const inner = innerRef.value;
	const header = headerRef.value;
	if (!inner || !header) return;
	if (headerPad === null) {
		const cs = getComputedStyle(header);
		headerPad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
	}
	measurePill();
	if (!pillRo) {
		pillRo = new ResizeObserver(() => {
			cancelAnimationFrame(pillRaf);
			pillRaf = requestAnimationFrame(measurePill);
		});
	}
	if (pillObserved !== inner) {
		if (pillObserved) pillRo.unobserve(pillObserved);
		pillRo.observe(inner);
		pillObserved = inner;
	}
}

function setupContentObserver() {
	cancelAnimationFrame(contentRaf);
	contentRo?.disconnect();
	contentRo = null;
	if (!hasDesc.value) {
		contentHeight.value = 0;
		return;
	}
	if (typeof ResizeObserver === "undefined") return;
	const el = contentRef.value;
	if (!el) return;
	const measure = () => {
		const h = el.scrollHeight;
		if (contentHeight.value !== h) contentHeight.value = h;
	};
	measure();
	contentRo = new ResizeObserver(() => {
		cancelAnimationFrame(contentRaf);
		contentRaf = requestAnimationFrame(measure);
	});
	contentRo.observe(el);
}

onMounted(() => {
	setupPillObserver();
	setupContentObserver();
	readyRaf = requestAnimationFrame(() => {
		ready.value = true;
	});
});

// Re-observe the freshly recreated header inner element when the title/state
// (`:key`) changes, mirroring React's effect keyed on the current layer.
watch(() => headerLayer.value.current.key, setupPillObserver, { flush: "post" });
watch(hasDesc, setupContentObserver, { flush: "post" });

/* ------------------------------ Header layers ----------------------------- */

function updateHeaderLayer() {
	const key = headerKey.value;
	const v = view.value;
	const s = headerLayer.value;
	if (s.current.key === key) {
		if (s.current.view === v) return;
		headerLayer.value = { ...s, current: { key, view: v } };
		return;
	}
	headerLayer.value = { prev: s.current, current: { key, view: v } };
}
watch([headerKey, view], updateHeaderLayer, { flush: "pre" });

watch(
	() => headerLayer.value.prev,
	(prev, _old, onCleanup) => {
		if (!prev) return;
		if (headerExitTimer) clearTimeout(headerExitTimer);
		headerExitTimer = setTimeout(() => {
			headerExitTimer = null;
			headerLayer.value = { ...headerLayer.value, prev: null };
		}, HEADER_EXIT_MS);
		onCleanup(() => {
			if (headerExitTimer) {
				clearTimeout(headerExitTimer);
				headerExitTimer = null;
			}
		});
	},
);

/* -------------------------------- Sync fill ------------------------------- */

watch(
	() => props.fill,
	(fill) => {
		if (view.value.fill !== fill) view.value = { ...view.value, fill };
	},
);

/* ------------------------------ Refresh logic ----------------------------- */

function runRefresh() {
	const rk = props.refreshKey;
	if (rk === undefined) {
		view.value = next.value;
		applied.value = undefined;
		pending = null;
		lastRefreshKey = rk;
		return;
	}

	if (lastRefreshKey === rk) return;
	lastRefreshKey = rk;

	if (swapTimer) {
		clearTimeout(swapTimer);
		swapTimer = null;
	}

	if (open.value) {
		pending = { key: rk, payload: next.value };
		isExpanded.value = false;
		swapTimer = setTimeout(() => {
			swapTimer = null;
			if (!pending) return;
			view.value = pending.payload;
			applied.value = pending.key;
			pending = null;
		}, SWAP_COLLAPSE_MS);
	} else {
		pending = null;
		view.value = next.value;
		applied.value = rk;
	}
}
watch([open, () => props.refreshKey, next], runRefresh, { flush: "post" });

/* -------------------------- Auto expand / collapse ------------------------ */

watch(
	[
		() => props.autoCollapseDelayMs,
		() => props.autoExpandDelayMs,
		hasDesc,
		allowExpand,
		() => props.exiting,
		applied,
	],
	(_v, _o, onCleanup) => {
		if (typeof window === "undefined") return;
		if (!hasDesc.value) return;

		if (autoExpandTimer) clearTimeout(autoExpandTimer);
		if (autoCollapseTimer) clearTimeout(autoCollapseTimer);

		if (props.exiting || !allowExpand.value) {
			isExpanded.value = false;
			return;
		}

		if (props.autoExpandDelayMs == null && props.autoCollapseDelayMs == null)
			return;

		const expandDelay = props.autoExpandDelayMs ?? 0;
		const collapseDelay = props.autoCollapseDelayMs ?? 0;

		if (expandDelay > 0) {
			autoExpandTimer = setTimeout(() => {
				isExpanded.value = true;
			}, expandDelay);
		} else {
			isExpanded.value = true;
		}

		if (collapseDelay > 0) {
			autoCollapseTimer = setTimeout(() => {
				isExpanded.value = false;
			}, collapseDelay);
		}

		onCleanup(() => {
			if (autoExpandTimer) clearTimeout(autoExpandTimer);
			if (autoCollapseTimer) clearTimeout(autoCollapseTimer);
		});
	},
	// flush:'post' so the initial (immediate) run happens after mount, not during
	// setup — mirrors React's post-paint effect and avoids a pre-measure expand.
	{ immediate: true, flush: "post" },
);

/* ------------------------------ Derived sizes ----------------------------- */

const minExpanded = HEIGHT * MIN_EXPAND_RATIO;
const rawExpanded = computed(() =>
	hasDesc.value
		? Math.max(minExpanded, HEIGHT + contentHeight.value)
		: minExpanded,
);

const frozenExpanded = ref(rawExpanded.value);
watchEffect(
	() => {
		if (open.value) frozenExpanded.value = rawExpanded.value;
	},
	{ flush: "sync" },
);
const expanded = computed(() =>
	open.value ? rawExpanded.value : frozenExpanded.value,
);

const svgHeight = computed(() =>
	hasDesc.value ? Math.max(expanded.value, minExpanded) : HEIGHT,
);
const expandedContent = computed(() => Math.max(0, expanded.value - HEIGHT));
const resolvedPillWidth = computed(() =>
	Math.max(pillWidth.value || HEIGHT, HEIGHT),
);
const pillHeight = computed(() => HEIGHT + blur.value * 3);

const pillX = computed(() =>
	props.position === "right"
		? WIDTH - resolvedPillWidth.value
		: props.position === "center"
			? (WIDTH - resolvedPillWidth.value) / 2
			: 0,
);

const viewBox = computed(() => `0 0 ${WIDTH} ${svgHeight.value}`);

/* ------------------------------ Motion targets ---------------------------- */

const pillAnimate = computed(() => ({
	x: pillX.value,
	width: resolvedPillWidth.value,
	height: open.value ? pillHeight.value : HEIGHT,
}));

const bodyAnimate = computed(() => ({
	height: open.value ? expandedContent.value : 0,
	opacity: open.value ? 1 : 0,
}));

const bodyTransition = computed(() =>
	open.value ? SPRING : { ...SPRING, bounce: 0 },
);
const pillTransition = computed(() => (ready.value ? SPRING : { duration: 0 }));

const canvasStyle = computed(() => ({ filter: `url(#${filterId})` }));

const rootStyle = computed<Record<string, string>>(() => ({
	"--_h": `${open.value ? expanded.value : HEIGHT}px`,
	"--_pw": `${resolvedPillWidth.value}px`,
	"--_px": `${pillX.value}px`,
	"--_ht": `translateY(${open.value ? (props.expand === "bottom" ? 3 : -3) : 0}px) scale(${open.value ? 0.9 : 1})`,
	"--_co": `${open.value ? 1 : 0}`,
}));

/* -------------------------------- Handlers -------------------------------- */

function onEnter(e: MouseEvent) {
	emit("enter", e);
	if (hasDesc.value) isExpanded.value = true;
}

function onLeave(e: MouseEvent) {
	emit("leave", e);
	isExpanded.value = false;
}

function handleTransitionEnd(e: TransitionEvent) {
	if (e.propertyName !== "height" && e.propertyName !== "transform") return;
	if (open.value) return;
	if (!pending) return;
	if (swapTimer) {
		clearTimeout(swapTimer);
		swapTimer = null;
	}
	view.value = pending.payload;
	applied.value = pending.key;
	pending = null;
}

function handleButtonClick(e: MouseEvent) {
	e.preventDefault();
	e.stopPropagation();
	view.value.button?.onClick();
}

/* -------------------------------- Swipe ----------------------------------- */

const SWIPE_DISMISS = 30;
const SWIPE_MAX = 20;
const inst = getCurrentInstance();
// Swipe is enabled only when a dismiss listener is attached — the faithful port
// of React's `if (!onDismiss) return` gate. <Toaster> always binds @dismiss.
const dismissEnabled = () => Boolean(inst?.vnode.props?.onDismiss);

function onPointerMove(e: PointerEvent) {
	const el = buttonRef.value;
	if (pointerStart === null || !el) return;
	const dy = e.clientY - pointerStart;
	const sign = dy > 0 ? 1 : -1;
	const clamped = Math.min(Math.abs(dy), SWIPE_MAX) * sign;
	el.style.transform = `translateY(${clamped}px)`;
}

function onPointerUp(e: PointerEvent) {
	const el = buttonRef.value;
	if (pointerStart === null || !el) return;
	const dy = e.clientY - pointerStart;
	pointerStart = null;
	el.style.transform = "";
	el.removeEventListener("pointermove", onPointerMove);
	el.removeEventListener("pointerup", onPointerUp);
	if (Math.abs(dy) > SWIPE_DISMISS) emit("dismiss");
}

function handlePointerDown(e: PointerEvent) {
	if (props.exiting || !dismissEnabled()) return;
	const target = e.target as HTMLElement;
	if (target.closest("[data-sileo-button]")) return;
	pointerStart = e.clientY;
	(e.currentTarget as HTMLButtonElement).setPointerCapture(e.pointerId);
	const el = buttonRef.value;
	if (el) {
		el.addEventListener("pointermove", onPointerMove, { passive: true });
		el.addEventListener("pointerup", onPointerUp, { passive: true });
	}
}

/* -------------------------------- Cleanup --------------------------------- */

onBeforeUnmount(() => {
	cancelAnimationFrame(pillRaf);
	cancelAnimationFrame(contentRaf);
	cancelAnimationFrame(readyRaf);
	pillRo?.disconnect();
	contentRo?.disconnect();
	if (headerExitTimer) clearTimeout(headerExitTimer);
	if (autoExpandTimer) clearTimeout(autoExpandTimer);
	if (autoCollapseTimer) clearTimeout(autoCollapseTimer);
	if (swapTimer) clearTimeout(swapTimer);
	const el = buttonRef.value;
	if (el) {
		el.removeEventListener("pointermove", onPointerMove);
		el.removeEventListener("pointerup", onPointerUp);
	}
});
</script>

<template>
	<button
		ref="buttonRef"
		type="button"
		data-sileo-toast
		:data-ready="ready"
		:data-expanded="open"
		:data-exiting="exiting"
		:data-edge="expand"
		:data-position="position"
		:data-state="view.state"
		:style="rootStyle"
		v-bind="$attrs"
		@mouseenter="onEnter"
		@mouseleave="onLeave"
		@transitionend="handleTransitionEnd"
		@pointerdown="handlePointerDown"
	>
		<div data-sileo-canvas :data-edge="expand" :style="canvasStyle">
			<svg data-sileo-svg :width="WIDTH" :height="svgHeight" :viewBox="viewBox">
				<title>Sileo Notification</title>
				<defs>
					<filter
						:id="filterId"
						x="-20%"
						y="-20%"
						width="140%"
						height="140%"
						color-interpolation-filters="sRGB"
					>
						<feGaussianBlur
							in="SourceGraphic"
							:stdDeviation="blur"
							result="blur"
						/>
						<feColorMatrix
							in="blur"
							mode="matrix"
							values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10"
							result="goo"
						/>
						<feComposite in="SourceGraphic" in2="goo" operator="atop" />
					</filter>
				</defs>
				<MotionRect
					data-sileo-pill
					:rx="resolvedRoundness"
					:ry="resolvedRoundness"
					:fill="view.fill"
					:initial="false"
					:animate="pillAnimate"
					:transition="pillTransition"
				/>
				<MotionRect
					data-sileo-body
					:y="HEIGHT"
					:width="WIDTH"
					:rx="resolvedRoundness"
					:ry="resolvedRoundness"
					:fill="view.fill"
					:initial="false"
					:animate="bodyAnimate"
					:transition="bodyTransition"
				/>
			</svg>
		</div>

		<div ref="headerRef" data-sileo-header :data-edge="expand">
			<div data-sileo-header-stack>
				<div
					ref="innerRef"
					:key="headerLayer.current.key"
					data-sileo-header-inner
					data-layer="current"
				>
					<div
						data-sileo-badge
						:data-state="headerLayer.current.view.state"
						:class="headerLayer.current.view.styles?.badge"
					>
						<slot name="icon" v-bind="slotProps(headerLayer.current.view)">
							<component
								:is="STATE_ICON[headerLayer.current.view.state]"
								v-bind="
									headerLayer.current.view.state === 'loading'
										? { 'data-sileo-icon': 'spin', 'aria-hidden': 'true' }
										: {}
								"
							/>
						</slot>
					</div>
					<span
						data-sileo-title
						:data-state="headerLayer.current.view.state"
						:class="headerLayer.current.view.styles?.title"
					>
						<slot name="title" v-bind="slotProps(headerLayer.current.view)">{{
							headerLayer.current.view.title
						}}</slot>
					</span>
				</div>
				<div
					v-if="headerLayer.prev"
					:key="headerLayer.prev.key"
					data-sileo-header-inner
					data-layer="prev"
					data-exiting="true"
				>
					<div
						data-sileo-badge
						:data-state="headerLayer.prev.view.state"
						:class="headerLayer.prev.view.styles?.badge"
					>
						<slot name="icon" v-bind="slotProps(headerLayer.prev.view)">
							<component
								:is="STATE_ICON[headerLayer.prev.view.state]"
								v-bind="
									headerLayer.prev.view.state === 'loading'
										? { 'data-sileo-icon': 'spin', 'aria-hidden': 'true' }
										: {}
								"
							/>
						</slot>
					</div>
					<span
						data-sileo-title
						:data-state="headerLayer.prev.view.state"
						:class="headerLayer.prev.view.styles?.title"
					>
						<slot name="title" v-bind="slotProps(headerLayer.prev.view)">{{
							headerLayer.prev.view.title
						}}</slot>
					</span>
				</div>
			</div>
		</div>

		<div
			v-if="hasDesc"
			data-sileo-content
			:data-edge="expand"
			:data-visible="open"
		>
			<div
				ref="contentRef"
				data-sileo-description
				:class="view.styles?.description"
			>
				<slot name="description" v-bind="slotProps(view)">{{
					view.description
				}}</slot>
				<a
					v-if="view.button"
					href="#"
					data-sileo-button
					:data-state="view.state"
					:class="view.styles?.button"
					@click="handleButtonClick"
				>
					<slot name="button" v-bind="slotProps(view)">{{
						view.button.title
					}}</slot>
				</a>
			</div>
		</div>
	</button>
</template>
