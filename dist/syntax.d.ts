export type SyntaxResult = {
    ok: true;
    data: unknown;
} | {
    ok: false;
    /** 중복 키는 따로 규칙 id 를 준다 */
    kind: "duplicate-key" | "syntax";
    reason: string;
    /** 앞머리 기준 줄·열(1부터). 위치가 없는 오류면 null */
    line: number | null;
    column: number | null;
    /** 허브 원문 첫 줄 */
    hub: string;
};
export declare function checkSyntax(yaml: string): SyntaxResult;
