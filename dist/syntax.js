// YAML 문법 검사. 허브 push 오류의 문법 문구는 js-yaml 계열이라 js-yaml 로 같은 문장을 만든다.
// 예) 허브: Invalid YAML in README.md: bad indentation of a sequence entry (4:15)
// 허브의 (줄:열) 은 앞머리 기준이다(파일 줄보다 1 작다) → 문구는 그대로 두고, 진단 위치만 파일 기준으로 바꾼다.
import * as jsyaml from "js-yaml"; // 5.x 는 default export 가 없다(import jsyaml from … 은 SyntaxError)
export function checkSyntax(yaml) {
    try {
        return { ok: true, data: jsyaml.load(yaml) };
    }
    catch (err) {
        if (!(err instanceof jsyaml.YAMLException))
            throw err;
        const reason = err.reason || err.message;
        const mark = err.mark;
        const line = mark ? mark.line + 1 : null;
        const column = mark ? mark.column + 1 : null;
        const where = line !== null && column !== null ? ` (${line}:${column})` : "";
        return {
            ok: false,
            kind: reason === "duplicated mapping key" ? "duplicate-key" : "syntax",
            reason,
            line,
            column,
            hub: `Invalid YAML in README.md: ${reason}${where}`,
        };
    }
}
