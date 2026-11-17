// 공개 타입과 예외. 라이브러리 사용자와 CLI 가 같은 모양을 쓴다.

/** 카드 종류. 허브 저장소 종류(repoType)와 같다. */
export type CardType = "model" | "dataset" | "space";

/**
 * 진단 등급.
 * - error: 허브가 push 를 거절하는 것으로 관찰된 규칙
 * - warning: 허브가 받기는 하지만 경고(YAML Metadata Warning)를 다는 것
 * - lint: 허브는 받지만 공개 문서상 틀렸거나 필터·실행에서 문제가 되는 것
 */
export type Severity = "error" | "warning" | "lint";

export type Lang = "en" | "ko";

export interface Diagnostic {
  /** 규칙 id, 예: "license/unknown" */
  rule: string;
  severity: Severity;
  /** 파일 기준 줄(1부터, 앞머리 `---` 줄 포함) */
  line: number;
  /** 파일 기준 열(1부터) */
  column: number;
  /** 허브 문구와 같은 점 경로, 예: "model-index.0.results.0.task.type". 경로가 없는 진단은 "" */
  path: string;
  /** 메시지 사전 키(언어와 무관) */
  messageId: string;
  /** 메시지 자리 채움 값 */
  params: Record<string, string>;
  /** 고른 언어로 만든 설명 */
  message: string;
  /** 허브가 같은 카드에 내는 원문(영어). 허브 문구를 관찰한 규칙에만 있다 */
  hub?: string;
  /** 가까운 올바른 값 */
  suggestion?: string;
}

export interface Counts {
  error: number;
  warning: number;
  lint: number;
}

export interface LintResult {
  file: string;
  type: CardType;
  /** 카드 종류를 옵션으로 받았는지(option), 키를 보고 추정했는지(auto) */
  detectedBy: "option" | "auto";
  diagnostics: Diagnostic[];
  counts: Counts;
}

export interface LintOptions {
  type?: CardType | "auto";
  /** 진단에 붙일 파일 이름(표시용) */
  file?: string;
  /** message 를 만들 언어(기본 en) */
  lang?: Lang;
}

/** 라이브러리 사용 오류. 카드 내용 문제는 예외가 아니라 진단으로 돌려준다. */
export class HubcardLintError extends Error {
  readonly code: "E_BAD_OPTION" | "E_READ";
  constructor(code: "E_BAD_OPTION" | "E_READ", message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "HubcardLintError";
    this.code = code;
  }
}
