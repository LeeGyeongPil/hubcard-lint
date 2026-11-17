---
license: other
library_name: transformers
model-index:
- name: tiny-classifier
  results:
  - task:
      name: Text Classification
    dataset:
      name: Example Reviews
    metrics:
    - name: Accuracy
---

# tiny-classifier (example card with an incomplete model-index)

The evaluation results above miss the fields the Hub requires
(`task.type`, `dataset.type`, `metrics[].type`, `metrics[].value`),
and `license: other` has no `license_name`.
