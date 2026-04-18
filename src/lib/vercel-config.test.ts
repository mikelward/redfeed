import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("vercel.json", () => {
  it("defines Next.js deployment commands", () => {
    const raw = readFileSync(join(process.cwd(), "vercel.json"), "utf8");
    const config = JSON.parse(raw) as Record<string, unknown>;

    expect(config.framework).toBe("nextjs");
    expect(config.buildCommand).toBe("npm run build");
    expect(config.installCommand).toBe("npm install");
    expect(config.devCommand).toBe("npm run dev");
  });
});
