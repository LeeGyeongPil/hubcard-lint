// AC-3 위치: 진단 줄·열은 파일 기준(앞머리 `---` 포함), 문법 오류 문구의 (줄:열) 은 허브와 같은 앞머리 기준.
import { describe, expect, it } from "vitest";
import { extractFrontMatter } from "../src/frontmatter.js";
import { lintCard } from "../src/index.js";
import { fixture } from "./helpers.js";

const find = (r: ReturnType<typeof lintCard>, rule: string, path?: string) =>
  r.diagnostics.find((d) => d.rule === rule && (path === undefined || d.path === path));

describe("file-based positions", () => {
  it("points value diagnostics at the value (fence line counted)", () => {
    const r = lintCard(fixture("bad_values.md"), { type: "model" });
    // 2행 "license: Apache 2.0" → 값은 10열
    expect(find(r, "license/unknown")).toMatchObject({ line: 2, column: 10, path: "license" });
    expect(find(r, "library_name/unknown")).toMatchObject({ line: 3, column: 15 });
    expect(find(r, "pipeline_tag/unknown")).toMatchObject({ line: 4, column: 15 });
    // flow 목록 [not a repo id] 의 첫 칸
    expect(find(r, "base_model/format")).toMatchObject({ line: 5, column: 14, path: "base_model.0" });
    expect(find(r, "base_model_relation/enum")).toMatchObject({ line: 6, column: 22 });
    expect(find(r, "datasets/not-string")).toMatchObject({ line: 8, column: 3, path: "datasets.0" });
    // 스칼라 language 는 허브처럼 language.0 경로, 위치는 스칼라 자체
    expect(find(r, "language/too-long")).toMatchObject({ line: 9, column: 11, path: "language.0" });
  });

  it("keeps the Hub's front-matter-relative (line:col) in the syntax message but reports the file line", () => {
    const r = lintCard(fixture("bad_indent2.md"));
    const d = find(r, "yaml/syntax")!;
    expect(d.hub).toBe("Invalid YAML in README.md: bad indentation of a sequence entry (4:15)");
    expect(d.line).toBe(5);
    expect(d.column).toBe(15);
    expect(d.params).toMatchObject({ fmLine: "4", fmColumn: "15" });
  });

  it("reports duplicated keys at the second key", () => {
    const d = find(lintCard(fixture("dup_key.md")), "yaml/duplicate-key")!;
    expect(d.hub).toBe("Invalid YAML in README.md: duplicated mapping key (2:1)");
    expect(d).toMatchObject({ line: 3, column: 1 });
  });

  it("points missing model-index fields at the nearest existing parent", () => {
    const r = lintCard(fixture("bad_model_index.md"));
    // task: 의 값 맵은 7행 "name: x" 에서 시작, dataset 은 9행, metrics 첫 항목은 11행
    expect(find(r, "model-index/required", "model-index.0.results.0.task.type")).toMatchObject({ line: 7, column: 7 });
    expect(find(r, "model-index/required", "model-index.0.results.0.dataset.type")).toMatchObject({ line: 9, column: 7 });
    expect(find(r, "model-index/required", "model-index.0.results.0.metrics.0.value")).toMatchObject({ line: 11, column: 7 });
  });

  it("puts card-level findings on the opening fence", () => {
    const r = lintCard(fixture("leading_blank.md"));
    expect(find(r, "library_name/missing")).toMatchObject({ line: 2, column: 1 });
    expect(find(lintCard(fixture("no_front.md")), "front-matter/missing")).toMatchObject({ line: 1, column: 1 });
  });

  it.each([
    ["bom.md", 1, 2],
    ["crlf.md", 1, 2],
    ["leading_blank.md", 2, 3],
  ])("recognises front matter in %s (fence line %i)", (name, openLine, licenseLine) => {
    const fm = extractFrontMatter(fixture(name));
    expect(fm).not.toBeNull();
    expect(fm!.openLine).toBe(openLine);
    expect(fm!.yaml).toBe("license: nope");
    const r = lintCard(fixture(name));
    expect(find(r, "front-matter/missing")).toBeUndefined();
    expect(find(r, "license/unknown")).toMatchObject({ line: licenseLine, column: 10 });
  });

  it("keeps columns with CRLF line endings and BOM", () => {
    const text = "﻿---\r\nlicense: mit\r\npipeline_tag: text-generations\r\n---\r\n";
    expect(find(lintCard(text), "pipeline_tag/unknown")).toMatchObject({ line: 3, column: 15 });
  });

  it("treats an unclosed or empty block as missing metadata", () => {
    expect(find(lintCard("---\nlicense: mit\n"), "front-matter/missing")).toBeDefined();
    expect(find(lintCard("---\n# only a comment\n---\nbody\n"), "front-matter/missing")).toMatchObject({ line: 1 });
  });
});
