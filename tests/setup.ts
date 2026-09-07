import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: (query: string) => ({
    addEventListener: () => undefined,
    matches: false,
    media: query,
    removeEventListener: () => undefined,
  }),
});

class ResizeObserverStub {
  disconnect() {}
  observe() {}
  unobserve() {}
}

Object.defineProperty(window, "ResizeObserver", {
  configurable: true,
  value: ResizeObserverStub,
});

HTMLElement.prototype.setPointerCapture ??= () => undefined;
HTMLElement.prototype.releasePointerCapture ??= () => undefined;
HTMLElement.prototype.hasPointerCapture ??= () => false;
