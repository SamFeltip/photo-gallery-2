# Astro Photos roadmap

This roadmap is implemented as stacked pull requests. Each stage starts from the
previous stage, has its own branch and PR, and must pass `pnpm check`, unit tests,
Playwright tests, and `pnpm build` before it is marked complete.

## Stage 1 — Immich activity and identity UI

Branch: `comments-and-immich-likes-drawer`

PR: [#1](https://github.com/SamFeltip/photo-gallery-2/pull/1)

- [x] Render the app on the server and call Immich through `@immich/sdk` only.
- [x] Keep Fancybox and the Vaul drawer usable together without conflicting modal
      focus traps or leaving the page inert after closing.
- [x] Polish the comment drawer: readable activity cards, empty/loading/error
      states, responsive composer, and accessible controls.
- [x] Show a face thumbnail and name for every named person available in the
      current album, plus a clearly styled Guest option.
- [x] Remember the selected identity locally and provide a visible way to change
      it.
- [x] Prompt for identity before a named user likes or comments.
- [x] Submit named-user likes and comments to Immich.
- [x] Store Guest likes locally on the device; Guest cannot post comments.
- [x] Show Immich comment previews over the open Fancybox image and open the
      drawer when a preview is selected.
- [x] Show the Immich-backed love state/count in Fancybox.
- [x] Prepare provisioning for named faces only, with membership limited to albums
      in which each face appears.
- [x] Configure provisioned API keys with create/read/statistics permissions.
- [ ] Run provisioning for the 46 named faces after the administrator key gains
      its required user-management permissions.
- [ ] Verify a real named-user like and comment against Immich.
- [x] Open PR 1.

External prerequisite: the provisioning `API_KEY` needs `adminUser.create`,
`adminUser.read`, and `adminUser.update`.

## Stage 2 — Vitest and Playwright coverage

Branch: `codex/activity-tests`

PR: [#2](https://github.com/SamFeltip/photo-gallery-2/pull/2)

- [x] Add Vitest, React Testing Library, DOM matchers, and a DOM test environment.
- [x] Unit-test identity selection, Guest restrictions/local likes, comments,
      activity formatting, and SDK-backed server actions with mocked boundaries.
- [x] Add Playwright configuration and browser installation instructions.
- [x] Add deterministic test fixtures/mocks so browser tests never mutate Immich.
- [x] Cover photo viewer → drawer → identity modal → like/comment flows.
- [x] Cover closing the drawer and photo viewer, including focus and clickability
      regression checks.
- [x] Add test scripts and CI workflow.
- [x] Open PR 2.

## Stage 3 — Gallery presentation and prefetching

Branch: `codex/gallery-stacks-prefetch`

PR: [#3](https://github.com/SamFeltip/photo-gallery-2/pull/3)

- [x] Detect stacks and use each stack as a carousel.
- [x] When no stacks exist, show every photo in the scrolling gallery and one
      album-wide carousel.
- [x] Preserve stable ordering and avoid duplicate assets.
- [x] Prefetch the likely next/previous full-screen images before navigation.
- [x] Prefetch on pointer, keyboard, or touch intent without excessive data
      use.
- [x] Add unit and Playwright coverage.
- [x] Open PR 3.

## Stage 4 — Tag filtering

Branch: `codex/tag-filters`

PR: [#4](https://github.com/SamFeltip/photo-gallery-2/pull/4)

- [x] Load image tags through the Immich SDK.
- [x] Add accessible multi-select filtering with clear/reset controls.
- [x] Keep filters reflected in the URL so views can be shared and restored.
- [x] Ensure stacks, counts, and empty states respond correctly to filters.
- [x] Add unit and Playwright coverage.
- [x] Open PR 4.

## Stage 5 — Handheld stories

Branch: `codex/handheld-stories`

- [ ] Show assets tagged `handheld` as memory/story cards above the main gallery.
- [ ] Build a full-screen, touch-friendly vertical story viewer.
- [ ] Add progress, pause, navigation, love, comments, and identity selection.
- [ ] Reuse the activity model from Stage 1 and filtering data from Stage 4.
- [ ] Add unit and Playwright coverage for mouse, keyboard, and touch interactions.
- [ ] Open PR 5.

## Stage 6 — Select, download, and share

Branch: `codex/photo-selection`

- [ ] Enter selection mode with press-and-hold, with keyboard-accessible fallback.
- [ ] Support selecting and clearing multiple photos.
- [ ] Download selected photos in full resolution or a smaller rendition.
- [ ] Use native sharing when available and provide a useful fallback.
- [ ] Prevent selection gestures from accidentally opening Fancybox.
- [ ] Add unit and Playwright coverage, including touch/long-press behavior.
- [ ] Open PR 6.

## Stage 7 — General UI polish

Branch: `codex/ui-polish`

- [ ] Unify spacing, typography, surfaces, motion, icons, and responsive behavior.
- [ ] Review loading, empty, offline, and error states across every feature.
- [ ] Audit keyboard navigation, focus, reduced motion, contrast, and screen-reader
      labels.
- [ ] Run the full automated suite and a final browser/device smoke test.
- [ ] Open PR 7.
