import { describe, it, expect, vi, beforeEach } from "vitest";
import { useSettings, activeOrg, activeAlias } from "../../store/settings";
import type { OrgList, PublicOrg } from "../../api/types";

const mockList = window.api.org.list as ReturnType<typeof vi.fn>;
const mockPrefsGet = window.api.prefs.get as ReturnType<typeof vi.fn>;
const mockPrefsSet = window.api.prefs.set as ReturnType<typeof vi.fn>;
const mockSetSetting = window.api.org.setSetting as ReturnType<typeof vi.fn>;

const SETTINGS = {
  pollSeconds: 12,
  accent: "blue",
  showSummary: true,
  weekStart: 1,
  showTags: true,
  showBillable: true,
  notifyTimer: true,
  animateDigits: true,
  hourlyRate: 0,
  currency: "€",
  showIncome: true,
  defaultProject: null,
  defaultActivity: null,
  reminderHours: 8,
  idleThresholdMinutes: 10,
};

function makeOrg(overrides: Partial<PublicOrg> = {}): PublicOrg {
  return {
    id: "org-1",
    alias: "Test Org",
    baseUrl: "https://kimai.example.com",
    authMode: "bearer",
    username: "",
    settings: SETTINGS,
    ...overrides,
  };
}

function makeOrgList(orgs: PublicOrg[], activeId: string | null = null): OrgList {
  return { organisations: orgs, activeOrgId: activeId };
}

// Reset Zustand store to bare initial state before each test
beforeEach(() => {
  useSettings.setState({
    loaded: false,
    configured: false,
    organisations: [],
    activeOrgId: null,
  });
});

describe("initial state", () => {
  it("starts with loaded=false and configured=false", () => {
    const state = useSettings.getState();
    expect(state.loaded).toBe(false);
    expect(state.configured).toBe(false);
    expect(state.organisations).toHaveLength(0);
  });

  it("has sensible default settings", () => {
    const state = useSettings.getState();
    expect(state.pollSeconds).toBe(12);
    expect(state.currency).toBe("€");
    expect(state.reminderHours).toBe(8);
  });
});

describe("load()", () => {
  it("sets configured=true when at least one org exists", async () => {
    const org = makeOrg();
    mockList.mockResolvedValueOnce(makeOrgList([org], "org-1"));
    mockPrefsGet.mockResolvedValueOnce("system");

    await useSettings.getState().load();
    const state = useSettings.getState();

    expect(state.loaded).toBe(true);
    expect(state.configured).toBe(true);
    expect(state.organisations).toHaveLength(1);
    expect(state.activeOrgId).toBe("org-1");
  });

  it("sets configured=false when no orgs exist", async () => {
    mockList.mockResolvedValueOnce(makeOrgList([]));
    mockPrefsGet.mockResolvedValueOnce("system");

    await useSettings.getState().load();
    expect(useSettings.getState().configured).toBe(false);
  });

  it("applies org settings to the store fields", async () => {
    const org = makeOrg({ settings: { ...SETTINGS, pollSeconds: 30, currency: "USD" } });
    mockList.mockResolvedValueOnce(makeOrgList([org], "org-1"));
    mockPrefsGet.mockResolvedValueOnce("system");

    await useSettings.getState().load();
    const state = useSettings.getState();
    expect(state.pollSeconds).toBe(30);
    expect(state.currency).toBe("USD");
  });

  it("stores the theme mode returned by prefs.get", async () => {
    mockList.mockResolvedValueOnce(makeOrgList([]));
    mockPrefsGet.mockResolvedValueOnce("dark");

    await useSettings.getState().load();
    expect(useSettings.getState().themeMode).toBe("dark");
  });
});

describe("setThemeMode()", () => {
  it("updates themeMode and calls prefs.set", async () => {
    mockPrefsSet.mockResolvedValueOnce(undefined);
    await useSettings.getState().setThemeMode("dark");
    expect(useSettings.getState().themeMode).toBe("dark");
    expect(mockPrefsSet).toHaveBeenCalledWith("themeMode", "dark");
  });
});

describe("setPollSeconds()", () => {
  it("updates pollSeconds and calls org.setSetting", async () => {
    mockSetSetting.mockResolvedValueOnce(makeOrgList([]));
    await useSettings.getState().setPollSeconds(30);
    expect(useSettings.getState().pollSeconds).toBe(30);
    expect(mockSetSetting).toHaveBeenCalledWith("pollSeconds", 30);
  });
});

describe("setCurrency()", () => {
  it("updates currency field via setSetting", async () => {
    mockSetSetting.mockResolvedValueOnce(makeOrgList([]));
    await useSettings.getState().setCurrency("$");
    expect(useSettings.getState().currency).toBe("$");
    expect(mockSetSetting).toHaveBeenCalledWith("currency", "$");
  });
});

describe("setHourlyRate()", () => {
  it("updates hourlyRate field", async () => {
    mockSetSetting.mockResolvedValueOnce(makeOrgList([]));
    await useSettings.getState().setHourlyRate(50);
    expect(useSettings.getState().hourlyRate).toBe(50);
  });
});

describe("activeOrg() selector", () => {
  it("returns null when there are no organisations", () => {
    expect(activeOrg(useSettings.getState())).toBeNull();
  });

  it("returns the active org by id", async () => {
    const org = makeOrg();
    mockList.mockResolvedValueOnce(makeOrgList([org], "org-1"));
    mockPrefsGet.mockResolvedValueOnce("system");
    await useSettings.getState().load();

    expect(activeOrg(useSettings.getState())?.id).toBe("org-1");
  });
});

describe("activeAlias() selector", () => {
  it('returns "Kimai Tracker" when no org is active', () => {
    expect(activeAlias(useSettings.getState())).toBe("Kimai Tracker");
  });

  it("returns the alias of the active org", async () => {
    const org = makeOrg({ alias: "My Kimai" });
    mockList.mockResolvedValueOnce(makeOrgList([org], "org-1"));
    mockPrefsGet.mockResolvedValueOnce("system");
    await useSettings.getState().load();

    expect(activeAlias(useSettings.getState())).toBe("My Kimai");
  });
});
