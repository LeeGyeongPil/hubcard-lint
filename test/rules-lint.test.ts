// AC-4 lint 등급 규칙과 카드 종류 판정. lint 는 허브가 받는 것이라 error 가 되면 안 된다.
import { describe, expect, it } from "vitest";
import { detectType } from "../src/detect.js";
import { RULES, lintCard } from "../src/index.js";
import { fixture } from "./helpers.js";

const rulesOf = (r: ReturnType<typeof lintCard>, severity?: string) =>
  r.diagnostics.filter((d) => severity === undefined || d.severity === severity).map((d) => d.rule);

describe("lint-level rules", () => {
  it("license: other without license_name, unknown library_name (Hub accepted the card)", () => {
    const r = lintCard(fixture("other_no_name.md"));
    expect(r.counts.error).toBe(0);
    expect(rulesOf(r, "lint")).toEqual(expect.arrayContaining(["license/other-needs-name", "library_name/unknown"]));
  });

  it("license_name silences license/other-needs-name", () => {
    const r = lintCard("---\nlicense: other\nlicense_name: my-license\nlibrary_name: transformers\n---\n");
    expect(r.diagnostics).toEqual([]);
  });

  it("missing library_name on a model card", () => {
    const r = lintCard("---\nlicense: mit\n---\n");
    expect(r.diagnostics.map((d) => [d.rule, d.severity])).toEqual([["library_name/missing", "lint"]]);
  });

  it("sequence item merged into a scalar by a mis-indented '- b'", () => {
    const r = lintCard(fixture("bad_indent.md"));
    const d = r.diagnostics.find((x) => x.rule === "yaml/seq-merged-scalar");
    expect(d).toMatchObject({ severity: "lint", path: "tags.0", line: 4, params: { value: "a - b" } });
    expect(r.counts.error).toBe(0);
  });

  it("dataset: size_categories '1K<n<5K' and configs without data_files are lint (Hub accepted)", () => {
    const r = lintCard(fixture("dataset_bad.md"));
    expect(r.type).toBe("dataset");
    expect(r.counts.error).toBe(0);
    expect(rulesOf(r, "lint")).toEqual(["size_categories/format", "configs/data-files-missing"]);
    expect(rulesOf(r, "warning")).toEqual(["task_categories/unknown"]);
  });

  it("configs with data_dir are fine", () => {
    const r = lintCard("---\nlicense: mit\nconfigs:\n- config_name: default\n  data_dir: data\n---\n", { type: "dataset" });
    expect(r.diagnostics).toEqual([]);
  });

  it("space: unknown sdk is lint (the Hub accepted streamlit), gradio without sdk_version is lint", () => {
    const bad = lintCard(fixture("space_bad.md"));
    const sdk = bad.diagnostics.find((d) => d.rule === "space/sdk");
    expect(sdk).toMatchObject({ severity: "lint", params: { value: "streamlit" } });

    const noVersion = lintCard(fixture("space_no_version.md"));
    expect(noVersion.counts.error).toBe(0);
    expect(rulesOf(noVersion)).toEqual(["space/sdk-version-missing"]);
    expect(noVersion.diagnostics[0]!.severity).toBe("lint");
  });

  it("tags that are not strings", () => {
    const r = lintCard("---\nlicense: mit\nlibrary_name: peft\ntags:\n- ok\n- 42\n- null\n---\n");
    expect(r.diagnostics.map((d) => [d.rule, d.path, d.severity])).toEqual([
      ["tags/not-string", "tags.1", "lint"],
      ["tags/not-string", "tags.2", "lint"],
    ]);
  });

  it("every lint rule in the table has no Hub wording", () => {
    for (const rule of RULES.filter((r) => r.severity === "lint")) {
      expect(rule.basis, rule.id).not.toBe("hub-observed");
      expect(rule.observed, rule.id).toBeUndefined();
    }
  });
});

describe("card type detection", () => {
  it("auto picks space for sdk, dataset for task_categories, model otherwise", () => {
    expect(detectType({ sdk: "gradio" })).toBe("space");
    expect(detectType({ task_categories: ["text-generation"] })).toBe("dataset");
    expect(detectType({ license: "mit", pipeline_tag: "text-generation" })).toBe("model");
    expect(detectType(null)).toBe("model");
    expect(lintCard(fixture("space_bad.md")).detectedBy).toBe("auto");
  });

  it("--type overrides auto detection", () => {
    const asModel = lintCard(fixture("space_no_version.md"), { type: "model" });
    expect(asModel.type).toBe("model");
    expect(asModel.detectedBy).toBe("option");
    // model 로 보면 Space 규칙은 돌지 않고 model 규칙(library_name)이 돈다
    expect(rulesOf(asModel)).toEqual(["library_name/missing"]);

    const asDataset = lintCard(fixture("good.md"), { type: "dataset" });
    expect(asDataset.type).toBe("dataset");
  });

  it("type-specific rules only run for their type", () => {
    const space = lintCard("---\nsdk: docker\napp_port: 7860\npipeline_tag: nope\n---\n");
    expect(space.type).toBe("space");
    expect(rulesOf(space)).toEqual([]);
  });
});
