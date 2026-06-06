import { existsSync } from "node:fs";
import { join } from "node:path";

export default function globalSetup() {
  const entryPoint = join(process.cwd(), "out", "main", "index.js");
  if (!existsSync(entryPoint)) {
    throw new Error(
      `\n\nElectron build not found at: ${entryPoint}\n` +
        "Run  pnpm build  before running E2E tests.\n",
    );
  }
}
