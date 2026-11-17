// AC-5 가까운 값 제안
import { describe, expect, it } from "vitest";
import { lintCard } from "../src/index.js";
import { SNAPSHOT } from "../src/rules/index.js";
import { editDistance, suggest } from "../src/suggest.js";

describe("suggestions", () => {
  it.each([
    ["text-generations", SNAPSHOT.pipelineTypes, "text-generation"],
    ["Apache 2.0", SNAPSHOT.licenses, "apache-2.0"],
    ["transformer", SNAPSHOT.modelLibraries, "transformers"],
    ["grey", SNAPSHOT.spaceColors, "gray"],
    ["CC BY 4.0", SNAPSHOT.licenses, "cc-by-4.0"],
    ["t4-smal", SNAPSHOT.suggestedHardware, "t4-small"],
  ])("%s -> %s", (value, candidates, expected) => {
    expect(suggest(value, candidates)).toBe(expected);
  });

  it("gives no suggestion for distant values", () => {
    expect(suggest("foo-bar-baz", SNAPSHOT.pipelineTypes)).toBeUndefined();
    expect(suggest("foo-bar-baz", SNAPSHOT.licenses)).toBeUndefined();
    expect(suggest("foo-bar-baz", SNAPSHOT.modelLibraries)).toBeUndefined();
    expect(suggest("orange", SNAPSHOT.spaceColors)).toBeUndefined();
    expect(suggest(null, SNAPSHOT.licenses)).toBeUndefined();
  });

  it("shows up in diagnostics", () => {
    const r = lintCard("---\nlicense: Apache 2.0\nlibrary_name: transformer\npipeline_tag: text-generations\n---\n");
    expect(Object.fromEntries(r.diagnostics.map((d) => [d.rule, d.suggestion]))).toEqual({
      "license/unknown": "apache-2.0",
      "library_name/unknown": "transformers",
      "pipeline_tag/unknown": "text-generation",
    });
    const space = lintCard("---\nsdk: docker\ncolorFrom: grey\n---\n");
    expect(space.diagnostics.find((d) => d.rule === "space/color")?.suggestion).toBe("gray");
    const far = lintCard("---\nlicense: foo-bar-baz\n---\n");
    expect(far.diagnostics.find((d) => d.rule === "license/unknown")).not.toHaveProperty("suggestion");
  });

  it("edit distance basics", () => {
    expect(editDistance("kitten", "sitting")).toBe(3);
    expect(editDistance("abc", "abc")).toBe(0);
    expect(editDistance("abc", "abcdef", 2)).toBe(2);
  });
});
