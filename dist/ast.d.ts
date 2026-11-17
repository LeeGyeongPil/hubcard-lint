export type PathKey = string | number;
export interface Position {
    line: number;
    column: number;
}
export interface MergedScalar {
    path: PathKey[];
    value: string;
    pos: Position;
}
export declare class Locator {
    private readonly yaml;
    private readonly startLine;
    private readonly openLine;
    private readonly doc;
    private readonly lc;
    /**
     * @param yaml 앞머리 YAML 본문
     * @param startLine YAML 첫 줄의 파일 줄 번호
     * @param openLine 여는 `---` 의 파일 줄 번호(위치를 못 찾을 때 쓰는 자리)
     */
    constructor(yaml: string, startLine: number, openLine: number);
    /** 경로의 값 위치. 경로 끝까지 못 가면 가장 깊이 찾은 노드, 아무것도 없으면 여는 `---` 줄. */
    at(path: PathKey[]): Position;
    /** 맨 위 키의 키 위치(키가 없으면 여는 `---` 줄). */
    keyAt(key: string): Position;
    /**
     * 목록 항목 안에 `- b` 가 들여쓰기 때문에 이어 붙은 일반 스칼라를 찾는다.
     *   tags:
     *    - a
     *     - b        ← 오류가 아니라 값 "a - b" 한 개로 합쳐진다(조사 프로브 bad_indent)
     */
    mergedScalars(): MergedScalar[];
    private pathOf;
    /** YAML 안 오프셋 → 파일 기준 줄:열 */
    private pos;
}
