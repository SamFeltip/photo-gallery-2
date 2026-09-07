import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clickHeartButton,
  initHeartButtonIcon,
  refreshHearts,
  setHeartButtonState,
} from "./fancyboxHeartButtonHelpers";

function addHeartTemplates() {
  document.body.innerHTML = `
    <main album-id="album-1">
      <template id="heart"><span data-testid="gallery-heart">heart</span></template>
      <template id="heart-button"><span>empty</span></template>
      <template id="heart-button-filled"><span>filled</span></template>
      <section class="justified-gallery">
        <span class="asset-wrapper"><a data-asset-id="photo-1"></a><div class="heart-wrapper"></div></span>
        <span class="asset-wrapper"><a data-asset-id="photo-2"></a><div class="heart-wrapper"></div></span>
      </section>
    </main>`;
}

describe("Fancybox heart controls", () => {
  beforeEach(addHeartTemplates);

  it("opens the activity drawer for the current asset", () => {
    const listener = vi.fn();
    window.addEventListener("open-fancybox-drawer", listener);
    clickHeartButton({ getPage: () => ({ slides: [{ assetId: "photo-1" }] }) } as never);
    expect(listener).toHaveBeenCalledOnce();
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({
      action: "like",
      assetId: "photo-1",
    });
    window.removeEventListener("open-fancybox-drawer", listener);
  });

  it("reflects the stored heart on the carousel button", () => {
    localStorage.setItem("hearts-album-1", JSON.stringify(["photo-1"]));
    const button = document.createElement("button");
    const instance = {
      getContainer: () => ({ querySelector: () => button }),
      getOption: () => [{ assetId: "photo-1" }],
      getPageIndex: () => 0,
    };

    initHeartButtonIcon(instance as never);

    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveTextContent("filled");
  });

  it("updates gallery hearts and the empty/filled button templates", () => {
    refreshHearts(["photo-2"]);
    expect(document.querySelector('[data-asset-id="photo-1"] + .heart-wrapper')).toBeEmptyDOMElement();
    expect(document.querySelector('[data-asset-id="photo-2"] + .heart-wrapper')).toHaveTextContent("heart");

    const button = document.createElement("button");
    setHeartButtonState(button, false);
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveTextContent("empty");
  });
});
