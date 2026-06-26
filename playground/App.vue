<script setup lang="ts">
import { ref } from "vue";
import { type SileoPosition, sileo, Toaster } from "fork";
// styles.css is auto-imported by the `fork` entry.

const position = ref<SileoPosition>("top-right");
const theme = ref<"light" | "dark" | "system">("system");

const positions: SileoPosition[] = [
	"top-left",
	"top-center",
	"top-right",
	"bottom-left",
	"bottom-center",
	"bottom-right",
];

function withDescription() {
	sileo.success({
		title: "Saved",
		description:
			"Your changes are live and synced to the cloud. Hover to keep me open.",
	});
}

function actionToast() {
	sileo.info({
		title: "Update available",
		description: "A new version is ready to install.",
		button: { title: "Reload", onClick: () => sileo.success({ title: "Reloaded" }) },
	});
}

function promiseToast() {
	sileo.promise(new Promise((res) => setTimeout(res, 1800)), {
		loading: { title: "Saving…" },
		success: { title: "Saved!", description: "All changes persisted." },
		error: { title: "Failed to save" },
	});
}
</script>

<template>
	<Toaster :position="position" :theme="theme" />

	<main>
		<h1>fork playground</h1>

		<section>
			<label>
				position
				<select v-model="position">
					<option v-for="p in positions" :key="p" :value="p">{{ p }}</option>
				</select>
			</label>
			<label>
				theme
				<select v-model="theme">
					<option value="system">system</option>
					<option value="light">light</option>
					<option value="dark">dark</option>
				</select>
			</label>
		</section>

		<section>
			<button @click="sileo.success({ title: 'Success' })">success</button>
			<button @click="sileo.error({ title: 'Error' })">error</button>
			<button @click="sileo.warning({ title: 'Warning' })">warning</button>
			<button @click="sileo.info({ title: 'Info' })">info</button>
		</section>

		<section>
			<button @click="withDescription">success + description (hover to expand)</button>
			<button @click="actionToast">info + action button</button>
			<button @click="promiseToast">promise (loading → success)</button>
		</section>

		<p class="hint">
			Tip: hover a toast with a description to expand it; swipe (drag up/down) to
			dismiss.
		</p>
	</main>
</template>

<style scoped>
:global(body) {
	margin: 0;
	min-height: 100vh;
	background: #0b0b0c;
	color: #e8e8ea;
	font-family: system-ui, sans-serif;
}
main {
	max-width: 720px;
	margin: 0 auto;
	padding: 48px 24px;
}
h1 {
	font-weight: 600;
	letter-spacing: -0.02em;
}
section {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
	margin: 18px 0;
	align-items: center;
}
button {
	padding: 9px 14px;
	border-radius: 10px;
	border: 1px solid #2a2a2e;
	background: #161618;
	color: #e8e8ea;
	cursor: pointer;
	font-size: 14px;
}
button:hover {
	background: #1f1f22;
}
select {
	padding: 6px 8px;
	border-radius: 8px;
	background: #161618;
	color: #e8e8ea;
	border: 1px solid #2a2a2e;
}
label {
	display: inline-flex;
	gap: 8px;
	align-items: center;
	font-size: 14px;
	color: #a0a0a8;
}
.hint {
	color: #6a6a72;
	font-size: 13px;
	margin-top: 28px;
}
</style>
