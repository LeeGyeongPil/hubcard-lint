# hubcard-lint rules

[한국어](rules.ko.md)

Levels:

- **error** — the Hub rejected a push with this problem when we tried it (observed 2026-11-17 on the public `/api/validate-yaml` endpoint with dummy cards). The `hub` field quotes the Hub's own message.
- **warning** — the Hub accepts the card but shows a `YAML Metadata Warning`.
- **lint** — the Hub accepts the card, but it contradicts the public docs or drops the repo from filters, snippets or Space builds. Never fails a run unless you pass `--strict`.

The Hub's server-side schema is not public. Rules marked *Hub response* were checked against real responses; the rest come from the public docs or from the `@huggingface/tasks` package. Run `hubcard-lint --list-rules` for the same table from the installed version.

## All card types

| Rule | Level | What it catches | Basis |
|---|---|---|---|
| `front-matter/missing` | warning | No `--- … ---` YAML block at the top, or an empty one. Hub: `empty or missing yaml metadata in repo card` | Hub response 2026-11-17 |
| `yaml/syntax` | error | YAML syntax error. Same wording and `(line:col)` as the Hub (`Invalid YAML in README.md: bad indentation of a sequence entry (4:15)`); the Hub counts lines from the first line inside the block, hubcard-lint reports the file line too | Hub response 2026-11-17 |
| `yaml/duplicate-key` | error | The same key twice (`duplicated mapping key (2:1)`) | Hub response 2026-11-17 |
| `yaml/not-mapping` | lint | The block is a list or a single value instead of `key: value` pairs | [model cards](https://huggingface.co/docs/hub/model-cards) |
| `yaml/seq-merged-scalar` | lint | `- a` followed by a more indented `- b` is not an error in YAML: it silently becomes one string `"a - b"` | YAML behaviour (js-yaml, yaml) |
| `license/unknown` | error | `license` is not an identifier from the Hub license table (`Apache 2.0` → `apache-2.0`) | Hub response 2026-11-17, [licenses](https://huggingface.co/docs/hub/repositories-licenses) |
| `license/other-needs-name` | lint | `license: other` without `license_name` | [licenses](https://huggingface.co/docs/hub/repositories-licenses) |
| `language/too-long` | error | A `language` entry longer than 3 characters (`english` → use `en`). Model and dataset cards | Hub response 2026-11-17 |
| `tags/not-string` | lint | A `tags` entry that is not a string (`- 42`, `- null`) | [model cards](https://huggingface.co/docs/hub/model-cards) |

## Model cards

| Rule | Level | What it catches | Basis |
|---|---|---|---|
| `pipeline_tag/unknown` | warning | `pipeline_tag` is not in the official task list (57 tasks) | Hub response 2026-11-17, `@huggingface/tasks` |
| `library_name/unknown` | lint | `library_name` is not one of the 296 known libraries; no code snippet or library filter | `@huggingface/tasks` |
| `library_name/missing` | lint | No `library_name`; the Hub does not infer it for newer repos | [model cards](https://huggingface.co/docs/hub/model-cards) |
| `datasets/not-string` | error | A `datasets` entry that is not a string, such as the `- null` some trainers write | Hub response 2026-11-17 |
| `base_model/format` | error | A `base_model` entry that is not a model id (`org/name` or `name`) | Hub response 2026-11-17 |
| `base_model_relation/enum` | error | `base_model_relation` not one of `adapter`, `merge`, `quantized`, `finetune` | Hub response 2026-11-17 |
| `model-index/required` | error | Missing `task.type`, `dataset.type`, `metrics[].type` or `metrics[].value` in `model-index` results, reported with the Hub's dotted path | Hub response 2026-11-17 |

## Dataset cards

| Rule | Level | What it catches | Basis |
|---|---|---|---|
| `task_categories/unknown` | warning | A `task_categories` entry not in the official task list | Hub response 2026-11-17 |
| `task_ids/unknown` | lint | A `task_ids` entry not in the 75 known sub-tasks | `@huggingface/tasks` |
| `size_categories/format` | lint | A `size_categories` entry that is not a Hub size bucket (`n<1K`, `1K<n<10K`, … `n>1T`) | [dataset cards](https://huggingface.co/docs/hub/datasets-cards) |
| `configs/data-files-missing` | lint | A `configs` entry with neither `data_files` nor `data_dir` | [dataset cards](https://huggingface.co/docs/hub/datasets-cards) |

## Space cards

| Rule | Level | What it catches | Basis |
|---|---|---|---|
| `space/color` | error | `colorFrom`/`colorTo` not one of red, yellow, green, blue, indigo, purple, pink, gray (`grey` → `gray`) | Hub response 2026-11-17 |
| `space/app_port` | error | `app_port` is not a number (a quoted `"7860"` is a string) | Hub response 2026-11-17 |
| `space/suggested_hardware` | error | `suggested_hardware` is not a flavor the Hub accepts. The Hub's list (29 flavors) is longer than the docs | Hub response 2026-11-17 |
| `space/sdk` | lint | `sdk` missing or not `gradio`, `docker`, `static` (the Hub still accepted `streamlit` in our test, so this is not an error) | [Spaces config](https://huggingface.co/docs/hub/spaces-config-reference) |
| `space/sdk-version-missing` | lint | `sdk: gradio` without `sdk_version` | [Spaces config](https://huggingface.co/docs/hub/spaces-config-reference) |

## Card type detection

`--type auto` (default) treats a card as a **space** when it has any Space setting (`sdk`, `sdk_version`, `app_file`, `app_port`, `colorFrom`, `colorTo`, `suggested_hardware`, `python_version`, `pinned`, `emoji`), as a **dataset** when it has dataset keys (`task_categories`, `task_ids`, `size_categories`, `configs`, `dataset_info`, `pretty_name`, `annotations_creators`, `language_creators`, `multilinguality`, `source_datasets`), and as a **model** otherwise. Pass `--type model|dataset|space` to override.

## Not checked (needs the network or the repository)

- Whether a model or dataset id actually exists on the Hub.
- Whether `app_file` or a `LICENSE` file exists in the repo.
- The card body (Markdown) and the new `.eval_results/*.yaml` format.
