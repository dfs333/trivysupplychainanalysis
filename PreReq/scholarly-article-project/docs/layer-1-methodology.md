# Layer 1: Structural Faithfulness — Six-Step Methodology

Parallel to the Layer 2 six-step incident reconstruction in `docs/validation-methodology.md`. This document specifies how to execute the corpus-analysis layer rigorously.

## Purpose

Demonstrate two separable claims:

**Claim A (syntactic coverage):** Our formalism can represent N% of the constructs appearing in real GitHub Actions workflows.

**Claim B (semantic adequacy):** Of the constructs our formalism does not represent, none materially affects the compromise properties we verify.

These are different claims and must be defended separately. Claim A is a counting exercise; Claim B is an argument.

## Step 1: Define what "coverage" means

Before collecting any data, document in `corpus-analysis/coverage-definition.md`:

1. **Unit of coverage.** Define what a "construct" is — top-level YAML keys, action references, trigger types, etc. Different granularities answer different questions; pick deliberately.
2. **Acceptance threshold for Claim A.** Pre-register the percentage you consider sufficient and justify it.
3. **Materiality criterion for Claim B.** A construct is "material" if it could affect reachability of a compromise state. Constructs that only affect payload behavior, performance, or display are not material.
4. **Boundary with the formal model.** The in-model / out-of-model boundary from `docs/validation-methodology.md` and each dossier's boundary section determines what counts as material.

Write these down before collecting data. Redefining success after seeing results is post-hoc adjustment and will be noticed.

## Step 2: Define the sampling frame

Three sub-corpora, each answering a different question.

### Popular-repo stratum
- **Source:** Top-N repositories by stars per language ecosystem
- **Size target:** ~3,000 workflows
- **What it represents:** Workflows with highest real-world blast radius when compromised (attacking a popular repo hits many downstream users)
- **Bias:** Over-represents security-conscious maintainers
- **Use for:** Claims about "workflows that matter most"

### Random-sample stratum
- **Source:** Uniform sample from public repos with `.github/workflows/`
- **Size target:** ~5,000 workflows
- **What it represents:** Typical practice across all public repos
- **Bias:** Minimal if sampling is truly uniform; survivorship bias re: archived/deleted repos remains
- **Use for:** Unbiased coverage claims

### Incident-adjacent stratum
- **Source:** Workflow files from the Trivy incident repo (`aquasecurity/trivy-action`, `aquasecurity/setup-trivy`) and their direct dependents
- **Size target:** ~1,000 workflows
- **What it represents:** Workflows that were actually attacked
- **Use for:** Argument that the formalism captures the workflow that the incident hit

### Document for each stratum
- Date of extraction
- Exclusion rules (archived repos, forks, empty workflows)
- Selection criteria precisely enough for reproduction
- Confidence interval implications (random stratum of 5,000 gives ±1.4% at 95% CI for proportions)

## Step 3: Extract features per the schema

The extraction schema exists in `corpus-analysis/extraction-schema.md`. This step is building and validating the extractor.

### Build order
1. Parser handling GitHub's YAML superset (including `${{ }}` expression blocks that aren't strict YAML)
2. Feature extractor mapping parsed AST to the schema's fields
3. Completeness checker per workflow

### Validate before scaling
Test the extractor against:
- 50 hand-annotated workflows covering edge cases (matrix strategies, reusable workflows, composite actions, expression-heavy refs)
- Workflow files from the Trivy incident repo (`aquasecurity/trivy-action`, `aquasecurity/setup-trivy`) — known ground truth
- Popular actions' own workflow files (`actions/checkout`, `actions/setup-node`, etc.)

**Acceptance:** ≤2% disagreement between extractor output and hand annotation. Above that, debug before scaling.

### Instrument the extractor
For every workflow processed, record:
- All YAML keys seen
- YAML keys not in schema (the "unknown construct" set)
- Parser errors or partial parses
- Processing time (for scale sanity)

This instrumentation drives Step 4.

## Step 4: Classify uncaptured constructs

For every YAML key seen but not in the schema, classify:

- **Captured ✓** — covered by schema (should be most)
- **Orthogonal ⚪** — not captured, not material to compromise properties
- **Deferred ✗** — not captured but potentially material; flag for formalism extension or explicit exclusion

Produce a table:

| Construct | Frequency | Classification | Rationale |
|---|---|---|---|
| `timeout-minutes` | 34% | Orthogonal | Affects execution time, not trust edges |
| `continue-on-error` | 22% | Orthogonal | Affects error handling, not data flow |
| `services` (Docker) | 12% | Deferred | Introduces additional execution contexts; excluded from current scope |
| `defaults` | 18% | Orthogonal | Shell/dir defaults, not trust |
| `concurrency` | 15% | Orthogonal | Prevents parallel runs, not a trust property |
| (etc.) | | | |

This table is the Claim B argument. Deferred rows are honest limitations; the paper states what's excluded and why, and argues why the exclusion doesn't undermine the formal claims.

**High-volume manual classification strategy:** if the uncaptured-construct set is too large for full manual classification, sample 200 uniformly from the unknown set, classify those, and report with confidence intervals.

## Step 5: Compute empirical priors for PRISM

With the extracted corpus, compute the distributions PRISM needs. Always compute distributions with uncertainty, not just point estimates.

### For each parameter, produce
- Point estimate (mean or median, note which)
- Bootstrapped 95% confidence interval
- Per-stratum breakdown (popular vs. random vs. incident-adjacent)
- Fitted parametric family if appropriate (beta for probabilities, log-normal for counts)

### Key priors for the Trivy-style model
- `P(action reference is SHA-pinned)` — likely low, 5–15% in random stratum, higher in popular
- `P(workflow uses third-party action)` — likely high, 70%+
- `P(workflow uses pull_request_target)` — should be low, concerning if high
- `P(GITHUB_TOKEN has write scope)` — distribution matters for blast radius
- Distribution of `secrets-per-workflow`
- Distribution of action dependency depth
- Distribution of fan-in (how many workflows reference a given popular action)

### Output
`corpus-analysis/priors.json` with explicit uncertainty. These feed PRISM directly.

### Per-stratum differences matter
If popular-repo pinning rates differ from random-sample rates by 3×, document this. It affects which population the quantitative claims generalize to, and the paper must state this generalization scope.

## Step 6: Coverage report and threats to validity

The Layer 1 deliverable `corpus-analysis/coverage-report.md` has structure parallel to a Layer 2 per-incident dossier:

1. **Sampling frame description** — how the corpora were assembled, dates, exclusion rules
2. **Syntactic coverage table** — per schema field, what fraction of workflows used it
3. **Uncaptured-constructs table** — from Step 4
4. **Materiality argument** — Claim B defense: why Deferred constructs don't undermine formal claims
5. **Priors table** — with uncertainty and stratum breakdowns
6. **Threats to validity**

### Threats to validity specific to corpus analysis
- **Temporal snapshot bias.** Corpus reflects practices at extraction date; practices change. Mitigate by stating extraction dates and, if possible, re-extracting near submission to confirm stability.
- **Visibility bias.** Public repos only; enterprise workflows unobserved. Acknowledge explicitly; quantitative claims generalize to public population.
- **Survivorship.** Archived/deleted workflows not included. Likely favors "more successful" projects which may have different practices.
- **Popular-repo skew.** Stars correlate with security awareness. Per-stratum breakdown addresses this but doesn't fully solve it.
- **Expression-evaluation abstraction.** We don't evaluate `${{ }}` expressions; some constructs may be dynamic in ways we treat as static. Worst case: a workflow that constructs action references dynamically could bypass our pinning classification.
- **Parser limitations.** Document any known YAML edge cases the extractor fails on and report the failure rate.

### What to report in the paper
A summary paragraph plus the coverage and priors tables from the full report. Full report goes in the appendix.
