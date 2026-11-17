// 모든 카드 종류에 쓰는 규칙: license · language · tags · 목록 항목 합침
import { suggest } from "../suggest.js";
import { SNAPSHOT, asList, text } from "./index.js";
const LICENSES = new Set(SNAPSHOT.licenses);
// 허브 원문(2026-11-17 관찰)
const HUB_LICENSE = '"license" must be a license identifier from https://huggingface.co/docs/hub/repositories-licenses, or "other" with a LICENSE file';
export function checkCommon(ctx) {
    checkLicense(ctx);
    if (ctx.type !== "space")
        checkLanguage(ctx);
    checkTags(ctx);
    checkMergedScalars(ctx);
}
function checkLicense({ data, report }) {
    const value = data.license;
    if (value === undefined)
        return;
    if (Array.isArray(value)) {
        // 데이터셋 카드는 목록으로 쓰는 일이 많다 — 항목마다 본다(목록 형태의 허브 문구는 관찰하지 못해 hub 없음)
        value.forEach((item, i) => {
            if (typeof item === "string" && LICENSES.has(item))
                return;
            report({ rule: "license/unknown", path: ["license", i], params: { value: text(item) }, suggestion: suggest(item, SNAPSHOT.licenses) });
        });
    }
    else if (typeof value !== "string" || !LICENSES.has(value)) {
        report({ rule: "license/unknown", path: ["license"], params: { value: text(value) }, hub: HUB_LICENSE, suggestion: suggest(value, SNAPSHOT.licenses) });
    }
    // license: other 인데 이름이 없으면 허브는 받지만 페이지·필터에 라이선스 이름이 안 보인다
    const hasOther = asList(value).includes("other");
    if (hasOther && (data.license_name === undefined || data.license_name === null || data.license_name === "")) {
        report({ rule: "license/other-needs-name", path: ["license"] });
    }
}
function checkLanguage({ data, report }) {
    if (data.language === undefined || data.language === null)
        return;
    asList(data.language).forEach((item, i) => {
        if (typeof item !== "string" || item.length <= 3)
            return;
        const path = `language.${i}`;
        report({
            rule: "language/too-long",
            path: ["language", i],
            params: { path, value: item },
            hub: `"${path}" length must be less than or equal to 3 characters long`,
        });
    });
}
function checkTags({ data, report }) {
    if (!Array.isArray(data.tags))
        return;
    data.tags.forEach((item, i) => {
        if (typeof item !== "string")
            report({ rule: "tags/not-string", path: ["tags", i], params: { path: `tags.${i}` } });
    });
}
function checkMergedScalars({ loc, report }) {
    for (const m of loc.mergedScalars()) {
        report({ rule: "yaml/seq-merged-scalar", path: m.path, pos: m.pos, params: { value: m.value } });
    }
}
