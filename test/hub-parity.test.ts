// AC-2 허브 동등성: 조사 때(2026-11-17) 허브가 같은 카드에 돌려준 응답 기록과 비교한다. 네트워크는 쓰지 않는다.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { lintCard } from "../src/index.js";
import type { CardType } from "../src/types.js";
import { fixture } from "./helpers.js";

interface Observed {
  card: string;
  repoType: CardType;
  status: number;
  errors: string[];
  warnings: { text: string; truncated: boolean }[];
}

const record = JSON.parse(
  readFileSync(fileURLToPath(new URL("./fixtures/hub-observed-2026-11-17.json", import.meta.url)), "utf8"),
) as { observed: string; cards: Observed[] };

describe("hub parity (recorded 2026-11-17)", () => {
  it("covers the 13 observed cards", () => {
    expect(record.cards.map((c) => c.card).sort()).toEqual(
      [
        "bad_indent2.md", "bad_model_index.md", "bad_values.md", "bom.md", "crlf.md", "dataset_bad.md", "dup_key.md",
        "good.md", "leading_blank.md", "no_front.md", "other_no_name.md", "space_bad.md", "space_no_version.md",
      ].sort(),
    );
  });

  for (const obs of record.cards) {
    describe(`${obs.card} [${obs.repoType}] → ${obs.status}`, () => {
      // 허브와 같은 repoType 으로 검사(옵션) — 그리고 auto 판정도 같은 결과를 내는지 함께 본다
      const byOption = lintCard(fixture(obs.card), { type: obs.repoType, file: obs.card });
      const byAuto = lintCard(fixture(obs.card), { file: obs.card });

      it("auto detection picks the same card type", () => {
        expect(byAuto.type).toBe(obs.repoType);
      });

      it(obs.status === 400 ? "error hub strings equal the recorded Hub errors" : "has no errors (Hub accepted it)", () => {
        const errors = byOption.diagnostics.filter((d) => d.severity === "error");
        if (obs.status === 200) {
          expect(errors).toEqual([]);
        } else {
          expect(errors.map((d) => d.hub).sort()).toEqual([...obs.errors].sort());
        }
      });

      it("reports every Hub warning as a warning with the same wording", () => {
        const warnings = byOption.diagnostics.filter((d) => d.severity === "warning");
        expect(warnings).toHaveLength(obs.warnings.length);
        for (const w of obs.warnings) {
          const match = warnings.find((d) => (w.truncated ? d.hub?.startsWith(w.text) : d.hub === w.text));
          expect(match, `warning not reproduced: ${w.text.slice(0, 60)}`).toBeDefined();
        }
      });
    });
  }

  it("never reports Hub-unobserved lint findings as errors on Hub-accepted cards", () => {
    for (const obs of record.cards.filter((c) => c.status === 200)) {
      const r = lintCard(fixture(obs.card), { type: obs.repoType });
      expect(r.counts.error, obs.card).toBe(0);
    }
  });
});
