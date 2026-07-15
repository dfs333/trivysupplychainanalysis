# Layer 3: Predictive Calibration — Six-Step Methodology

Parallel to the Layer 2 six-step incident reconstruction in `docs/validation-methodology.md` and the Layer 1 methodology in `docs/layer-1-methodology.md`. This document specifies how to execute the calibration layer rigorously.

## Purpose

Show the quantitative PRISM model's predictions are consistent with observed frequencies in public malicious-package data.

This is the hardest layer to execute rigorously because:
- We observe compromised packages, not compromised pipelines
- The correspondence between model outputs and public data is indirect
- Public datasets have known reporting lags and selection biases

The methodology below addresses these honestly rather than papering over them.

## Step 1: State the calibration claim precisely

Before any computation, write down the calibration claim in `calibration/claim.md`:

> If our model is faithful, then given input distributions D (from Layer 1) and malicious-package arrival rates R (from OSV), the model's output distributions on X, Y, Z should be consistent with observed distributions on X', Y', Z'.

### Pre-register observable pairs
Write down, before computing anything, the pairs of (model output, observable quantity) to be compared. This is the single most important bias-mitigation in Layer 3. Post-hoc selection of which comparisons to report is the critique reviewers will raise; pre-registration prevents it.

Example pre-registered pairs:

| Model output | Observable counterpart | Notes |
|---|---|---|
| PRISM `ExpectedTime[F detect]` | OSV advisory date minus package publication date | Measures dwell time |
| Model predicted fraction of population compromised in window W | Observed fraction of downstream packages flagged as affected | Per incident |
| Model predicted malicious-package arrival rate per ecosystem | OSV advisory arrivals per month, per ecosystem | Basic sanity check |
| Model predicted dwell time given mitigation M adopted | Post-incident dwell times, when mitigation adoption is known | Requires per-incident dwell data |

Pre-register 5–10 pairs; more is fine but makes the report heavier.

### State acceptance criteria
For each pair, state in advance what level of agreement would count as supporting the model:
- Order-of-magnitude (minimum acceptable)
- Distributional (via goodness-of-fit)
- Conditional distributional (strongest)

## Step 2: Ingest and clean the public datasets

### Primary sources

**OSV.dev** — primary. Pull the full advisory corpus via API or bulk download. Filter to:
- Package ecosystems relevant to your model (npm, PyPI, GitHub Actions, Docker)
- Malicious-package advisories specifically (OSV uses `MAL-` prefix)
- Date range matching your corpus-extraction window

**Backstabber's Knife Collection** (Ohm et al. 2020, updated) — curated academic dataset. Use for validation that OSV captures known-malicious packages. Expect high but not complete overlap.

**GitHub Advisory Database (GHSA)** — overlaps with OSV (OSV ingests GHSA) but sometimes has earlier publication dates or richer metadata. Use as supplementary.

**MalOSS** — older but has per-package analysis occasionally useful for dwell-time reasoning.

### Cleaning pipeline
1. Ingest each dataset independently
2. Normalize package names, ecosystem labels, dates
3. Produce a merged view with source provenance per record
4. Resolve disagreements explicitly:
   - Duplicates across sources (same package, different advisory IDs) → keep all but flag
   - Disagreements on first-seen dates → take earliest across sources, note the span
   - Missing metadata → mark missing, do not impute

Document the cleaning pipeline in `calibration/data-ingestion.md` with enough detail that a reviewer could reproduce it.

### Expected data quality issues
- Publication dates missing for some packages (registries sometimes don't record or don't expose)
- Affected-package enumeration incomplete (OSV lists known-affected; undetected propagation is invisible)
- Ecosystem coverage uneven (npm is well-covered; Docker Hub and GitHub Actions are under-covered)
- Older advisories have less metadata

Note which issues affect which pre-registered pairs from Step 1.

## Step 3: Define observable quantities precisely

For each observable in the pre-registered pairs, write a precise specification:

```
Quantity: Time from publication to first affected-package reference in OSV
Operational definition: osv_advisory_date - package_publication_date
Units: days
Filters: ecosystem ∈ {npm, PyPI}, advisory prefix = MAL-
Caveats:
  - package_publication_date missing for ~X% of records; exclude or impute (state choice)
  - affected-package enumeration is based on OSV's reporting, may be incomplete
Corresponding model output: PRISM ExpectedTime[F detect] under malicious-introduction
Model parameters drawn from: Layer 1 priors.json, sections [S1, S2]
```

### Precision test
If you cannot define an observable precisely enough to implement its operational definition in ~20 lines of SQL or Python, drop it. Imprecise calibration is worse than no calibration because it invites interpretation disputes.

### Typical observable categories
- **Dwell time** — publication → detection
- **Propagation fanout** — number of downstream packages flagged affected
- **Arrival rate** — advisories per month per ecosystem
- **Version proximity** — how many benign versions between malicious releases
- **Per-incident replication** — can the model reproduce known incident numbers (affected-org counts, data volumes)?

## Step 4: Run the model and compute predicted distributions

For each pre-registered pair:

1. Configure PRISM with:
   - Input parameters from Layer 1 priors (with uncertainty propagated)
   - Arrival rates from Step 2 data
   - Model variants for different mitigation levels if population is heterogeneous
2. Compute predicted distributions for the target output quantity
3. Use PRISM's parametric model checking to propagate input uncertainty into output uncertainty

### Output per pair
- Predicted mean / median
- Predicted variance / IQR
- Full CDF where feasible (PRISM supports this for most property classes)
- Propagated uncertainty interval from Layer 1 parameter uncertainty

### Record the model configuration
For reproducibility, every PRISM run for Step 4 is recorded with:
- Model file hash
- Property file hash
- Parameter values used
- Tool version
- Runtime and state-space size

Store in `calibration/prism-runs/<run_id>/` with the above + stdout/stderr.

## Step 5: Compare predicted vs. observed

Three levels of comparison, from weakest to strongest.

### Level 1: Order-of-magnitude agreement
Predicted value and observed value are within ~1 order of magnitude. Minimum acceptable result; most useful for sanity-checking.

### Level 2: Distributional agreement
Predicted and observed distributions pass a goodness-of-fit test. Specify the test per observable:
- Continuous, smooth distributions → Kolmogorov-Smirnov or Anderson-Darling
- Discrete or heavy-tailed → chi-squared on binned distributions
- Small samples → bootstrap-based comparison

State the p-value threshold before running. Bonferroni-correct across multiple pairs tested if you want to avoid multiple-comparisons critique.

### Level 3: Conditional distributional agreement
Distributions agree conditional on stratification — e.g., by ecosystem, by package popularity, by time period. Strongest form of agreement; shows the model captures structure, not just marginals.

### Report all three per pair
For each pre-registered observable pair, state the highest level of agreement achieved. Pairs that fail Level 1 are honest negative results and should be reported as such.

### Be honest about disagreements
If predicted dwell-time is 3 days and observed is 30 days, don't paper over it. Discuss what the gap implies. Likely explanations to consider:
- Detection-reporting gap (OSV advisory date is usually weeks after actual detection)
- Model's abstraction ignores a factor that matters empirically
- The observable is measuring something different from what the model is computing
- Data quality issue in the observed side

A frank discussion of disagreements is what makes Layer 3 persuasive. Papers that show only agreements look cherry-picked.

## Step 6: Sensitivity analysis and calibration report

### Sensitivity dimensions
Vary each input parameter across plausible ranges and report how calibration results change:

- Layer 1 priors varied within their 95% CIs
- Arrival rates varied within their observed variance
- Mitigation-adoption distribution varied (e.g., SHA pinning at 5%, 10%, 20%)
- Detection-reporting gap varied (1-day, 7-day, 30-day assumed lag)
- Ecosystem-specific parameters toggled (uniform vs. per-ecosystem)

For each sensitivity dimension, report per pair: does agreement hold, weaken, or break?

### Robustness finding
Agreements that survive 10× parameter variation are robust findings. Agreements that collapse under small perturbations should be flagged as fragile and not over-interpreted.

### Deliverable: `calibration/report.md`

Structure:

1. **Calibration plan** — pre-registered observable pairs from Step 1 (reproduced verbatim, with timestamp of pre-registration)
2. **Data provenance** — what came from where, cleaning pipeline summary, known limitations
3. **Observable definitions** — table from Step 3
4. **Per-pair results** — predicted vs. observed, agreement level achieved, p-values where applicable
5. **Disagreements and their implications** — honest discussion of pairs that failed agreement, hypothesized explanations
6. **Sensitivity analysis** — robustness of findings across parameter variations
7. **Threats to validity**

### Threats to validity specific to Layer 3
- **Observability gap.** We observe packages, not pipelines. The transformation between the two introduces assumptions that may not hold uniformly across incidents.
- **Reporting lag.** Detection and reporting are not simultaneous; OSV advisory dates are upper bounds on detection times, not exact measurements.
- **Ecosystem heterogeneity.** Rates and patterns differ across npm / PyPI / Actions / Docker in ways that may strain a unified model. Per-ecosystem calibration is stronger but splits sample sizes.
- **Survivorship in advisory data.** Only detected-and-reported malicious packages appear in OSV; undetected ones are invisible. Calibration is conditional on detection.
- **Selection bias in incident reporting.** Major incidents get rich post-mortems; routine malicious packages get minimal advisories. Dwell-time and propagation measurements weighted toward major incidents.
- **Time-period effects.** Malicious-package publication rates are increasing over time; use time-matched windows for calibration.
- **Co-dependency with Layer 1.** Priors come from Layer 1; if Layer 1 is biased, Layer 3 inherits the bias. Worth stating even though it's obvious.

### What to report in the paper
A summary paragraph, the per-pair results table, and the sensitivity summary. Full calibration report goes in the appendix.

## Relationship to Layer 2

Layer 2 (incident reconstruction) and Layer 3 (rate calibration) can reinforce each other:

- Layer 2 shows the model reproduces *specific* incident trajectories
- Layer 3 shows the model's *aggregate* predictions match observed patterns

If both succeed, the combination is stronger than either alone. If Layer 2 succeeds but Layer 3 shows aggregate disagreement, the model may be fitting specific incidents without capturing population-level behavior. If Layer 3 succeeds but Layer 2 fails, the model captures averages but misses important incident-specific mechanisms.

Report Layer 2 and Layer 3 results side-by-side in a paper's evaluation section to let reviewers see the combined evidence.
