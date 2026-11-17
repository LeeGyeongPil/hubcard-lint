import { type LintOptions, type LintResult } from "./types.js";
/** 문자열 카드 하나를 검사한다. 카드 내용 문제는 예외가 아니라 진단으로 돌려준다. */
export declare function lintCard(text: string, options?: LintOptions): LintResult;
/** 파일 하나를 읽어 검사한다. 읽기 실패는 HubcardLintError(E_READ). */
export declare function lintFile(path: string, options?: LintOptions): Promise<LintResult>;
