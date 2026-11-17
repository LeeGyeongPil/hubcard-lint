// 카드 종류 자동 판정. 같은 README.md 형식이라도 종류마다 규칙이 다르다.
// Space 실행 설정 키가 하나라도 있으면 space, 데이터셋 전용 키가 있으면 dataset, 그 밖은 model.
import type { CardType } from "./types.js";

const SPACE_KEYS = ["sdk", "sdk_version", "app_file", "app_port", "colorFrom", "colorTo", "suggested_hardware", "python_version", "pinned", "emoji"];
const DATASET_KEYS = ["task_categories", "task_ids", "size_categories", "configs", "dataset_info", "pretty_name", "annotations_creators", "language_creators", "multilinguality", "source_datasets"];

export function detectType(data: unknown): CardType {
  if (!isRecord(data)) return "model";
  if (SPACE_KEYS.some((k) => k in data)) return "space";
  if (DATASET_KEYS.some((k) => k in data)) return "dataset";
  return "model";
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
