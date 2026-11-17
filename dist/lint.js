// 카드 하나 검사 흐름: 앞머리 추출 → 문법(js-yaml) → 위치(yaml AST) → 종류 판정 → 규칙 → 진단
import { readFile } from "node:fs/promises";
import { Locator } from "./ast.js";
import { detectType, isRecord } from "./detect.js";
import { extractFrontMatter, isBlankYaml } from "./frontmatter.js";
import { t } from "./i18n.js";
import { checkCommon } from "./rules/common.js";
import { checkDataset } from "./rules/dataset.js";
import { RULES_BY_ID } from "./rules/index.js";
import { checkModel } from "./rules/model.js";
import { checkSpace } from "./rules/space.js";
import { checkSyntax } from "./syntax.js";
import { HubcardLintError } from "./types.js";
const TYPES = ["auto", "model", "dataset", "space"];
/** 문자열 카드 하나를 검사한다. 카드 내용 문제는 예외가 아니라 진단으로 돌려준다. */
export function lintCard(text, options = {}) {
    const requested = options.type ?? "auto";
    if (!TYPES.includes(requested)) {
        throw new HubcardLintError("E_BAD_OPTION", `invalid type option "${String(requested)}" (expected one of: ${TYPES.join(", ")})`);
    }
    const lang = options.lang === "ko" ? "ko" : "en";
    const file = options.file ?? "README.md";
    const diagnostics = [];
    const add = (d) => {
        // JSON 출력에서 읽기 좋은 순서로 필드를 놓는다(등급은 규칙 표에서)
        const out = {
            rule: d.rule,
            severity: RULES_BY_ID.get(d.rule).severity,
            line: d.line,
            column: d.column,
            path: d.path,
            message: t(lang, `msg.${d.messageId}`, d.params),
            messageId: d.messageId,
            params: d.params,
        };
        if (d.hub !== undefined)
            out.hub = d.hub;
        if (d.suggestion !== undefined)
            out.suggestion = d.suggestion;
        diagnostics.push(out);
    };
    // 옵션으로 종류를 받았으면 그대로, 아니면 키를 보고 정한다(앞머리가 없거나 깨지면 model)
    const fixedType = requested === "auto" ? null : requested;
    const finish = (type) => result(file, type, fixedType ? "option" : "auto", diagnostics);
    // 1) 앞머리 — 없거나 비면 허브와 같은 경고 하나
    const fm = extractFrontMatter(text);
    if (!fm || isBlankYaml(fm.yaml)) {
        add({
            rule: "front-matter/missing",
            messageId: "front-matter/missing",
            params: {},
            line: fm ? fm.openLine : 1,
            column: 1,
            path: "",
            hub: "empty or missing yaml metadata in repo card",
        });
        return finish(fixedType ?? "model");
    }
    // 2) 문법 — 허브와 같은 문구(앞머리 기준 줄:열)를 hub 에, 진단 위치는 파일 기준으로
    const syntax = checkSyntax(fm.yaml);
    if (!syntax.ok) {
        const rule = syntax.kind === "duplicate-key" ? "yaml/duplicate-key" : "yaml/syntax";
        add({
            rule,
            messageId: rule,
            params: { reason: syntax.reason, fmLine: String(syntax.line ?? "?"), fmColumn: String(syntax.column ?? "?") },
            line: syntax.line !== null ? fm.startLine + syntax.line - 1 : fm.openLine,
            column: syntax.column ?? 1,
            path: "",
            hub: syntax.hub,
        });
        return finish(fixedType ?? "model");
    }
    // 3) 위치 조회기와 종류 판정
    const loc = new Locator(fm.yaml, fm.startLine, fm.openLine);
    const type = fixedType ?? detectType(syntax.data);
    if (!isRecord(syntax.data)) {
        add({ rule: "yaml/not-mapping", messageId: "yaml/not-mapping", params: {}, line: fm.startLine, column: 1, path: "" });
        return finish(type);
    }
    // 4) 규칙 — 공통 + 종류별
    const ctx = {
        data: syntax.data,
        type,
        loc,
        report(r) {
            const pos = r.pos ?? loc.at(r.path);
            const d = {
                rule: r.rule,
                messageId: r.messageId ?? r.rule,
                params: r.params ?? {},
                line: pos.line,
                column: pos.column,
                path: dotted(r.path),
            };
            if (r.hub !== undefined)
                d.hub = r.hub;
            if (r.suggestion !== undefined)
                d.suggestion = r.suggestion;
            add(d);
        },
    };
    checkCommon(ctx);
    if (type === "model")
        checkModel(ctx);
    if (type === "dataset")
        checkDataset(ctx);
    if (type === "space")
        checkSpace(ctx);
    // 파일 위치 순서로 정렬(같은 위치는 규칙 id 순)
    diagnostics.sort((a, b) => a.line - b.line || a.column - b.column || a.rule.localeCompare(b.rule));
    return finish(type);
}
/** 파일 하나를 읽어 검사한다. 읽기 실패는 HubcardLintError(E_READ). */
export async function lintFile(path, options = {}) {
    let text;
    try {
        text = await readFile(path, "utf8");
    }
    catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        throw new HubcardLintError("E_READ", `cannot read ${path}: ${reason}`, { cause: err });
    }
    return lintCard(text, { ...options, file: options.file ?? path });
}
function result(file, type, detectedBy, diagnostics) {
    const counts = { error: 0, warning: 0, lint: 0 };
    for (const d of diagnostics)
        counts[d.severity]++;
    return { file, type, detectedBy, diagnostics, counts };
}
function dotted(path) {
    return path.map(String).join(".");
}
