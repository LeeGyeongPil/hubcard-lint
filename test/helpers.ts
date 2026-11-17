// 테스트 공용 도우미: 픽스처 읽기, 빌드된 CLI 를 자식 프로세스로 실행
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("..", import.meta.url));
export const CLI = fileURLToPath(new URL("../dist/cli.js", import.meta.url));

export function fixturePath(name: string): string {
  return fileURLToPath(new URL(`./fixtures/cards/${name}`, import.meta.url));
}

export function fixture(name: string): string {
  return readFileSync(fixturePath(name), "utf8");
}

/** 언어 관련 환경 변수를 지운 기본 환경(테스트가 개발자 로캘에 따라 달라지지 않게) */
export function cleanEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const k of ["HUBCARD_LINT_LANG", "LC_ALL", "LC_MESSAGES", "LANG"]) delete env[k];
  return { ...env, ...extra };
}

export interface CliRun {
  code: number | null;
  stdout: string;
  stderr: string;
}

export function runCli(args: string[], options: { env?: Record<string, string>; cwd?: string } = {}): CliRun {
  const r = spawnSync(process.execPath, [CLI, ...args], {
    cwd: options.cwd ?? ROOT,
    env: cleanEnv(options.env),
    encoding: "utf8",
    timeout: 60_000,
  });
  return { code: r.status, stdout: r.stdout, stderr: r.stderr };
}
