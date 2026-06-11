import type { Connection } from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  timeoutMs?: number;
}

interface BridgeResponse {
  ok: boolean;
  status: number;
  statusText: string;
  body: string;
  networkError?: string;
}

function unwrap<T>(res: BridgeResponse): T {
  if (res.networkError) throw new ApiError(0, res.networkError);

  const text = res.body;
  if (!res.ok) {
    throw new ApiError(
      res.status,
      errorMessage(text, res.status, res.statusText),
      text,
    );
  }

  if (!text) {
    if (res.status === 204 || res.status === 205) return undefined as T;
    throw new ApiError(res.status, "Server returned an empty response");
  }
  return JSON.parse(text) as T;
}

function errorMessage(
  text: string,
  status: number,
  statusText: string,
): string {
  try {
    const data: unknown = JSON.parse(text);
    const details = collectValidationErrors(data);
    if (details.length) return details.join(" · ");
    const msg = (data as { message?: unknown })?.message;
    if (typeof msg === "string" && msg) return msg;
  } catch {
    void 0;
  }
  return `${status} ${statusText}`.trim() || `Request failed (${status})`;
}

function collectValidationErrors(data: unknown): string[] {
  const out: string[] = [];
  const errs = (data as { errors?: unknown })?.errors;
  if (!errs || typeof errs !== "object") return out;
  const e = errs as { errors?: unknown; children?: unknown };

  if (Array.isArray(e.errors)) {
    for (const m of e.errors) if (typeof m === "string") out.push(m);
  }
  if (e.children && typeof e.children === "object") {
    for (const [field, child] of Object.entries(
      e.children as Record<string, unknown>,
    )) {
      const ce = (child as { errors?: unknown })?.errors;
      if (Array.isArray(ce)) {
        for (const m of ce)
          if (typeof m === "string") out.push(`${field}: ${m}`);
      }
    }
  }

  if (out.length === 0 && !("children" in e) && !Array.isArray(e.errors)) {
    for (const [field, val] of Object.entries(e as Record<string, unknown>)) {
      if (Array.isArray(val)) {
        for (const m of val)
          if (typeof m === "string") out.push(`${field}: ${m}`);
      } else if (typeof val === "string") {
        out.push(`${field}: ${val}`);
      }
    }
  }

  return out;
}

export async function requestWith<T>(
  conn: Connection,
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const res = await window.api.kimai.requestWith(conn, {
    path,
    method: opts.method,
    body: opts.body,
    timeoutMs: opts.timeoutMs,
  });
  return unwrap<T>(res);
}

export async function request<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const res = await window.api.kimai.request({
    path,
    method: opts.method,
    body: opts.body,
    timeoutMs: opts.timeoutMs,
  });
  return unwrap<T>(res);
}
