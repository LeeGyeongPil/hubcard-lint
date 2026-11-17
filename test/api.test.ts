// AC-9 라이브러리 API: 패키지 exports 경유 import, 타입 선언 생성, 잘못된 옵션 예외
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HubcardLintError, RULES, SNAPSHOT_INFO, formatJson, lintCard, lintFile } from "../src/index.js";
import { ROOT, cleanEnv, fixturePath } from "./helpers.js";

describe("library API", () => {
  it("lintCard returns diagnostics for a card string", () => {
    const r = lintCard("---\nlicense: Apache 2.0\nlibrary_name: transformers\n---\n# x\n", { type: "model", file: "x/README.md" });
    expect(r).toMatchObject({ file: "x/README.md", type: "model", detectedBy: "option", counts: { error: 1, warning: 0, lint: 0 } });
    expect(r.diagnostics[0]).toMatchObject({ rule: "license/unknown", severity: "error", messageId: "license/unknown", params: { value: "Apache 2.0" } });
  });

  it("invalid type option throws HubcardLintError E_BAD_OPTION", () => {
    expect(() => lintCard("---\nlicense: mit\n---\n", { type: "repo" as never })).toThrow(HubcardLintError);
    try {
      lintCard("", { type: "repo" as never });
    } catch (e) {
      expect(e).toBeInstanceOf(HubcardLintError);
      expect((e as HubcardLintError).code).toBe("E_BAD_OPTION");
    }
  });

  it("lintFile reads a file and wraps read failures as E_READ", async () => {
    const r = await lintFile(fixturePath("good.md"));
    expect(r.counts).toEqual({ error: 0, warning: 0, lint: 0 });
    await expect(lintFile(join(ROOT, "nope", "README.md"))).rejects.toMatchObject({ name: "HubcardLintError", code: "E_READ" });
  });

  it("card problems are diagnostics, not exceptions", () => {
    expect(() => lintCard("---\n: : :\n  - [\n---\n")).not.toThrow();
    expect(() => lintCard("\u0000\u0001 garbage")).not.toThrow();
    expect(lintCard("---\n- a\n- b\n---\n").diagnostics.map((d) => d.rule)).toEqual(["yaml/not-mapping"]);
  });

  it("exports RULES, SNAPSHOT_INFO and formatJson", () => {
    expect(RULES.length).toBeGreaterThanOrEqual(20);
    expect(new Set(RULES.map((r) => r.id)).size).toBe(RULES.length);
    expect(SNAPSHOT_INFO.tasksVersion).toBe("0.22.16");
    expect(JSON.parse(formatJson([lintCard("# no metadata\n")]))[0].counts).toEqual({ error: 0, warning: 1, lint: 0 });
  });

  it("dist/index.d.ts is generated and the package entry resolves through exports", () => {
    expect(existsSync(join(ROOT, "dist/index.d.ts"))).toBe(true);
    const dts = readFileSync(join(ROOT, "dist/index.d.ts"), "utf8");
    expect(dts).toContain("lintCard");
    // 패키지 이름으로 자기 참조(import "hubcard-lint") — exports 가 dist/index.js 를 가리키는지
    const out = execFileSync(
      process.execPath,
      ["--input-type=module", "-e", 'import { lintCard } from "hubcard-lint"; console.log(JSON.stringify(lintCard("---\\nlicense: nope\\n---\\n").diagnostics.map(d => d.rule)))'],
      { cwd: ROOT, encoding: "utf8", env: cleanEnv() },
    );
    expect(JSON.parse(out)).toContain("license/unknown");
  });

  it("examples/api.mjs runs and prints license/unknown", () => {
    const out = execFileSync(process.execPath, [join(ROOT, "examples/api.mjs")], { cwd: ROOT, encoding: "utf8", env: cleanEnv() });
    expect(out).toContain('"rule":"license/unknown"');
  });
});
