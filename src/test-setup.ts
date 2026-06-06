import "@testing-library/jest-dom";
import { vi, afterEach } from "vitest";

// jsdom does not implement matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Stub window.api (Electron contextBridge) for all renderer tests
const noop = vi.fn();
const noopReturn = vi.fn(() => () => {});

window.api = {
  windowLabel: "main",
  kimai: {
    request: vi.fn(),
    requestWith: vi.fn(),
  },
  org: {
    list: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    setActive: vi.fn(),
    setSetting: vi.fn(),
    secretBackend: vi.fn(),
  },
  prefs: {
    get: vi.fn(),
    set: vi.fn(),
  },
  pdf: {
    export: vi.fn(),
  },
  autostart: {
    get: vi.fn(),
    set: vi.fn(),
  },
  windows: {
    toggleFloating: noop,
    hideFloating: noop,
    showMain: noop,
    syncData: noop,
  },
  tray: {
    setStatus: noop,
  },
  notify: noop,
  openExternal: vi.fn(),
  on: noopReturn,
};

afterEach(() => {
  vi.clearAllMocks();
});
