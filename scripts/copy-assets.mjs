// tsc 는 .ts 만 옮기므로 런타임에 읽는 JSON(규칙 스냅샷·언어별 메시지)을 dist/ 로 복사하고,
// CLI 진입 파일(dist/cli.js)에 실행 권한을 준다(npm bin·pre-commit 훅에서 바로 실행되도록).
import { chmodSync, cpSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = (p) => fileURLToPath(new URL(`../${p}`, import.meta.url));

cpSync(root("src/data"), root("dist/data"), { recursive: true });
cpSync(root("src/i18n"), root("dist/i18n"), { recursive: true });
chmodSync(root("dist/cli.js"), 0o755);
