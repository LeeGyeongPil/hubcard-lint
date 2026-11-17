#!/usr/bin/env node
// 규칙 데이터 스냅샷(src/data/snapshot.json)의 태스크·서브태스크·모델 라이브러리 목록을
// 설치된 @huggingface/tasks 에서 다시 만든다. 런타임(검사기)은 이 스냅샷만 읽고 네트워크를 쓰지 않는다.
//
//   node scripts/refresh-snapshot.mjs           # 스냅샷을 다시 쓴다(오늘 날짜로)
//   node scripts/refresh-snapshot.mjs --check   # 쓰지 않고 차이만 보고한다(차이가 있으면 종료 코드 1)
//
// 라이선스 표·Space 색·하드웨어 목록처럼 패키지에 없는 값은 손으로 관리하며 이 스크립트가 건드리지 않는다.
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const snapshotPath = fileURLToPath(new URL("../src/data/snapshot.json", import.meta.url));
const check = process.argv.includes("--check");

// 설치된 패키지 버전과 목록(개발 의존성)
const require = createRequire(import.meta.url);
const tasksVersion = require("@huggingface/tasks/package.json").version;
const tasks = await import("@huggingface/tasks");

const fresh = {
  tasksVersion,
  pipelineTypes: [...tasks.PIPELINE_TYPES],
  subtaskTypes: tasks.SUBTASK_TYPES.map((s) => (typeof s === "string" ? s : s.type)),
  modelLibraries: Object.keys(tasks.MODEL_LIBRARIES_UI_ELEMENTS),
};

const current = JSON.parse(readFileSync(snapshotPath, "utf8"));

// 목록마다 추가·삭제를 센다(순서도 허브 경고 문구에 쓰이므로 순서 차이도 차이로 본다)
function diffList(name, before, after) {
  const b = new Set(before);
  const a = new Set(after);
  const added = after.filter((x) => !b.has(x));
  const removed = before.filter((x) => !a.has(x));
  const orderChanged = added.length === 0 && removed.length === 0 && before.join("\n") !== after.join("\n");
  return { name, count: after.length, added, removed, orderChanged };
}

const diffs = [
  diffList("pipelineTypes", current.pipelineTypes ?? [], fresh.pipelineTypes),
  diffList("subtaskTypes", current.subtaskTypes ?? [], fresh.subtaskTypes),
  diffList("modelLibraries", current.modelLibraries ?? [], fresh.modelLibraries),
];
const versionChanged = current.tasksVersion !== fresh.tasksVersion;
const changed = versionChanged || diffs.some((d) => d.added.length || d.removed.length || d.orderChanged);

console.log(`@huggingface/tasks installed ${fresh.tasksVersion}, snapshot ${current.tasksVersion || "(none)"} (checked ${current.checked})`);
for (const d of diffs) {
  const order = d.orderChanged ? ", order changed" : "";
  console.log(`  ${d.name}: ${d.count} entries, +${d.added.length} -${d.removed.length}${order}`);
  if (d.added.length) console.log(`    added: ${d.added.join(", ")}`);
  if (d.removed.length) console.log(`    removed: ${d.removed.join(", ")}`);
}

if (check) {
  console.log(changed ? "difference: yes" : "difference: 0");
  process.exit(changed ? 1 : 0);
}

if (!changed) {
  console.log("snapshot is already up to date");
} else {
  const today = new Date().toISOString().slice(0, 10);
  const next = { ...current, checked: today, ...fresh };
  writeFileSync(snapshotPath, JSON.stringify(next, null, 2) + "\n");
  console.log(`snapshot written: ${snapshotPath} (checked ${today})`);
}
