import type { Locator, PathKey, Position } from "../ast.js";
import type { CardType, Severity } from "../types.js";
export interface Snapshot {
    checked: string;
    tasksVersion: string;
    sources: Record<string, string>;
    licenses: string[];
    baseModelRelations: string[];
    spaceColors: string[];
    spaceSdks: string[];
    suggestedHardware: string[];
    sizeCategories: string[];
    pipelineTypes: string[];
    subtaskTypes: string[];
    modelLibraries: string[];
}
export declare const SNAPSHOT: Snapshot;
/** 스냅샷 출처 버전·확인 날짜(`--version` 에 표시) */
export declare const SNAPSHOT_INFO: Readonly<{
    tasksVersion: string;
    checked: string;
}>;
export type RuleBasis = "hub-observed" | "docs" | "package";
export interface RuleInfo {
    id: string;
    severity: Severity;
    types: readonly CardType[];
    /** 등급의 근거 */
    basis: RuleBasis;
    /** 근거 URL */
    source: string;
    /** 허브 응답에서 관찰한 날짜(관찰한 규칙만) */
    observed?: string;
}
export declare const RULES: readonly RuleInfo[];
export declare const RULES_BY_ID: ReadonlyMap<string, RuleInfo>;
/** 규칙 함수가 진단을 보고할 때 넘기는 값 */
export interface Report {
    rule: string;
    /** 진단 경로(허브 문구의 점 경로와 같게) */
    path: PathKey[];
    /** 기본은 rule 과 같은 메시지 */
    messageId?: string;
    params?: Record<string, string>;
    hub?: string;
    suggestion?: string;
    /** 위치를 직접 줄 때(기본은 path 의 값 위치) */
    pos?: Position;
}
export interface RuleContext {
    /** js-yaml 이 읽은 앞머리 값(허브가 보는 값) */
    data: Record<string, unknown>;
    type: CardType;
    loc: Locator;
    report(r: Report): void;
}
/** 허브는 스칼라 하나도 목록 한 칸으로 본다(`language: english` → "language.0"). */
export declare function asList(value: unknown): unknown[];
/** 메시지에 넣을 값 설명: null, "7860", 42, list, mapping */
export declare function describe(value: unknown): string;
/** 메시지·허브 문구에 그대로 넣을 문자열(목록·맵은 JSON) */
export declare function text(value: unknown): string;
