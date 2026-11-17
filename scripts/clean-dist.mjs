// 빌드 전에 dist/ 를 지운다(지운 소스 파일의 낡은 산출물이 남지 않게). rm -rf 대신 써서 Windows 에서도 돈다.
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

rmSync(fileURLToPath(new URL("../dist", import.meta.url)), { recursive: true, force: true });
