import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { app, safeStorage } from "electron";

interface Entry {
  enc: boolean;
  data: string;
}

interface Store {
  v: 2;
  tokens: Record<string, Entry>;
}

interface LegacyStored {
  v: 1;
  enc: boolean;
  data: string;
}

function file(): string {
  return join(app.getPath("userData"), "tokens.json");
}

function legacyFile(): string {
  return join(app.getPath("userData"), "token.json");
}

function emptyStore(): Store {
  return { v: 2, tokens: {} };
}

function read(): Store {
  const path = file();
  if (!existsSync(path)) return emptyStore();
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Store;
    if (parsed?.tokens && typeof parsed.tokens === "object") {
      return { v: 2, tokens: parsed.tokens };
    }
  } catch (err) {
    console.error("[secrets] read failed:", err);
  }
  return emptyStore();
}

function write(store: Store): void {
  const path = file();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(store), "utf8");
}

function encode(token: string): Entry {
  const enc = safeStorage.isEncryptionAvailable();
  const data = enc
    ? safeStorage.encryptString(token).toString("base64")
    : Buffer.from(token, "utf8").toString("base64");
  return { enc, data };
}

function decode(entry: Entry): string | null {
  const buf = Buffer.from(entry.data, "base64");
  if (!entry.enc) return buf.toString("utf8");
  if (!safeStorage.isEncryptionAvailable()) return null;
  return safeStorage.decryptString(buf);
}

export const secrets = {
  setToken(id: string, token: string): void {
    const store = read();
    store.tokens[id] = encode(token);
    write(store);
  },

  getToken(id: string): string | null {
    const entry = read().tokens[id];
    if (!entry) return null;
    try {
      return decode(entry);
    } catch (err) {
      console.error("[secrets] decode failed:", err);
      return null;
    }
  },

  deleteToken(id: string): void {
    const store = read();
    if (id in store.tokens) {
      delete store.tokens[id];
      write(store);
    }
  },

  deleteAll(): void {
    try {
      rmSync(file(), { force: true });
    } catch (err) {
      console.error("[secrets] delete failed:", err);
    }
  },

  readLegacyToken(): string | null {
    const path = legacyFile();
    if (!existsSync(path)) return null;
    try {
      const payload = JSON.parse(readFileSync(path, "utf8")) as LegacyStored;
      const buf = Buffer.from(payload.data, "base64");
      if (!payload.enc) return buf.toString("utf8");
      if (!safeStorage.isEncryptionAvailable()) return null;
      return safeStorage.decryptString(buf);
    } catch {
      return null;
    }
  },

  deleteLegacyToken(): void {
    try {
      rmSync(legacyFile(), { force: true });
    } catch {
      void 0;
    }
  },

  backend(): "unavailable" | "basic" | "secure" {
    if (!safeStorage.isEncryptionAvailable()) return "unavailable";
    try {
      const selected = safeStorage.getSelectedStorageBackend?.();
      return selected === "basic_text" ? "basic" : "secure";
    } catch {
      return "secure";
    }
  },
};
