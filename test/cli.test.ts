// AC-6 CLI 계약(빌드된 dist/cli.js 를 자식 프로세스로 실행) + AC-1 npm start 출력
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ROOT, fixturePath, runCli } from "./helpers.js";

describe("exit codes", () => {
  it("0 when there are no errors", () => {
    expect(runCli([fixturePath("good.md")]).code).toBe(0);
    // lint 만 있는 카드도 기본은 0
    expect(runCli([fixturePath("other_no_name.md")]).code).toBe(0);
  });

  it("1 when there are errors", () => {
    expect(runCli([fixturePath("bad_values.md")]).code).toBe(1);
  });

  it("--strict also fails on warnings and lint", () => {
    expect(runCli(["--strict", fixturePath("other_no_name.md")]).code).toBe(1);
    expect(runCli(["--strict", fixturePath("no_front.md")]).code).toBe(1);
    expect(runCli(["--strict", fixturePath("good.md")]).code).toBe(0);
  });

  it("--exit-zero always exits 0", () => {
    expect(runCli(["--exit-zero", fixturePath("bad_values.md")]).code).toBe(0);
    expect(runCli(["--exit-zero", "--strict", fixturePath("other_no_name.md")]).code).toBe(0);
  });

  it("2 for unknown options, bad values and missing paths", () => {
    const unknown = runCli(["--nope", fixturePath("good.md")]);
    expect(unknown.code).toBe(2);
    expect(unknown.stderr).toContain('unknown option "--nope"');
    expect(runCli(["--type", "repo", fixturePath("good.md")]).code).toBe(2);
    expect(runCli(["--format", "xml", fixturePath("good.md")]).code).toBe(2);
    expect(runCli(["--type"]).code).toBe(2);
    const missing = runCli(["does/not/exist.md"]);
    expect(missing.code).toBe(2);
    expect(missing.stderr).toContain("path not found: does/not/exist.md");
    expect(missing.stdout).toBe("");
  });
});

describe("--format json", () => {
  it("emits [{file,type,detectedBy,diagnostics[],counts}]", () => {
    const r = runCli(["--format", "json", fixturePath("bad_values.md"), fixturePath("space_bad.md")]);
    expect(r.code).toBe(1);
    const out = JSON.parse(r.stdout) as Array<Record<string, unknown>>;
    expect(out).toHaveLength(2);
    for (const res of out) {
      expect(Object.keys(res)).toEqual(["file", "type", "detectedBy", "diagnostics", "counts"]);
      expect(Object.keys(res.counts as object).sort()).toEqual(["error", "lint", "warning"]);
      for (const d of res.diagnostics as Array<Record<string, unknown>>) {
        for (const key of ["rule", "severity", "line", "column", "path", "message"]) expect(d).toHaveProperty(key);
        expect(typeof d.line).toBe("number");
        expect(["error", "warning", "lint"]).toContain(d.severity);
      }
    }
    expect(out[0]).toMatchObject({ type: "model", detectedBy: "auto", counts: { error: 5, warning: 1, lint: 1 } });
    expect(out[1]).toMatchObject({ type: "space", detectedBy: "auto" });
    const license = (out[0]!.diagnostics as Array<Record<string, unknown>>).find((d) => d.rule === "license/unknown")!;
    expect(license).toMatchObject({ suggestion: "apache-2.0", path: "license", line: 2, column: 10 });
    expect(String(license.hub)).toContain("must be a license identifier");
  });

  it("--type sets detectedBy to option", () => {
    const out = JSON.parse(runCli(["--format", "json", "--type", "space", fixturePath("good.md")]).stdout);
    expect(out[0]).toMatchObject({ type: "space", detectedBy: "option" });
  });

  it("--quiet keeps only errors", () => {
    const out = JSON.parse(runCli(["--format", "json", "--quiet", fixturePath("bad_values.md")]).stdout);
    const sev = new Set(out[0].diagnostics.map((d: { severity: string }) => d.severity));
    expect([...sev]).toEqual(["error"]);
    const text = runCli(["--quiet", fixturePath("bad_values.md")]).stdout;
    expect(text).not.toContain("pipeline_tag/unknown");
    expect(text).toContain("license/unknown");
  });
});

describe("path collection", () => {
  let dir: string;
  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), "hubcard-lint-"));
    const card = "---\nlicense: mit\nlibrary_name: peft\n---\n";
    writeFileSync(join(dir, "README.md"), card);
    for (const sub of ["models/a", "node_modules/pkg", ".git", "docs"]) mkdirSync(join(dir, sub), { recursive: true });
    writeFileSync(join(dir, "models/a/README.md"), card);
    writeFileSync(join(dir, "node_modules/pkg/README.md"), "---\nlicense: nope\n---\n");
    writeFileSync(join(dir, ".git/README.md"), "---\nlicense: nope\n---\n");
    writeFileSync(join(dir, "docs/guide.md"), "---\nlicense: nope\n---\n");
    mkdirSync(join(dir, "empty"));
  });
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  it("collects README.md only and skips node_modules and .git", () => {
    const r = runCli(["--format", "json", dir]);
    expect(r.code).toBe(0);
    const files = (JSON.parse(r.stdout) as Array<{ file: string }>).map((x) => x.file);
    expect(files).toEqual([join(dir, "README.md"), join(dir, "models/a/README.md")]);
  });

  it("defaults to ./README.md", () => {
    const r = runCli(["--format", "json"], { cwd: dir });
    expect(r.code).toBe(0);
    expect(JSON.parse(r.stdout)[0].file).toBe("README.md");
    const none = runCli([], { cwd: join(dir, "empty") });
    expect(none.code).toBe(2);
  });

  it("exits 2 for a folder without README.md", () => {
    const r = runCli([join(dir, "empty")]);
    expect(r.code).toBe(2);
    expect(r.stderr).toContain("no README.md found");
  });
});

describe("npm start (AC-1)", () => {
  it("lints the 7 example cards with a summary line", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as { scripts: Record<string, string> };
    expect(pkg.scripts.start).toBe("node dist/cli.js examples --exit-zero");
    const r = runCli(["examples", "--exit-zero"]);
    expect(r.code).toBe(0);
    for (const rule of ["license/unknown", "space/color", "front-matter/missing", "model-index/required", "task_categories/unknown"]) {
      expect(r.stdout).toContain(rule);
    }
    expect(r.stdout).toMatch(/^7 files · \d+ errors · \d+ warnings · \d+ lint$/m);
    // 정상 예제 두 개는 진단이 없다
    expect(r.stdout).not.toContain("model-good");
    expect(r.stdout).not.toContain("space-good");
  });

  it("text lines carry hub wording and fixes", () => {
    const r = runCli([join("examples", "model-bad-values")]);
    expect(r.code).toBe(1);
    expect(r.stdout).toContain(`${join("examples", "model-bad-values", "README.md")}:2:10  error  license "Apache 2.0" is not a Hub license identifier  license/unknown`);
    expect(r.stdout).toContain('    hub: "license" must be a license identifier');
    expect(r.stdout).toContain('    fix: did you mean "apache-2.0"?');
    expect(r.stdout.trimEnd().split("\n").at(-1)).toBe("1 file · 5 errors · 1 warning · 1 lint");
  });

  it("--version and --list-rules", () => {
    const v = runCli(["--version"]);
    expect(v.code).toBe(0);
    expect(v.stdout).toContain("@huggingface/tasks 0.22.16");
    expect(v.stdout).toContain("2026-11-17");
    const rules = runCli(["--list-rules"]);
    expect(rules.code).toBe(0);
    expect(rules.stdout).toContain("space/suggested_hardware\terror\tspace\tHub response\t2026-11-17");
  });
});
