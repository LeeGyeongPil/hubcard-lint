// 값 위치 찾기. 값 자체는 js-yaml 결과(허브가 보는 값)를 쓰고, 줄:열만 `yaml` 패키지 AST 에서 얻는다.
// 두 파서는 문법 오류 위치를 서로 다르게 보고하므로(조사 프로브) 역할을 나눈다:
//   문법 오류 문구·위치 = js-yaml(syntax.ts), 값 위치 = yaml AST(여기).
import { LineCounter, isMap, isPair, isScalar, isSeq, parseDocument, visit } from "yaml";
export class Locator {
    yaml;
    startLine;
    openLine;
    doc;
    lc = new LineCounter();
    /**
     * @param yaml 앞머리 YAML 본문
     * @param startLine YAML 첫 줄의 파일 줄 번호
     * @param openLine 여는 `---` 의 파일 줄 번호(위치를 못 찾을 때 쓰는 자리)
     */
    constructor(yaml, startLine, openLine) {
        this.yaml = yaml;
        this.startLine = startLine;
        this.openLine = openLine;
        // 문법은 이미 js-yaml 이 통과시켰다. 두 파서가 드물게 다르게 판단해도 위치 조회만 하므로 오류는 무시한다
        this.doc = parseDocument(yaml, { lineCounter: this.lc, uniqueKeys: false });
    }
    /** 경로의 값 위치. 경로 끝까지 못 가면 가장 깊이 찾은 노드, 아무것도 없으면 여는 `---` 줄. */
    at(path) {
        let node = this.doc.contents;
        let found = null;
        for (const key of path) {
            if (isMap(node)) {
                const pair = node.items.find((p) => isScalar(p.key) && String(p.key.value) === String(key));
                if (!pair)
                    break;
                // `key:` 처럼 값이 비면 값 노드가 없거나 범위가 없다 → 키 위치를 쓴다
                const value = pair.value;
                if (value && value.range) {
                    found = value;
                    node = value;
                }
                else {
                    if (isScalar(pair.key))
                        found = pair.key;
                    break;
                }
            }
            else if (isSeq(node) && typeof key === "number") {
                const item = node.items[key];
                if (!item || !item.range)
                    break;
                found = item;
                node = item;
            }
            else {
                break;
            }
        }
        return found?.range ? this.pos(found.range[0]) : { line: this.openLine, column: 1 };
    }
    /** 맨 위 키의 키 위치(키가 없으면 여는 `---` 줄). */
    keyAt(key) {
        const top = this.doc.contents;
        if (isMap(top)) {
            const pair = top.items.find((p) => isScalar(p.key) && String(p.key.value) === key);
            if (pair && isScalar(pair.key) && pair.key.range)
                return this.pos(pair.key.range[0]);
        }
        return { line: this.openLine, column: 1 };
    }
    /**
     * 목록 항목 안에 `- b` 가 들여쓰기 때문에 이어 붙은 일반 스칼라를 찾는다.
     *   tags:
     *    - a
     *     - b        ← 오류가 아니라 값 "a - b" 한 개로 합쳐진다(조사 프로브 bad_indent)
     */
    mergedScalars() {
        const out = [];
        visit(this.doc, {
            Scalar: (_key, node, ancestors) => {
                const parent = ancestors[ancestors.length - 1];
                if (!isSeq(parent) || node.type !== "PLAIN" || !node.range)
                    return;
                const source = this.yaml.slice(node.range[0], node.range[1]);
                if (!/\n[ \t]*-[ \t]/.test(source))
                    return;
                out.push({ path: this.pathOf(ancestors, node), value: String(node.value), pos: this.pos(node.range[0]) });
            },
        });
        return out;
    }
    pathOf(ancestors, node) {
        const path = [];
        for (let i = 0; i < ancestors.length; i++) {
            const anc = ancestors[i];
            const next = ancestors[i + 1] ?? node;
            if (isPair(anc) && isScalar(anc.key))
                path.push(String(anc.key.value));
            else if (isSeq(anc))
                path.push(anc.items.indexOf(next));
        }
        return path;
    }
    /** YAML 안 오프셋 → 파일 기준 줄:열 */
    pos(offset) {
        const p = this.lc.linePos(offset);
        return { line: this.startLine + p.line - 1, column: p.col };
    }
}
