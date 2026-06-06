import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError, request, requestWith } from "../../api/client";
import type { Connection } from "../../api/types";

const mockReq = window.api.kimai.request as ReturnType<typeof vi.fn>;
const mockReqWith = window.api.kimai.requestWith as ReturnType<typeof vi.fn>;

const OK = (body: unknown) => ({
  ok: true,
  status: 200,
  statusText: "OK",
  body: JSON.stringify(body),
});

const FAIL = (status: number, body: unknown, text = "Error") => ({
  ok: false,
  status,
  statusText: text,
  body: typeof body === "string" ? body : JSON.stringify(body),
});

const NET_ERROR = (msg: string) => ({
  ok: false,
  status: 0,
  statusText: "",
  body: "",
  networkError: msg,
});

describe("ApiError", () => {
  it("is an Error with status, message, and body", () => {
    const err = new ApiError(404, "Not Found", '{"msg":"missing"}');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ApiError");
    expect(err.status).toBe(404);
    expect(err.message).toBe("Not Found");
    expect(err.body).toBe('{"msg":"missing"}');
  });

  it("works without body argument", () => {
    const err = new ApiError(500, "Server Error");
    expect(err.body).toBeUndefined();
  });
});

describe("request", () => {
  it("resolves with parsed JSON on success", async () => {
    mockReq.mockResolvedValueOnce(OK({ id: 1, name: "Test" }));
    const result = await request<{ id: number; name: string }>("/api/test");
    expect(result).toEqual({ id: 1, name: "Test" });
  });

  it("forwards path, method, body, and timeoutMs", async () => {
    mockReq.mockResolvedValueOnce(OK({}));
    await request("/api/create", { method: "POST", body: { name: "x" }, timeoutMs: 5000 });
    expect(mockReq).toHaveBeenCalledWith({
      path: "/api/create",
      method: "POST",
      body: { name: "x" },
      timeoutMs: 5000,
    });
  });

  it("returns undefined when body is empty (204 No Content)", async () => {
    mockReq.mockResolvedValueOnce({ ok: true, status: 204, statusText: "No Content", body: "" });
    const result = await request<void>("/api/delete");
    expect(result).toBeUndefined();
  });

  it("throws ApiError with status=0 on network error", async () => {
    mockReq.mockResolvedValueOnce(NET_ERROR("Connection refused"));
    const err = await request("/api/test").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(0);
    expect(err.message).toBe("Connection refused");
  });

  it("throws ApiError with status code on HTTP error", async () => {
    mockReq.mockResolvedValueOnce(FAIL(403, { message: "Access denied" }, "Forbidden"));
    const err = await request("/api/test").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(403);
    expect(err.message).toBe("Access denied");
  });

  it("falls back to status+statusText when body has no message", async () => {
    mockReq.mockResolvedValueOnce(FAIL(500, "Internal error", "Internal Server Error"));
    const err = await request("/api/test").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toContain("500");
  });

  it("extracts Kimai nested validation errors", async () => {
    const body = {
      errors: {
        errors: ["Time overlap"],
        children: {
          project: { errors: ["Project is required"] },
        },
      },
    };
    mockReq.mockResolvedValueOnce(FAIL(400, body, "Bad Request"));
    const err = await request("/api/test").catch((e) => e);
    expect(err.message).toContain("Time overlap");
    expect(err.message).toContain("project: Project is required");
  });

  it("extracts flat validation errors from errors.errors array", async () => {
    const body = { errors: { errors: ["Field A is missing", "Field B invalid"] } };
    mockReq.mockResolvedValueOnce(FAIL(400, body, "Bad Request"));
    const err = await request("/api/test").catch((e) => e);
    expect(err.message).toContain("Field A is missing");
    expect(err.message).toContain("Field B invalid");
  });
});

describe("requestWith", () => {
  const conn: Connection = {
    baseUrl: "https://kimai.example.com",
    authMode: "bearer",
    token: "secret-token",
  };

  it("delegates to window.api.kimai.requestWith with the connection", async () => {
    mockReqWith.mockResolvedValueOnce(OK({ version: "2.0" }));
    const result = await requestWith<{ version: string }>(conn, "/api/version");
    expect(result).toEqual({ version: "2.0" });
    expect(mockReqWith).toHaveBeenCalledWith(conn, {
      path: "/api/version",
      method: undefined,
      body: undefined,
      timeoutMs: undefined,
    });
  });

  it("throws ApiError on HTTP failure", async () => {
    mockReqWith.mockResolvedValueOnce(FAIL(401, { message: "Unauthorized" }, "Unauthorized"));
    const err = await requestWith(conn, "/api/version").catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(401);
  });
});
