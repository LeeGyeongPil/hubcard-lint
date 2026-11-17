// AC-10 pre-commit 훅 정의와 npm bin
import { accessSync, constants, readFileSync } from "node:fs";
import { join } from "node:path";
import { load } from "js-yaml";
import { describe, expect, it } from "vitest";
import { ROOT } from "./helpers.js";

interface Hook {
  id: string;
  entry: string;
  language: string;
  files: string;
}

describe(".pre-commit-hooks.yaml", () => {
  const hooks = load(readFileSync(join(ROOT, ".pre-commit-hooks.yaml"), "utf8")) as Hook[];
  const hook = hooks.find((h) => h.id === "hubcard-lint")!;

  it("defines the hubcard-lint node hook", () => {
    expect(hook).toBeDefined();
    expect(hook.entry).toBe("hubcard-lint");
    expect(hook.language).toBe("node");
  });

  it("matches README.md files only", () => {
    // pre-commit 은 files 를 Python re.search 로 쓴다 — 이 정규식은 JS 에서도 같은 뜻이다
    const re = new RegExp(hook.files);
    expect(re.test("README.md")).toBe(true);
    expect(re.test("models/a/README.md")).toBe(true);
    expect(re.test("docs/guide.md")).toBe(false);
    expect(re.test("NOTREADME.md")).toBe(false);
    expect(re.test("README.md.bak")).toBe(false);
  });
});

describe("package bin", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

  it("bin.hubcard-lint points to an executable dist/cli.js with a node shebang", () => {
    expect(pkg.bin["hubcard-lint"]).toBe("dist/cli.js");
    const cli = join(ROOT, pkg.bin["hubcard-lint"]);
    expect(readFileSync(cli, "utf8").split("\n")[0]).toBe("#!/usr/bin/env node");
    try {
      accessSync(cli, constants.X_OK);
    } catch (err) {
      // Windows 에는 실행 비트가 없다 — 그 경우만 건너뛴다
      if (process.platform !== "win32") throw err;
    }
  });

  it("publishes dist and documents, requires Node >= 22", () => {
    expect(pkg.files).toContain("dist");
    expect(pkg.engines.node).toBe(">=22");
    expect(pkg.exports["."]).toEqual({ types: "./dist/index.d.ts", import: "./dist/index.js" });
  });
});
