# Photo gallery

this is the repo for photos.samfelton.com.

It uses my self hosted immich server as a CDN, which works surprisingly well.

it's based on [This old repo](https://github.com/SamFeltip/photo-gallery).

## Testing

Install dependencies and the browser used by Playwright:

```sh
pnpm install
pnpm exec playwright install chromium
```

Run the unit/component suite, the desktop/mobile browser suite, and the
Storybook interaction suite:

```sh
pnpm test:run
pnpm test:e2e
pnpm test:storybook
pnpm storybook:build
```

The Playwright suite uses a local Vite fixture with an in-memory activity client;
it does not connect to or mutate Immich.

Storybook documents the activity drawer's empty, populated, and Guest states.
Its Playwright suite opens those stories in a real browser and verifies their
interactions. Run `pnpm storybook` for local component development.
