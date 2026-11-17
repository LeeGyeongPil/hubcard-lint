// npm "prepare" 단계. 개발 의존성(typescript)이 있으면 빌드하고, 없으면 커밋된 dist/ 를 그대로 쓴다.
//
// 왜 필요한가: pre-commit(language: node)과 `npm install -g github:…` 는 저장소를 git 의존성으로 설치한다.
// 이때 npm 이 prepare 를 돌리지만 개발 의존성이 패키지 폴더에 깔리지 않아 `tsc: command not found` 로
// 설치가 실패했다(2026-11-17, npm 11.20.0 + pre-commit try-repo 실측). 그래서 dist/ 를 저장소에 함께 두고,
// 빌드 도구가 없을 때는 빌드를 건너뛴다. 개발 중 `npm install` 은 typescript 가 있으므로 항상 새로 빌드한다.
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const hasTypeScript = existsSync(fileURLToPath(new URL("../node_modules/typescript/package.json", import.meta.url)));
const hasDist = existsSync(fileURLToPath(new URL("../dist/cli.js", import.meta.url)));

if (hasTypeScript) {
  execSync("npm run build", { cwd: root, stdio: "inherit" });
} else if (hasDist) {
  console.log("hubcard-lint: typescript not installed, using the committed dist/");
} else {
  console.error("hubcard-lint: dist/ is missing and typescript is not installed; run `npm install` with dev dependencies");
  process.exit(1);
}
