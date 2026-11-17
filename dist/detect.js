const SPACE_KEYS = ["sdk", "sdk_version", "app_file", "app_port", "colorFrom", "colorTo", "suggested_hardware", "python_version", "pinned", "emoji"];
const DATASET_KEYS = ["task_categories", "task_ids", "size_categories", "configs", "dataset_info", "pretty_name", "annotations_creators", "language_creators", "multilinguality", "source_datasets"];
export function detectType(data) {
    if (!isRecord(data))
        return "model";
    if (SPACE_KEYS.some((k) => k in data))
        return "space";
    if (DATASET_KEYS.some((k) => k in data))
        return "dataset";
    return "model";
}
export function isRecord(v) {
    return typeof v === "object" && v !== null && !Array.isArray(v);
}
