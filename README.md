<div align="center">
  <h1>Fork</h1>
  <p>An opinionated, physics-based toast component for Vue 3.</p>
  <p>A Vue port of <a href="https://github.com/hiaaryan/sileo">Sileo</a>.</p>
</div>

### Installation

```bash
pnpm add fork
```

### Getting Started

Mount `<Toaster />` once (e.g. in `App.vue`), then call `sileo.*` from anywhere — components, composables, Pinia actions, plain modules.

```vue
<script setup lang="ts">
import { Toaster, sileo } from "fork";
</script>

<template>
  <Toaster position="top-right" />
  <button @click="sileo.success({ title: 'Saved', description: 'Your changes are live.' })">
    Notify
  </button>
</template>
```

The stylesheet is imported automatically by the package. If your bundler strips
side-effect CSS, import it explicitly:

```ts
import "fork/styles.css";
```

### Nuxt

Works out of the box — the package is SSR/hydration-safe, so no module or
`<ClientOnly>` wrapper is required. Place `<Toaster />` once in `app.vue` and
call `sileo.*` from anywhere.

```vue
<!-- app.vue -->
<script setup lang="ts">
import { Toaster } from "fork";
</script>

<template>
  <Toaster position="top-right" />
  <NuxtPage />
</template>
```

### Promises

```ts
sileo.promise(saveUser(), {
  loading: { title: "Saving…" },
  success: (user) => ({ title: `Saved ${user.name}` }),
  error: (err) => ({ title: "Failed", description: String(err) }),
});
```

### Custom rendering (scoped slots)

`title` and `description` are strings. For custom or rich markup, use the scoped
slots on `<Toaster>` — each receives the resolved per-toast state:

```vue
<Toaster>
  <template #title="{ title }"><strong>{{ title }}</strong></template>
  <template #description="{ description }">{{ description }}</template>
  <template #icon="{ state }"><MyIcon :state="state" /></template>
</Toaster>
```

### API

- `sileo.success | error | warning | info | action(options)` — show a typed toast.
- `sileo.show(options)` — show a toast using `options.type`.
- `sileo.promise(promise, { loading, success, error, action? })` — track a promise.
- `sileo.dismiss(id)` / `sileo.clear(position?)` — remove toasts.

`options`: `{ title?, description?, duration?, position?, fill?, roundness?, autopilot?, styles?, button? }`.

### Development

This repo uses [pnpm](https://pnpm.io) (`packageManager` is pinned in
`package.json`; run via Corepack or a matching local pnpm).

```bash
pnpm install      # install dependencies
pnpm build        # type-check + build the package to dist/
pnpm typecheck    # type-check only
pnpm dev          # rebuild the package on change (watch mode)
```
