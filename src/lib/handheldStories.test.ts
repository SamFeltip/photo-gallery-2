import { fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AssetTypeEnum, type AssetResponseDto } from "@immich/sdk";
import { getHandheldAssets, installHandheldStories } from "./handheldStories";

function renderStories() {
  document.body.innerHTML = `
    <section data-handheld-stories>
      ${["Lake walk", "Mountain view", "Evening sky"].map((description, index) => `
        <button data-story-open data-asset-id="asset-${index + 1}" data-description="${description}" data-full-url="/${index + 1}.jpg">${description}</button>
      `).join("")}
      <div data-story-viewer role="dialog" hidden>
        <span data-story-progress></span><span data-story-progress></span><span data-story-progress></span>
        <span data-story-current></span>
        <button data-story-pause></button><button data-story-close></button>
        <button data-story-previous></button><button data-story-next></button>
        <button data-story-love></button><button data-story-comment></button>
        <img data-story-image><p data-story-caption></p>
      </div>
    </section>`;
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("installHandheldStories", () => {
  it("opens, navigates, pauses, closes, and restores focus", async () => {
    renderStories();
    const cleanup = installHandheldStories();
    const cards = document.querySelectorAll<HTMLButtonElement>("[data-story-open]");
    const viewer = document.querySelector<HTMLElement>("[data-story-viewer]")!;
    expect(viewer).toHaveAttribute("hidden");
    cards[0].click();
    expect(viewer).not.toHaveAttribute("hidden");
    expect(document.querySelector<HTMLElement>("[data-handheld-stories]")!.inert).toBe(true);
    expect(viewer).toHaveAccessibleName(/Story 1 of 3/);
    document.querySelector<HTMLButtonElement>("[data-story-pause]")!.focus();
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
    expect(document.querySelector("[data-story-comment]")).toHaveFocus();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(viewer).toHaveAccessibleName(/Story 2 of 3/);
    fireEvent.keyDown(window, { key: " " });
    expect(document.querySelector("[data-story-pause]")).toHaveAccessibleName("Resume story");
    fireEvent.keyDown(window, { key: "Escape" });
    expect(viewer).toHaveAttribute("hidden");
    await new Promise(requestAnimationFrame);
    expect(cards[0]).toHaveFocus();
    expect(document.querySelector<HTMLElement>("[data-handheld-stories]")!.inert).not.toBe(true);
    cleanup();
  });

  it("navigates with a vertical swipe", () => {
    renderStories();
    const cleanup = installHandheldStories();
    document.querySelector<HTMLButtonElement>("[data-story-open]")!.click();
    const viewer = document.querySelector<HTMLElement>("[data-story-viewer]")!;
    fireEvent.pointerDown(viewer, { clientY: 300 });
    fireEvent.pointerUp(viewer, { clientY: 180 });
    expect(viewer).toHaveAccessibleName(/Story 2 of 3/);
    cleanup();
  });

  it("dispatches activity for the active story and pauses playback", () => {
    renderStories();
    const listener = vi.fn();
    window.addEventListener("open-fancybox-drawer", listener);
    const cleanup = installHandheldStories();
    document.querySelectorAll<HTMLButtonElement>("[data-story-open]")[1].click();
    document.querySelector<HTMLButtonElement>("[data-story-comment]")!.click();
    expect(listener).toHaveBeenCalledOnce();
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ assetId: "asset-2", action: "comment" });
    expect(document.querySelector("[data-story-pause]")).toHaveAccessibleName("Resume story");
    window.removeEventListener("open-fancybox-drawer", listener);
    cleanup();
  });
});

describe("getHandheldAssets", () => {
  const asset = (id: string, date: string) => ({
    id,
    localDateTime: date,
    fileCreatedAt: date,
    type: AssetTypeEnum.Image,
  }) as AssetResponseDto;

  it("uses an exact handheld tag and orders stack members chronologically", () => {
    const result = getHandheldAssets(
      [{ id: "stack", bestItem: asset("later", "2026-02-02"), stackItems: [asset("earlier", "2026-02-01")] }],
      [
        { id: "handheld", name: "Handheld", value: "Handheld", count: 2 },
        { id: "other", name: "Handheld camera", value: "Handheld camera", count: 1 },
      ],
      { later: ["handheld"], earlier: ["handheld"], ignored: ["other"] },
    );
    expect(result.map(({ id }) => id)).toEqual(["earlier", "later"]);
  });
});
