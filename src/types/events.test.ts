import { describe, expect, it, vi } from "vitest";
import { PersonCustomEvent } from "./events";

describe("PersonCustomEvent", () => {
  it("bubbles the selected person and toggle mode", () => {
    const parent = document.createElement("div");
    const child = document.createElement("button");
    parent.append(child);
    const listener = vi.fn();
    parent.addEventListener("person", listener);

    child.dispatchEvent(new PersonCustomEvent("person-1", "active"));

    expect(listener).toHaveBeenCalledOnce();
    expect((listener.mock.calls[0][0] as PersonCustomEvent).detail).toEqual({
      personId: "person-1",
      toggleMode: "active",
    });
  });
});
