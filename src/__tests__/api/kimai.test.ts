import { describe, expect, it, type vi } from "vitest";
import {
  deleteTimesheet,
  getActiveTimesheets,
  getActivities,
  getCustomers,
  getProjects,
  getRecentTimesheets,
  startTimer,
  stopTimer,
  testConnection,
} from "../../api/kimai";
import type { KimaiTimesheet } from "../../api/types";

const mockReq = window.api.kimai.request as ReturnType<typeof vi.fn>;
const mockReqWith = window.api.kimai.requestWith as ReturnType<typeof vi.fn>;

const ok = (body: unknown) => ({
  ok: true,
  status: 200,
  statusText: "OK",
  body: JSON.stringify(body),
});

const TIMESHEET_OBJECT: KimaiTimesheet = {
  id: 1,
  begin: "2024-06-05T09:00:00",
  end: null,
  duration: null,
  description: "Coding",
  project: 10,
  activity: 20,
  tags: ["backend"],
  billable: true,
};

/** Kimai sometimes returns project/activity as nested objects instead of IDs. */
const TIMESHEET_NESTED = {
  ...TIMESHEET_OBJECT,
  project: { id: 10, name: "Project Alpha" },
  activity: { id: 20, name: "Dev" },
  tags: [{ name: "backend" }],
};

describe("getActiveTimesheets", () => {
  it("returns an empty array when no timer is running", async () => {
    mockReq.mockResolvedValueOnce(ok([]));
    const result = await getActiveTimesheets();
    expect(result).toEqual([]);
  });

  it("normalises numeric project/activity ids", async () => {
    mockReq.mockResolvedValueOnce(ok([TIMESHEET_OBJECT]));
    const [t] = await getActiveTimesheets();
    expect(t.project).toBe(10);
    expect(t.activity).toBe(20);
  });

  it("normalises nested project/activity objects to their ids", async () => {
    mockReq.mockResolvedValueOnce(ok([TIMESHEET_NESTED]));
    const [t] = await getActiveTimesheets();
    expect(t.project).toBe(10);
    expect(t.activity).toBe(20);
  });

  it("normalises tag objects to string arrays", async () => {
    mockReq.mockResolvedValueOnce(ok([TIMESHEET_NESTED]));
    const [t] = await getActiveTimesheets();
    expect(t.tags).toEqual(["backend"]);
  });

  it("calls GET /api/timesheets/active", async () => {
    mockReq.mockResolvedValueOnce(ok([]));
    await getActiveTimesheets();
    expect(mockReq).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/timesheets/active" }),
    );
  });
});

describe("startTimer", () => {
  it("POSTs to /api/timesheets with required fields", async () => {
    mockReq.mockResolvedValueOnce(ok(TIMESHEET_OBJECT));
    await startTimer({ project: 10, activity: 20, description: "Test" });
    const call = mockReq.mock.calls[0][0];
    expect(call.path).toBe("/api/timesheets");
    expect(call.method).toBe("POST");
    expect(call.body).toMatchObject({
      project: 10,
      activity: 20,
      description: "Test",
    });
  });

  it("includes begin timestamp in the body", async () => {
    mockReq.mockResolvedValueOnce(ok(TIMESHEET_OBJECT));
    await startTimer({ project: 1, activity: 2 });
    const { body } = mockReq.mock.calls[0][0] as {
      body: Record<string, unknown>;
    };
    expect(typeof body.begin).toBe("string");
    expect(body.begin).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("joins tags as comma-separated string", async () => {
    mockReq.mockResolvedValueOnce(ok(TIMESHEET_OBJECT));
    await startTimer({ project: 1, activity: 2, tags: ["a", "b"] });
    const { body } = mockReq.mock.calls[0][0] as {
      body: Record<string, unknown>;
    };
    expect(body.tags).toBe("a,b");
  });

  it("retries without billable field on 'extra fields' error", async () => {
    const extraFieldsErr = {
      ok: false,
      status: 400,
      statusText: "Bad Request",
      body: JSON.stringify({ message: "Extra fields not allowed" }),
    };
    mockReq
      .mockResolvedValueOnce(extraFieldsErr)
      .mockResolvedValueOnce(ok(TIMESHEET_OBJECT));

    const result = await startTimer({
      project: 1,
      activity: 2,
      billable: true,
    });
    expect(mockReq).toHaveBeenCalledTimes(2);
    // Second call should omit billable
    const secondBody = mockReq.mock.calls[1][0].body as Record<string, unknown>;
    expect("billable" in secondBody).toBe(false);
    expect(result.id).toBe(1);
  });
});

describe("stopTimer", () => {
  it("PATCHes /api/timesheets/{id}/stop", async () => {
    mockReq.mockResolvedValueOnce(
      ok({ ...TIMESHEET_OBJECT, end: "2024-06-05T10:00:00" }),
    );
    await stopTimer(42);
    expect(mockReq).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/api/timesheets/42/stop",
        method: "PATCH",
      }),
    );
  });
});

describe("deleteTimesheet", () => {
  it("sends DELETE /api/timesheets/{id}", async () => {
    mockReq.mockResolvedValueOnce({
      ok: true,
      status: 204,
      statusText: "No Content",
      body: "",
    });
    await deleteTimesheet(7);
    expect(mockReq).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/timesheets/7", method: "DELETE" }),
    );
  });
});

describe("getCustomers", () => {
  it("returns customer list from /api/customers", async () => {
    const customers = [{ id: 1, name: "Acme", visible: true }];
    mockReq.mockResolvedValueOnce(ok(customers));
    const result = await getCustomers();
    expect(result).toEqual(customers);
    expect(mockReq).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/customers?visible=1" }),
    );
  });
});

describe("getProjects", () => {
  it("fetches all visible projects without customerId filter", async () => {
    mockReq.mockResolvedValueOnce(ok([]));
    await getProjects();
    expect(mockReq.mock.calls[0][0].path).toContain("/api/projects?visible=1");
    expect(mockReq.mock.calls[0][0].path).not.toContain("customer=");
  });

  it("appends customer filter when customerId is provided", async () => {
    mockReq.mockResolvedValueOnce(ok([]));
    await getProjects(5);
    expect(mockReq.mock.calls[0][0].path).toContain("customer=5");
  });
});

describe("getActivities", () => {
  it("uses globalsOnly when no projectId given", async () => {
    mockReq.mockResolvedValueOnce(ok([]));
    await getActivities();
    expect(mockReq.mock.calls[0][0].path).toContain("globalsOnly=true");
  });

  it("filters by project when projectId is provided", async () => {
    mockReq.mockResolvedValueOnce(ok([]));
    await getActivities(3);
    expect(mockReq.mock.calls[0][0].path).toContain("project=3");
    expect(mockReq.mock.calls[0][0].path).toContain("globals=true");
  });
});

describe("testConnection", () => {
  it("calls requestWith using /api/version with a 10s timeout", async () => {
    const conn = {
      baseUrl: "https://demo.kimai.org",
      authMode: "bearer" as const,
      token: "tok",
    };
    mockReqWith.mockResolvedValueOnce(ok({ version: "2.0" }));
    const result = await testConnection(conn);
    expect(result).toEqual({ version: "2.0" });
    expect(mockReqWith).toHaveBeenCalledWith(
      conn,
      expect.objectContaining({ path: "/api/version", timeoutMs: 10000 }),
    );
  });
});

describe("getRecentTimesheets", () => {
  it("encodes begin/end and requests up to 200 entries", async () => {
    mockReq.mockResolvedValueOnce(ok([TIMESHEET_OBJECT]));
    await getRecentTimesheets(7);
    const path = mockReq.mock.calls[0][0].path as string;
    expect(path).toContain("size=200");
    expect(path).toContain("order=DESC");
  });
});
