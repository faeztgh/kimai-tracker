import type { Connection } from "./connection";

export interface KimaiRequest {
  path: string;
  method?: string;
  body?: unknown;
  timeoutMs?: number;
}

export interface KimaiResponse {
  ok: boolean;
  status: number;
  statusText: string;
  body: string;
  networkError?: string;
}

function trimBase(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function authHeaders(conn: Connection): Record<string, string> {
  if (conn.authMode === "legacy") {
    return {
      "X-AUTH-USER": conn.username ?? "",
      "X-AUTH-TOKEN": conn.token,
    };
  }
  return { Authorization: `Bearer ${conn.token}` };
}

export async function kimaiFetch(
  conn: Connection,
  req: KimaiRequest,
): Promise<KimaiResponse> {
  if (!/^https?:\/\//i.test(conn.baseUrl)) {
    return {
      ok: false,
      status: 0,
      statusText: "",
      body: "",
      networkError: "Invalid server URL: must start with http:// or https://",
    };
  }
  const path = req.path.startsWith("/") ? req.path : `/${req.path}`;
  const url = `${trimBase(conn.baseUrl)}${path}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...authHeaders(conn),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), req.timeoutMs ?? 15000);

  const init: RequestInit = {
    method: req.method ?? "GET",
    headers,
    signal: controller.signal,
  };
  if (req.body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(req.body);
  }

  try {
    const res = await fetch(url, init);
    const text = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      statusText: res.statusText,
      body: text,
    };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      status: 0,
      statusText: "",
      body: "",
      networkError: aborted
        ? "Request timed out"
        : err instanceof Error
          ? err.message
          : String(err),
    };
  } finally {
    clearTimeout(timeout);
  }
}
