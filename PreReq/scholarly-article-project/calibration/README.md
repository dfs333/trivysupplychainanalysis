# Calibration (Layer 3 Validation)

Methodology, data ingestion, and results for the predictive-calibration validation layer.

See `docs/layer-3-methodology.md` for the six-step methodology.

## Purpose

Show that the PRISM quantitative model's predictions are consistent with observed frequencies in public malicious-package data (OSV.dev, Backstabber's Knife Collection, GitHub Advisory Database, MalOSS).

## Files planned here

- `claim.md` — pre-registered calibration claim and observable pairs (written before any computation)
- `data-ingestion.md` — data cleaning pipeline documentation
- `observables.md` — precise operational definitions of observable quantities
- `prism-runs/<run_id>/` — per-run configuration and output for reproducibility
- `report.md` — full calibration report (per-pair results, disagreements, sensitivity, threats to validity)

## Pre-registration discipline

The single most important protection against post-hoc fitting critique is pre-registration. `claim.md` is written and timestamped *before* any observable is computed or any PRISM run made. The paper reports against the pre-registered pairs, including pairs that fail to agree.

## Data sources

| Source | Role | Access |
|---|---|---|
| OSV.dev | Primary — malicious-package advisories | API / bulk download |
| Backstabber's Knife Collection | Validation — curated academic dataset | Published dataset |
| GHSA | Supplementary — sometimes earlier metadata | GitHub API |
| MalOSS | Historical — older incidents | Published dataset |

## Co-dependency with Layer 1

Layer 3 priors come from Layer 1 `corpus-analysis/priors.json`. If Layer 1 priors are updated, Layer 3 runs must be re-executed. The `prism-runs/` subdirectory records which priors version was used.

## Acceptance thresholds

Pre-registered per observable pair. Typically:

- Order-of-magnitude agreement: minimum acceptable
- Distributional agreement (KS or Anderson-Darling, p > 0.05 after Bonferroni correction): target
- Conditional distributional agreement: strongest

Any pair failing order-of-magnitude agreement is reported as a negative result in the calibration report, not omitted.
