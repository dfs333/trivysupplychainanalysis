# Corpus Analysis (Layer 1 Validation)

Methodology and code for the structural-faithfulness validation layer.

## Purpose

Demonstrate that the formalism's abstract syntax covers what real automated workflows actually do, and produce empirically-grounded parameter priors for the PRISM quantitative model.

## What Gets Analyzed

A corpus of ≥10,000 real GitHub Actions workflow files (`.github/workflows/*.yml`) drawn from:

1. **GitHub Archive BigQuery dataset** (primary) — `githubarchive.year.YYYYMM` tables give push events with content; filter for workflow files
2. **Random-sample GitHub API scraping** — PyGithub over randomly selected public repos (use repo ID stratified random sampling for unbiasedness)
3. **Popular-repo scraping** — top-N by stars per language ecosystem (biased but visibility-weighted useful for real-world-impact arguments)

Stratify by ecosystem (Python, JS/TS, Go, Rust, Java, C/C++, mixed) to ensure breadth.

## Feature Extraction Schema

See `extraction-schema.md` for the full schema. Key features:

- **Trigger events:** `push`, `pull_request`, `pull_request_target`, `workflow_run`, `workflow_dispatch`, schedule
- **Permission scopes:** `GITHUB_TOKEN` permissions (default vs. explicit; per-job vs. per-workflow)
- **Secret usage:** `${{ secrets.X }}` references — count, names (anonymized)
- **Action references:**
  - Pin style: full SHA (40 hex) vs. tag vs. branch vs. unpinned
  - Source: `owner/repo@ref` broken into parts
  - First-party vs. third-party
- **Runner type:** `ubuntu-latest`, `windows-latest`, self-hosted labels
- **Job structure:** number of jobs, dependency depth (`needs:`), matrix strategies
- **Artifact flows:** `upload-artifact` / `download-artifact` usage, cross-job flows
- **Reusable workflows:** `uses: owner/repo/.github/workflows/file.yml@ref`
- **Composite actions:** local (`./`) vs. remote references

## Priors to Compute

From the extracted corpus, compute distributions that feed the PRISM model:

- `P(action ref is SHA-pinned)` — key parameter for `PinningPreventsExfil` baseline
- `P(workflow uses third-party action)` — exposure to supply chain
- `P(workflow uses `pull_request_target`)` — elevated-risk trigger
- `P(workflow has write permissions in token scope)` — blast radius
- Distribution of secrets-per-workflow
- Distribution of action-dependency-depth
- Distribution of fan-in (how many workflows reference a given popular action)

These become input distributions for PRISM MDP rate parameters.

## Coverage Analysis

For each workflow, classify each construct:
- Captured by formalism ✓
- Not captured but orthogonal to compromise properties ⚪
- Not captured and potentially relevant ✗

Report:
- Coverage percentage overall
- Coverage percentage of "potentially relevant" constructs
- Explicit list of excluded constructs with rationale

## Tooling

Recommended Python stack:
- `duckdb` for querying GitHub Archive Parquet exports
- `PyGithub` for direct API scraping (respect rate limits)
- `pyyaml` for workflow parsing (note: GitHub Actions YAML is a superset of standard YAML; may need custom handling for `${{ }}` expressions)
- `pandas` for feature tables and statistics
- `scipy.stats` for fitting distributions

## Storage Expectations

Corpus size estimate: 10,000 workflows × ~5KB average = ~50MB of YAML. Plus metadata per workflow (repo stars, language, last-updated). Plan for ~200MB of structured output.

## Deliverables

1. `coverage-report.md` — coverage percentages with per-construct table
2. `priors.json` — calibrated distributions for PRISM parameters
3. `corpus.parquet` — extracted structured data (for reproducibility)
4. `extraction-code/` — Python scripts for reproduction

## Known Risks

- **Bias toward popular repos.** Popular repos have more active security consciousness; their pinning practices may not represent enterprise or niche workflows. Mitigation: include random-sample stratum.
- **YAML parsing edge cases.** GitHub Actions expression syntax, anchors/aliases, multi-document files. Mitigation: validate parser against a test suite of known workflows before running at scale.
- **GitHub API rate limits.** Use `githubarchive` BigQuery for bulk; reserve API calls for spot-checks.
- **Temporal drift.** Corpus reflects practices at time of extraction; the paper should state the extraction date and acknowledge the snapshot nature.
