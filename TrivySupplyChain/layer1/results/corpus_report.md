# Layer 1 corpus analysis - results

- Workflows analyzed: **189** (parse errors: 0)
- External action references: **1517**

## Headline calibration parameter

- **Floating-tag fraction f = 0.3698 (37.0% of action refs are unpinned tags)**
- SHA-pinned fraction = 63.0%
- pin counts: {'floating': 561, 'sha_pinned': 956, 'local': 149, 'docker': 4}

## Compromise-relevant frequencies

| Property | Value |
|---|---|
| pull_request_target used | 11.6% of workflows |
| workflow_run used | 3.7% |
| self-hosted runner | 14.8% |
| references secrets | 50.3% |
| permissions distribution | {'granular_read': 55, 'unspecified': 49, 'granular_write': 28, 'none': 56, 'read-all': 1} |

## Construct coverage

- **Coverage = 88.2%** of compromise-relevant construct-instances are within the modeled set.
- matrix strategies: 23.8% | reusable calls: 9.0% | artifact flows: 27.0% (unmodeled; argued independent of the tag-mutation -> exfil property).
- construct instances: {'artifact_flow': 51, 'external_action_use': 186, 'matrix_strategy': 45, 'runner_execution': 189, 'secret_in_env': 95, 'tag_vs_sha_pin': 186, 'trigger_causes_run': 189, 'reusable_workflow_call': 17}
