// 모델 카드 규칙: pipeline_tag · library_name · datasets · base_model · base_model_relation · model-index
import { isRecord } from "../detect.js";
import { suggest } from "../suggest.js";
import { SNAPSHOT, asList, describe, text, type RuleContext } from "./index.js";

const PIPELINES = new Set(SNAPSHOT.pipelineTypes);
const LIBRARIES = new Set(SNAPSHOT.modelLibraries);
const RELATIONS = new Set(SNAPSHOT.baseModelRelations);

// 모델 id: "이름" 또는 "조직/이름". 글자·숫자로 시작, [A-Za-z0-9_.-], "--"·".." 금지, 부분마다 96자 이하
const ID_PART = /^(?!.*(--|\.\.))[A-Za-z0-9][\w.-]{0,95}$/;
function isModelId(v: unknown): boolean {
  if (typeof v !== "string") return false;
  const parts = v.split("/");
  return parts.length <= 2 && parts.every((p) => ID_PART.test(p) && !p.endsWith(".") && !p.endsWith("-"));
}

export function checkModel(ctx: RuleContext): void {
  const { data, report } = ctx;

  // pipeline_tag — 허브는 공식 목록에 없으면 경고(push 는 받음). 목록 순서까지 허브 문구와 같다
  if (data.pipeline_tag !== undefined && !PIPELINES.has(data.pipeline_tag as string)) {
    const value = text(data.pipeline_tag);
    report({
      rule: "pipeline_tag/unknown",
      path: ["pipeline_tag"],
      params: { value },
      hub: `The pipeline tag "${value}" is not in the official list: ${SNAPSHOT.pipelineTypes.join(", ")}`,
      suggestion: suggest(data.pipeline_tag, SNAPSHOT.pipelineTypes),
    });
  }

  // library_name — 허브는 모르는 값도 받지만 코드 조각·라이브러리 필터가 붙지 않는다
  if (data.library_name === undefined) {
    report({ rule: "library_name/missing", path: [], pos: ctx.loc.at([]) });
  } else if (!LIBRARIES.has(data.library_name as string)) {
    report({
      rule: "library_name/unknown",
      path: ["library_name"],
      params: { value: text(data.library_name) },
      suggestion: suggest(data.library_name, SNAPSHOT.modelLibraries),
    });
  }

  // datasets — 자동 생성 카드의 `- null` 같은 항목(허브: "datasets.0" must be a string)
  if (Array.isArray(data.datasets)) {
    data.datasets.forEach((item, i) => {
      if (typeof item === "string") return;
      const path = `datasets.${i}`;
      report({ rule: "datasets/not-string", path: ["datasets", i], params: { path, got: describe(item) }, hub: `"${path}" must be a string` });
    });
  }

  // base_model — 모델 id 형식(허브는 스칼라도 목록 한 칸으로 본다)
  if (data.base_model !== undefined && data.base_model !== null) {
    asList(data.base_model).forEach((item, i) => {
      if (isModelId(item)) return;
      const path = `base_model.${i}`;
      report({
        rule: "base_model/format",
        path: ["base_model", i],
        params: { path, value: text(item) },
        hub: `"${path}" with value "${text(item)}" is not valid. Use a model id from https://hf.co/models.`,
      });
    });
  }

  // base_model_relation — 네 값 중 하나
  if (data.base_model_relation !== undefined && !RELATIONS.has(data.base_model_relation as string)) {
    report({
      rule: "base_model_relation/enum",
      path: ["base_model_relation"],
      params: { value: text(data.base_model_relation) },
      hub: `"base_model_relation" must be one of [${SNAPSHOT.baseModelRelations.join(", ")}]`,
      suggestion: suggest(data.base_model_relation, SNAPSHOT.baseModelRelations),
    });
  }

  checkModelIndex(ctx);
}

// model-index — 평가 결과(옛 형식). 허브가 요구하는 필수 필드를 허브와 같은 점 경로로 알려 준다
function checkModelIndex({ data, report }: RuleContext): void {
  const index = data["model-index"];
  if (index === undefined || index === null) return;
  if (!Array.isArray(index)) {
    report({ rule: "model-index/required", messageId: "model-index/not-list", path: ["model-index"] });
    return;
  }

  const required = (pathKeys: (string | number)[]) => {
    const path = pathKeys.join(".");
    report({ rule: "model-index/required", path: pathKeys, params: { path }, hub: `"${path}" is required` });
  };

  index.forEach((entry, i) => {
    if (!isRecord(entry) || !Array.isArray(entry.results)) return;
    entry.results.forEach((result, k) => {
      const base = ["model-index", i, "results", k];
      if (!isRecord(result)) return;
      for (const part of ["task", "dataset"] as const) {
        const node = result[part];
        if (node === undefined) required([...base, part]);
        else if (isRecord(node) && node.type === undefined) required([...base, part, "type"]);
      }
      if (result.metrics === undefined) {
        required([...base, "metrics"]);
      } else if (Array.isArray(result.metrics)) {
        result.metrics.forEach((metric, n) => {
          if (!isRecord(metric)) return;
          if (metric.type === undefined) required([...base, "metrics", n, "type"]);
          if (metric.value === undefined) required([...base, "metrics", n, "value"]);
        });
      }
    });
  });
}
