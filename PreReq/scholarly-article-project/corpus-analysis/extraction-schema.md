# Workflow Feature Extraction Schema

Structured representation of each GitHub Actions workflow, suitable for statistical analysis and coverage assessment.

## Workflow-Level Fields

| Field | Type | Description |
|---|---|---|
| `workflow_id` | string | SHA256 of owner/repo/path |
| `repo_owner` | string | |
| `repo_name` | string | |
| `repo_stars` | int | At time of extraction |
| `primary_language` | string | From GitHub API |
| `file_path` | string | e.g. `.github/workflows/ci.yml` |
| `yaml_valid` | bool | Did parser succeed |
| `extraction_date` | date | |

## Trigger Events

| Field | Type | Description |
|---|---|---|
| `triggers` | list[string] | e.g. `["push", "pull_request"]` |
| `uses_pull_request_target` | bool | Elevated-risk trigger |
| `uses_workflow_run` | bool | Cascading workflows |
| `uses_workflow_dispatch` | bool | Manual |
| `has_schedule` | bool | Cron |
| `schedule_count` | int | Number of cron entries if scheduled |

## Permissions

| Field | Type | Description |
|---|---|---|
| `perm_top_level` | bool | `permissions:` at workflow level |
| `perm_top_level_contents` | string | One of: `read`, `write`, `none`, `unset` |
| `perm_top_level_actions` | string | Same options |
| `perm_top_level_other_writes` | list[string] | Other keys granted `write` |
| `perm_any_job_write_contents` | bool | Job-level override |
| `perm_explicit_minimal` | bool | Follows principle of least privilege |

## Secrets

| Field | Type | Description |
|---|---|---|
| `secret_ref_count` | int | Total `${{ secrets.* }}` references |
| `secret_names_anonymized` | list[string] | Hashed |
| `uses_GITHUB_TOKEN` | bool | |
| `secrets_in_job_env` | bool | Secrets exposed as env vars at job level |
| `secrets_in_step_env` | bool | Secrets exposed as env vars at step level |

## Action References (the key section for our model)

For each `uses:` reference, extract:

| Field | Type | Description |
|---|---|---|
| `action_ref_id` | string | Unique within workflow |
| `action_source` | string | `owner/repo` |
| `action_path` | string | For subpath references |
| `action_ref` | string | The `@ref` portion |
| `pin_style` | enum | One of: `sha_full`, `sha_short`, `tag_semver`, `tag_non_semver`, `branch`, `unpinned`, `local` |
| `is_first_party` | bool | Same owner as repo, or in GitHub's official actions |
| `is_docker_action` | bool | `docker://` reference |
| `uses_in_reusable_workflow` | bool | i.e., this ref targets another workflow file |

**Pin style taxonomy (critical for our model):**
- `sha_full` — 40-character hex SHA, secure
- `sha_short` — shorter hex, ambiguous (rare, technically insecure)
- `tag_semver` — `v1`, `v1.2.3`, vulnerable to tag mutation (the TeamPCP attack class)
- `tag_non_semver` — other tags
- `branch` — branch names, volatile
- `unpinned` — no `@ref`, defaults to default branch, vulnerable
- `local` — `./` or `./path` reference, trust inherited from repo

## Job Structure

| Field | Type | Description |
|---|---|---|
| `job_count` | int | |
| `max_dependency_depth` | int | Longest `needs:` chain |
| `uses_matrix` | bool | |
| `matrix_dimension_count` | int | |
| `has_self_hosted_runner` | bool | |
| `runner_labels` | list[string] | All unique labels used |

## Artifact Flows

| Field | Type | Description |
|---|---|---|
| `uploads_artifacts` | bool | |
| `downloads_artifacts` | bool | |
| `cross_job_artifact_flow` | bool | One job's upload → another's download |

## Reusable Workflows & Composite Actions

| Field | Type | Description |
|---|---|---|
| `uses_reusable_workflow` | bool | |
| `reusable_workflow_count` | int | |
| `uses_composite_action` | bool | Actions with `runs.using: composite` |
| `uses_local_composite` | bool | `./.github/actions/x` reference |

## Coverage Classification

For each workflow, also record:

| Field | Type | Description |
|---|---|---|
| `captured_constructs_pct` | float | % of YAML keys covered by schema |
| `uncaptured_constructs` | list[string] | Top-level keys not covered |
| `uncaptured_is_material` | bool | Manual classification: does this affect compromise properties? |

## Output Format

One row per `(workflow × action reference)` for action-level analysis, plus one summary row per workflow for workflow-level statistics. Use `parquet` for the combined dataset.

## Edge Cases Requiring Special Handling

- **Expression evaluation:** `${{ ... }}` can be in paths, refs, etc. Record as-is; don't try to evaluate.
- **Reusable workflow refs to local files:** `./.github/workflows/x.yml` — classify separately from remote references.
- **Docker references:** `docker://` references have different trust semantics; count separately.
- **Step-level `uses:` inside composite actions:** recursive; optionally follow one level deep.
- **Multiple permissions keys at different scopes:** record the most-restrictive applicable scope per job.

## Validation of Schema

Before running at scale, test the extractor against:

1. A known-good corpus of 50 hand-annotated workflows
2. The workflow files from the Trivy incident (`aquasecurity/trivy-action`, `aquasecurity/setup-trivy`)
3. The tj-actions/changed-files workflows
4. A variety of popular actions' own workflow files (`actions/checkout`, `actions/setup-node`, etc.)

If the extractor disagrees with hand annotation on >2% of features, debug before scaling.
