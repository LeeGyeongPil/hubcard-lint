// 규칙 표와 규칙 데이터 스냅샷.
// 등급 원칙: 허브가 거절하는 것을 관찰한 규칙만 error, 허브가 경고하는 것은 warning,
// 관찰되지 않은 문서 규칙·필터에서 빠지는 문제는 lint(허브는 받는다). 관찰 날짜 2026-11-17.
import { createRequire } from "node:module";
// 런타임은 번들 스냅샷만 읽는다(네트워크 없음). dist/rules/index.js 기준 ../data/snapshot.json
const require = createRequire(import.meta.url);
export const SNAPSHOT = require("../data/snapshot.json");
/** 스냅샷 출처 버전·확인 날짜(`--version` 에 표시) */
export const SNAPSHOT_INFO = Object.freeze({ tasksVersion: SNAPSHOT.tasksVersion, checked: SNAPSHOT.checked });
const ALL = ["model", "dataset", "space"];
const OBSERVED = "2026-11-17";
const HUB = "https://huggingface.co/docs/hub/model-cards";
const LIC = "https://huggingface.co/docs/hub/repositories-licenses";
const SPACES = "https://huggingface.co/docs/hub/spaces-config-reference";
const DATASETS = "https://huggingface.co/docs/hub/datasets-cards";
const TASKS = "https://github.com/huggingface/huggingface.js/tree/main/packages/tasks";
const YAML = "https://github.com/nodeca/js-yaml";
export const RULES = Object.freeze([
    { id: "front-matter/missing", severity: "warning", types: ALL, basis: "hub-observed", source: HUB, observed: OBSERVED },
    { id: "yaml/syntax", severity: "error", types: ALL, basis: "hub-observed", source: YAML, observed: OBSERVED },
    { id: "yaml/duplicate-key", severity: "error", types: ALL, basis: "hub-observed", source: YAML, observed: OBSERVED },
    { id: "yaml/not-mapping", severity: "lint", types: ALL, basis: "docs", source: HUB },
    { id: "yaml/seq-merged-scalar", severity: "lint", types: ALL, basis: "docs", source: YAML },
    { id: "license/unknown", severity: "error", types: ALL, basis: "hub-observed", source: LIC, observed: OBSERVED },
    { id: "license/other-needs-name", severity: "lint", types: ALL, basis: "docs", source: LIC },
    { id: "language/too-long", severity: "error", types: ["model", "dataset"], basis: "hub-observed", source: HUB, observed: OBSERVED },
    { id: "tags/not-string", severity: "lint", types: ALL, basis: "docs", source: HUB },
    { id: "pipeline_tag/unknown", severity: "warning", types: ["model"], basis: "hub-observed", source: TASKS, observed: OBSERVED },
    { id: "library_name/unknown", severity: "lint", types: ["model"], basis: "package", source: TASKS },
    { id: "library_name/missing", severity: "lint", types: ["model"], basis: "docs", source: HUB },
    { id: "datasets/not-string", severity: "error", types: ["model"], basis: "hub-observed", source: HUB, observed: OBSERVED },
    { id: "base_model/format", severity: "error", types: ["model"], basis: "hub-observed", source: HUB, observed: OBSERVED },
    { id: "base_model_relation/enum", severity: "error", types: ["model"], basis: "hub-observed", source: HUB, observed: OBSERVED },
    { id: "model-index/required", severity: "error", types: ["model"], basis: "hub-observed", source: HUB, observed: OBSERVED },
    { id: "task_categories/unknown", severity: "warning", types: ["dataset"], basis: "hub-observed", source: TASKS, observed: OBSERVED },
    { id: "task_ids/unknown", severity: "lint", types: ["dataset"], basis: "package", source: TASKS },
    { id: "size_categories/format", severity: "lint", types: ["dataset"], basis: "docs", source: DATASETS },
    { id: "configs/data-files-missing", severity: "lint", types: ["dataset"], basis: "docs", source: DATASETS },
    { id: "space/color", severity: "error", types: ["space"], basis: "hub-observed", source: SPACES, observed: OBSERVED },
    { id: "space/app_port", severity: "error", types: ["space"], basis: "hub-observed", source: SPACES, observed: OBSERVED },
    { id: "space/suggested_hardware", severity: "error", types: ["space"], basis: "hub-observed", source: SPACES, observed: OBSERVED },
    { id: "space/sdk", severity: "lint", types: ["space"], basis: "docs", source: SPACES },
    { id: "space/sdk-version-missing", severity: "lint", types: ["space"], basis: "docs", source: SPACES },
]);
export const RULES_BY_ID = new Map(RULES.map((r) => [r.id, r]));
// --- 규칙 파일들이 함께 쓰는 작은 도우미 ---
/** 허브는 스칼라 하나도 목록 한 칸으로 본다(`language: english` → "language.0"). */
export function asList(value) {
    return Array.isArray(value) ? value : [value];
}
/** 메시지에 넣을 값 설명: null, "7860", 42, list, mapping */
export function describe(value) {
    if (value === null || value === undefined)
        return "null";
    if (typeof value === "string")
        return JSON.stringify(value);
    if (Array.isArray(value))
        return "list";
    if (typeof value === "object")
        return "mapping";
    return String(value);
}
/** 메시지·허브 문구에 그대로 넣을 문자열(목록·맵은 JSON) */
export function text(value) {
    if (typeof value === "string")
        return value;
    if (value === null || value === undefined)
        return "null";
    if (typeof value === "object")
        return JSON.stringify(value);
    return String(value);
}
