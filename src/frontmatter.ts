// README.md 맨 위 YAML 앞머리(---  ...  ---)를 떼어 낸다.
// 허브는 BOM·앞쪽 빈 줄·CRLF 가 있어도 앞머리로 인식한다(2026-11-17 관찰) → 여기서도 같게 허용한다.

export interface FrontMatter {
  /** 앞머리 YAML 본문(줄 끝은 \n 으로 통일, CR 제거) */
  yaml: string;
  /** 여는 `---` 의 파일 줄 번호(1부터) */
  openLine: number;
  /** YAML 첫 줄의 파일 줄 번호(= openLine + 1). 앞머리 기준 줄 n 은 파일 줄 startLine + n - 1 */
  startLine: number;
}

/** 앞머리를 찾으면 FrontMatter, 없으면 null. */
export function extractFrontMatter(text: string): FrontMatter | null {
  // BOM 제거 — 줄·열 번호에는 영향이 없다(BOM 은 첫 줄 맨 앞 한 글자뿐이라 `---` 줄에만 붙는다)
  const body = text.startsWith("﻿") ? text.slice(1) : text;
  // CRLF·LF 모두 줄로 나누고 각 줄 끝 CR 을 지운다
  const lines = body.split("\n").map((l) => (l.endsWith("\r") ? l.slice(0, -1) : l));

  // 앞쪽 빈 줄(공백만 있는 줄 포함)은 건너뛴다
  let i = 0;
  while (i < lines.length && lines[i]!.trim() === "") i++;
  if (i >= lines.length || !isFence(lines[i]!)) return null;
  const open = i;

  // 닫는 `---` 를 찾는다. 없으면 앞머리가 아닌 것으로 본다(허브·huggingface_hub 와 같음)
  for (let j = open + 1; j < lines.length; j++) {
    if (isFence(lines[j]!)) {
      return {
        yaml: lines.slice(open + 1, j).join("\n"),
        openLine: open + 1,
        startLine: open + 2,
      };
    }
  }
  return null;
}

function isFence(line: string): boolean {
  return /^---[ \t]*$/.test(line);
}

/** YAML 이 비었거나 주석뿐인지(허브는 이 경우 "empty or missing yaml metadata" 경고를 낸다). */
export function isBlankYaml(yaml: string): boolean {
  return yaml.split("\n").every((l) => {
    const t = l.trim();
    return t === "" || t.startsWith("#");
  });
}
