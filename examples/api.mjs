// Library example: lint a card string from your own card-generation script.
// Run after `npm install` (which builds dist/):  node examples/api.mjs
import { lintCard, formatText } from "hubcard-lint";

const card = `---
license: Apache 2.0
library_name: transformers
pipeline_tag: text-generation
---
# my-model
`;

const result = lintCard(card, { type: "model", file: "generated/README.md" });

// Machine-readable: one compact JSON line per diagnostic
for (const d of result.diagnostics) {
  console.log(JSON.stringify({ rule: d.rule, severity: d.severity, line: d.line, column: d.column, suggestion: d.suggestion }));
}

// Human-readable: the same text the CLI prints
process.stdout.write(formatText([result], { lang: "en" }));

// Fail the generation step if the Hub would reject the card
if (result.counts.error > 0) console.log(`errors: ${result.counts.error}`);
