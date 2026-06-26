import { type FunctionalComponent, h, type SVGAttributes } from "vue";
import type { SileoState } from "./types";

type IconChild = ReturnType<typeof h>;

const Icon = (
	title: string,
	children: () => IconChild[],
): FunctionalComponent<SVGAttributes> => {
	const component: FunctionalComponent<SVGAttributes> = (_props, { attrs }) =>
		h(
			"svg",
			{
				// attrs first so the fixed geometry/stroke always win, mirroring the
				// React original (`<svg {...props} width="16" .../>`).
				...attrs,
				xmlns: "http://www.w3.org/2000/svg",
				width: "16",
				height: "16",
				viewBox: "0 0 24 24",
				fill: "none",
				stroke: "currentColor",
				"stroke-width": "2",
				"stroke-linecap": "round",
				"stroke-linejoin": "round",
			},
			[h("title", title), ...children()],
		);
	component.displayName = title.replace(/\s+/g, "");
	return component;
};

export const ArrowRight = Icon("Arrow Right", () => [
	h("path", { d: "M5 12h14" }),
	h("path", { d: "m12 5 7 7-7 7" }),
]);

export const LifeBuoy = Icon("Life Buoy", () => [
	h("circle", { cx: 12, cy: 12, r: 10 }),
	h("path", { d: "m4.93 4.93 4.24 4.24" }),
	h("path", { d: "m14.83 9.17 4.24-4.24" }),
	h("path", { d: "m14.83 14.83 4.24 4.24" }),
	h("path", { d: "m9.17 14.83-4.24 4.24" }),
	h("circle", { cx: 12, cy: 12, r: 4 }),
]);

export const LoaderCircle = Icon("Loader Circle", () => [
	h("path", { d: "M21 12a9 9 0 1 1-6.219-8.56" }),
]);

export const X = Icon("X", () => [
	h("path", { d: "M18 6 6 18" }),
	h("path", { d: "m6 6 12 12" }),
]);

export const CircleAlert = Icon("Circle Alert", () => [
	h("circle", { cx: 12, cy: 12, r: 10 }),
	h("line", { x1: 12, x2: 12, y1: 8, y2: 12 }),
	h("line", { x1: 12, x2: 12.01, y1: 16, y2: 16 }),
]);

export const Check = Icon("Check", () => [h("path", { d: "M20 6 9 17l-5-5" })]);

export const STATE_ICON: Record<SileoState, FunctionalComponent<SVGAttributes>> =
	{
		success: Check,
		loading: LoaderCircle,
		error: X,
		warning: CircleAlert,
		info: LifeBuoy,
		action: ArrowRight,
	};
