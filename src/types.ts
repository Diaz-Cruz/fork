export type SileoState =
	| "success"
	| "loading"
	| "error"
	| "warning"
	| "info"
	| "action";

export interface SileoStyles {
	title?: string;
	description?: string;
	badge?: string;
	button?: string;
}

export interface SileoButton {
	title: string;
	onClick: () => void;
}

export const SILEO_POSITIONS = [
	"top-left",
	"top-center",
	"top-right",
	"bottom-left",
	"bottom-center",
	"bottom-right",
] as const;

export type SileoPosition = (typeof SILEO_POSITIONS)[number];

export interface SileoOptions {
	title?: string;
	description?: string;
	type?: SileoState;
	position?: SileoPosition;
	duration?: number | null;
	styles?: SileoStyles;
	fill?: string;
	roundness?: number;
	autopilot?: boolean | { expand?: number; collapse?: number };
	button?: SileoButton;
}

/* ------------------------------- Toaster --------------------------------- */

export type SileoOffsetValue = number | string;
export type SileoOffsetConfig = Partial<
	Record<"top" | "right" | "bottom" | "left", SileoOffsetValue>
>;

export interface SileoToasterProps {
	position?: SileoPosition;
	offset?: SileoOffsetValue | SileoOffsetConfig;
	options?: Partial<SileoOptions>;
	theme?: "light" | "dark" | "system";
}

/* --------------------------------- Slots --------------------------------- */

/**
 * Resolved per-toast render state passed to every scoped slot
 * (`#icon`, `#title`, `#description`, `#button`) on `<Toaster>`.
 */
export interface SileoSlotProps {
	id: string;
	state: SileoState;
	title?: string;
	description?: string;
	button?: SileoButton;
	styles?: SileoStyles;
}

export interface SileoSlots {
	/** Children rendered alongside the toast viewports (the React `children`). */
	default?: () => unknown;
	icon?: (props: SileoSlotProps) => unknown;
	title?: (props: SileoSlotProps) => unknown;
	description?: (props: SileoSlotProps) => unknown;
	button?: (props: SileoSlotProps) => unknown;
}
