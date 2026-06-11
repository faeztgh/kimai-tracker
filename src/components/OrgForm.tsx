import { useState } from "react";
import { testConnection } from "../api/kimai";
import type { AuthMode } from "../api/types";
import { Button, TextField } from "./ui";

type Status =
  | { kind: "idle" }
  | { kind: "testing" }
  | { kind: "ok"; version: string }
  | { kind: "error"; message: string };

export interface OrgFormValue {
  alias: string;
  baseUrl: string;
  authMode: AuthMode;
  username?: string;
  token?: string;
}

interface Props {
  mode: "create" | "edit";
  initial?: {
    alias: string;
    baseUrl: string;
    authMode: AuthMode;
    username: string;
  };
  submitLabel?: string;
  onSubmit: (value: OrgFormValue) => Promise<void>;
  onCancel?: () => void;
}

export function OrgForm({
  mode,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const [alias, setAlias] = useState(initial?.alias ?? "");
  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl ?? "");
  const [token, setToken] = useState("");
  const [legacy, setLegacy] = useState(initial?.authMode === "legacy");
  const [username, setUsername] = useState(initial?.username ?? "");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const authMode: AuthMode = legacy ? "legacy" : "bearer";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = baseUrl.trim().replace(/\/+$/, "");
    const tok = token.trim();
    const name = alias.trim();

    if (!name) {
      setStatus({ kind: "error", message: "Organisation name is required." });
      return;
    }
    if (!url) {
      setStatus({ kind: "error", message: "Server URL is required." });
      return;
    }
    if (mode === "create" && !tok) {
      setStatus({ kind: "error", message: "An API token is required." });
      return;
    }

    setStatus({ kind: "testing" });
    try {
      if (tok) {
        const version = await testConnection({
          baseUrl: url,
          authMode,
          token: tok,
          username: username.trim() || undefined,
        });
        await onSubmit({
          alias: name,
          baseUrl: url,
          authMode,
          username: username.trim() || undefined,
          token: tok,
        });
        setStatus({ kind: "ok", version: version.version ?? "connected" });
      } else {
        await onSubmit({
          alias: name,
          baseUrl: url,
          authMode,
          username: username.trim() || undefined,
        });
        setStatus({ kind: "ok", version: "saved" });
      }
    } catch (err) {
      setStatus({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <TextField
        label="Organisation name"
        value={alias}
        placeholder="e.g. Acme GmbH"
        autoFocus
        onChange={setAlias}
      />
      <TextField
        label="Server URL"
        type="url"
        value={baseUrl}
        placeholder="https://kimai.example.com"
        onChange={setBaseUrl}
      />
      {legacy && (
        <TextField
          label="Username"
          value={username}
          placeholder="kimai username"
          onChange={setUsername}
        />
      )}
      <TextField
        label={
          mode === "edit"
            ? legacy
              ? "API password (leave blank to keep)"
              : "API token (leave blank to keep)"
            : legacy
              ? "API password"
              : "API token"
        }
        type="password"
        value={token}
        placeholder="••••••••••••"
        onChange={setToken}
      />

      <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        <input
          type="checkbox"
          checked={legacy}
          onChange={(e) => setLegacy(e.target.checked)}
          className="accent-accent-500"
        />
        Use legacy header auth (old Kimai servers)
      </label>

      <div className="flex items-center gap-2">
        <Button
          type="submit"
          disabled={status.kind === "testing"}
          className="w-full"
        >
          {status.kind === "testing"
            ? "Testing…"
            : (submitLabel ??
              (mode === "create" ? "Test & Save" : "Save changes"))}
        </Button>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>

      {status.kind === "error" && (
        <p className="text-sm text-red-500">{status.message}</p>
      )}
      {status.kind === "ok" && status.version !== "saved" && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Connected to Kimai {status.version}.
        </p>
      )}
    </form>
  );
}
