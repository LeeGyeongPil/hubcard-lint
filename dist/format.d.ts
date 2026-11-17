import type { Lang, LintResult } from "./types.js";
export interface FormatOptions {
    lang?: Lang;
    /** error 만 출력 */
    quiet?: boolean;
}
export declare function formatText(results: LintResult[], options?: FormatOptions): string;
export declare function formatJson(results: LintResult[], options?: Pick<FormatOptions, "quiet">): string;
