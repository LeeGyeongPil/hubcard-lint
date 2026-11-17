export interface FrontMatter {
    /** 앞머리 YAML 본문(줄 끝은 \n 으로 통일, CR 제거) */
    yaml: string;
    /** 여는 `---` 의 파일 줄 번호(1부터) */
    openLine: number;
    /** YAML 첫 줄의 파일 줄 번호(= openLine + 1). 앞머리 기준 줄 n 은 파일 줄 startLine + n - 1 */
    startLine: number;
}
/** 앞머리를 찾으면 FrontMatter, 없으면 null. */
export declare function extractFrontMatter(text: string): FrontMatter | null;
/** YAML 이 비었거나 주석뿐인지(허브는 이 경우 "empty or missing yaml metadata" 경고를 낸다). */
export declare function isBlankYaml(yaml: string): boolean;
