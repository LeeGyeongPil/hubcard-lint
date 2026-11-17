# hubcard-lint 규칙

[English](rules.md)

등급:

- **error** — 실제로 시험했을 때 허브가 이 문제로 push 를 거절했다(2026-11-17, 공개 `/api/validate-yaml` 에 더미 카드를 보내 관찰). 진단의 `hub` 필드에 허브 원문을 그대로 담는다.
- **warning** — 허브는 카드를 받지만 `YAML Metadata Warning` 을 단다.
- **lint** — 허브는 받지만 공개 문서와 다르거나, 필터·코드 조각·Space 빌드에서 빠진다. `--strict` 가 아니면 실패로 치지 않는다.

허브 서버 스키마 원본은 공개되어 있지 않다. *허브 응답* 표시 규칙은 실제 응답으로 확인했고, 나머지는 공개 문서나 `@huggingface/tasks` 패키지 기준이다. 설치된 버전의 같은 표는 `hubcard-lint --list-rules --lang ko` 로 볼 수 있다.

## 모든 카드 종류

| 규칙 | 등급 | 잡는 것 | 근거 |
|---|---|---|---|
| `front-matter/missing` | warning | 맨 위에 `--- … ---` YAML 블록이 없거나 비었다. 허브: `empty or missing yaml metadata in repo card` | 허브 응답 2026-11-17 |
| `yaml/syntax` | error | YAML 문법 오류. 허브와 같은 문구·`(줄:열)`(`Invalid YAML in README.md: bad indentation of a sequence entry (4:15)`). 허브는 블록 안 첫 줄부터 세고, hubcard-lint 는 파일 줄도 함께 알려 준다 | 허브 응답 2026-11-17 |
| `yaml/duplicate-key` | error | 같은 키가 두 번(`duplicated mapping key (2:1)`) | 허브 응답 2026-11-17 |
| `yaml/not-mapping` | lint | 블록이 `키: 값` 맵이 아니라 목록이나 값 하나 | [모델 카드](https://huggingface.co/docs/hub/model-cards) |
| `yaml/seq-merged-scalar` | lint | `- a` 다음 줄에 더 들여 쓴 `- b` 는 YAML 오류가 아니라 문자열 `"a - b"` 하나로 조용히 합쳐진다 | YAML 동작(js-yaml, yaml) |
| `license/unknown` | error | `license` 가 허브 라이선스 표의 식별자가 아니다(`Apache 2.0` → `apache-2.0`) | 허브 응답 2026-11-17, [라이선스](https://huggingface.co/docs/hub/repositories-licenses) |
| `license/other-needs-name` | lint | `license: other` 인데 `license_name` 이 없다 | [라이선스](https://huggingface.co/docs/hub/repositories-licenses) |
| `language/too-long` | error | `language` 항목이 3글자보다 길다(`english` → `en`). 모델·데이터셋 카드 | 허브 응답 2026-11-17 |
| `tags/not-string` | lint | `tags` 항목이 문자열이 아니다(`- 42`, `- null`) | [모델 카드](https://huggingface.co/docs/hub/model-cards) |

## 모델 카드

| 규칙 | 등급 | 잡는 것 | 근거 |
|---|---|---|---|
| `pipeline_tag/unknown` | warning | `pipeline_tag` 가 공식 태스크 목록(57개)에 없다 | 허브 응답 2026-11-17, `@huggingface/tasks` |
| `library_name/unknown` | lint | `library_name` 이 알려진 라이브러리 296개에 없다. 코드 조각·라이브러리 필터가 빠진다 | `@huggingface/tasks` |
| `library_name/missing` | lint | `library_name` 이 없다. 새 저장소는 허브가 추정하지 않는다 | [모델 카드](https://huggingface.co/docs/hub/model-cards) |
| `datasets/not-string` | error | `datasets` 항목이 문자열이 아니다. 일부 학습기가 쓰는 `- null` 같은 것 | 허브 응답 2026-11-17 |
| `base_model/format` | error | `base_model` 항목이 모델 id(`조직/이름` 또는 `이름`)가 아니다 | 허브 응답 2026-11-17 |
| `base_model_relation/enum` | error | `base_model_relation` 이 `adapter`·`merge`·`quantized`·`finetune` 이 아니다 | 허브 응답 2026-11-17 |
| `model-index/required` | error | `model-index` 결과에 `task.type`·`dataset.type`·`metrics[].type`·`metrics[].value` 가 없다. 허브와 같은 점 경로로 알려 준다 | 허브 응답 2026-11-17 |

## 데이터셋 카드

| 규칙 | 등급 | 잡는 것 | 근거 |
|---|---|---|---|
| `task_categories/unknown` | warning | `task_categories` 항목이 공식 태스크 목록에 없다 | 허브 응답 2026-11-17 |
| `task_ids/unknown` | lint | `task_ids` 항목이 알려진 서브태스크 75개에 없다 | `@huggingface/tasks` |
| `size_categories/format` | lint | `size_categories` 항목이 허브 크기 구간(`n<1K`, `1K<n<10K`, … `n>1T`)이 아니다 | [데이터셋 카드](https://huggingface.co/docs/hub/datasets-cards) |
| `configs/data-files-missing` | lint | `configs` 항목에 `data_files` 도 `data_dir` 도 없다 | [데이터셋 카드](https://huggingface.co/docs/hub/datasets-cards) |

## Space 카드

| 규칙 | 등급 | 잡는 것 | 근거 |
|---|---|---|---|
| `space/color` | error | `colorFrom`/`colorTo` 가 red, yellow, green, blue, indigo, purple, pink, gray 가 아니다(`grey` → `gray`) | 허브 응답 2026-11-17 |
| `space/app_port` | error | `app_port` 가 숫자가 아니다(따옴표로 감싼 `"7860"` 은 문자열) | 허브 응답 2026-11-17 |
| `space/suggested_hardware` | error | `suggested_hardware` 가 허브가 받는 하드웨어가 아니다. 허브 목록(29개)은 문서보다 길다 | 허브 응답 2026-11-17 |
| `space/sdk` | lint | `sdk` 가 없거나 `gradio`·`docker`·`static` 이 아니다(시험해 보니 허브가 `streamlit` 을 받아서 error 로 두지 않는다) | [Space 설정](https://huggingface.co/docs/hub/spaces-config-reference) |
| `space/sdk-version-missing` | lint | `sdk: gradio` 인데 `sdk_version` 이 없다 | [Space 설정](https://huggingface.co/docs/hub/spaces-config-reference) |

## 카드 종류 판정

`--type auto`(기본)는 Space 설정 키(`sdk`, `sdk_version`, `app_file`, `app_port`, `colorFrom`, `colorTo`, `suggested_hardware`, `python_version`, `pinned`, `emoji`)가 하나라도 있으면 **space**, 데이터셋 키(`task_categories`, `task_ids`, `size_categories`, `configs`, `dataset_info`, `pretty_name`, `annotations_creators`, `language_creators`, `multilinguality`, `source_datasets`)가 있으면 **dataset**, 그 밖은 **model** 로 본다. `--type model|dataset|space` 로 바꿀 수 있다.

## 보지 않는 것(네트워크나 저장소 전체가 필요)

- 모델·데이터셋 id 가 허브에 실제로 있는지
- 저장소에 `app_file`·`LICENSE` 파일이 있는지
- 카드 본문(마크다운)과 새 `.eval_results/*.yaml` 형식
