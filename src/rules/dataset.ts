// 데이터셋 카드 규칙: task_categories · task_ids · size_categories · configs
import { isRecord } from "../detect.js";
import { suggest } from "../suggest.js";
import { SNAPSHOT, asList, text, type RuleContext } from "./index.js";

const PIPELINES = new Set(SNAPSHOT.pipelineTypes);
const SUBTASKS = new Set(SNAPSHOT.subtaskTypes);
const SIZES = new Set(SNAPSHOT.sizeCategories);

export function checkDataset({ data, report }: RuleContext): void {
  // task_categories — 허브는 공식 목록에 없으면 경고(2026-11-17 관찰)
  if (data.task_categories !== undefined && data.task_categories !== null) {
    asList(data.task_categories).forEach((item, i) => {
      if (typeof item === "string" && PIPELINES.has(item)) return;
      const value = text(item);
      report({
        rule: "task_categories/unknown",
        path: ["task_categories", i],
        params: { path: `task_categories.${i}`, value },
        hub: `The task_categories "${value}" is not in the official list: ${SNAPSHOT.pipelineTypes.join(", ")}`,
        suggestion: suggest(item, SNAPSHOT.pipelineTypes),
      });
    });
  }

  // task_ids — 서브태스크 목록(허브는 받지만 필터에서 빠진다)
  if (data.task_ids !== undefined && data.task_ids !== null) {
    asList(data.task_ids).forEach((item, i) => {
      if (typeof item === "string" && SUBTASKS.has(item)) return;
      report({
        rule: "task_ids/unknown",
        path: ["task_ids", i],
        params: { path: `task_ids.${i}`, value: text(item) },
        suggestion: suggest(item, SNAPSHOT.subtaskTypes),
      });
    });
  }

  // size_categories — 허브 크기 필터 구간(n<1K, 1K<n<10K, …)
  if (data.size_categories !== undefined && data.size_categories !== null) {
    asList(data.size_categories).forEach((item, i) => {
      if (typeof item === "string" && SIZES.has(item)) return;
      report({
        rule: "size_categories/format",
        path: ["size_categories", i],
        params: { path: `size_categories.${i}`, value: text(item) },
        suggestion: suggest(item, SNAPSHOT.sizeCategories),
      });
    });
  }

  // configs — 서브셋마다 data_files(또는 data_dir)가 있어야 로더가 파일을 찾는다
  if (Array.isArray(data.configs)) {
    data.configs.forEach((config, i) => {
      if (!isRecord(config) || config.data_files !== undefined || config.data_dir !== undefined) return;
      report({ rule: "configs/data-files-missing", path: ["configs", i], params: { name: text(config.config_name ?? `#${i}`) } });
    });
  }
}
