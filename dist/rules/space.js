// Space 카드 규칙: colorFrom/colorTo · app_port · suggested_hardware · sdk · sdk_version
import { suggest } from "../suggest.js";
import { SNAPSHOT, describe, text } from "./index.js";
const COLORS = new Set(SNAPSHOT.spaceColors);
const HARDWARE = new Set(SNAPSHOT.suggestedHardware);
const SDKS = new Set(SNAPSHOT.spaceSdks);
export function checkSpace({ data, report, loc }) {
    // 썸네일 색 — 허브는 8가지 외에는 거절(2026-11-17 관찰). "grey" 는 "gray" 로 제안
    for (const key of ["colorFrom", "colorTo"]) {
        const value = data[key];
        if (value === undefined || COLORS.has(value))
            continue;
        report({
            rule: "space/color",
            path: [key],
            params: { key, value: text(value) },
            hub: `"${key}" must be one of [${SNAPSHOT.spaceColors.join(", ")}]`,
            suggestion: suggest(value, SNAPSHOT.spaceColors),
        });
    }
    // app_port — 숫자여야 한다. 따옴표로 감싼 "7860" 은 문자열이라 거절된다
    if (data.app_port !== undefined && typeof data.app_port !== "number") {
        const quoted = typeof data.app_port === "string" && /^\d+$/.test(data.app_port);
        report({
            rule: "space/app_port",
            messageId: quoted ? "space/app_port-quoted" : "space/app_port",
            path: ["app_port"],
            params: { got: describe(data.app_port) },
            hub: '"app_port" must be a number',
        });
    }
    // suggested_hardware — 허브가 실제로 받는 목록(문서보다 길다, 관찰한 서버 응답 기준)
    if (data.suggested_hardware !== undefined && !HARDWARE.has(data.suggested_hardware)) {
        report({
            rule: "space/suggested_hardware",
            path: ["suggested_hardware"],
            params: { value: text(data.suggested_hardware) },
            hub: `"suggested_hardware" must be one of [${SNAPSHOT.suggestedHardware.join(", ")}]`,
            suggestion: suggest(data.suggested_hardware, SNAPSHOT.suggestedHardware),
        });
    }
    // sdk — 문서상 gradio·docker·static. 허브는 streamlit 도 받으므로 lint
    if (data.sdk === undefined) {
        report({ rule: "space/sdk", messageId: "space/sdk-missing", path: [], pos: loc.at([]) });
    }
    else if (!SDKS.has(data.sdk)) {
        report({ rule: "space/sdk", path: ["sdk"], params: { value: text(data.sdk) }, suggestion: suggest(data.sdk, SNAPSHOT.spaceSdks) });
    }
    // gradio 인데 sdk_version 이 없으면 빌드 때 어떤 Gradio 가 깔릴지 카드만 봐서는 알 수 없다
    if (data.sdk === "gradio" && (data.sdk_version === undefined || data.sdk_version === null)) {
        report({ rule: "space/sdk-version-missing", path: ["sdk"] });
    }
}
