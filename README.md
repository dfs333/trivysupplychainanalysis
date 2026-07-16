# Quantitative Analysis of Multi-Stage CI/CD Supply-Chain Attacks

A **formally verified, quantitative reconstruction** of the March-2026 Trivy / "TeamPCP"
GitHub Actions supply-chain compromise (**CVE-2026-33634**) — modeled in TLA+, checked
exhaustively with TLC, and quantified with the PRISM probabilistic model checker.

![model checking](https://img.shields.io/badge/TLC-10%2F10%20configs%20green-brightgreen)
![PRISM](https://img.shields.io/badge/PRISM-MDP%20%2B%20DTMC%20%2B%20parametric-blue)
![corpus](https://img.shields.io/badge/corpus-189%20real%20workflows-informational)
![CVE](https://img.shields.io/badge/incident-CVE--2026--33634-critical)
[![verify](https://github.com/dfs333/trivysupplychainanalysis/actions/workflows/verify.yml/badge.svg)](https://github.com/dfs333/trivysupplychainanalysis/actions/workflows/verify.yml)
[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.21387135.svg)](https://doi.org/10.5281/zenodo.21387135)

> **Every number in the paper regenerates from this repository.** The model, the
> probabilities, the corpus measurements, and the calibration all reproduce from source
> with a single command per layer.

---

## What happened, and what this proves

An attacker who could move a floating version tag on a widely-used Action (`trivy-action`
/ `setup-trivy`) caused thousands of downstream pipelines to execute attacker-controlled
code with production credentials on their next routine run, leaking secrets that seeded a
second-stage npm worm. This project asks the questions an incident report cannot answer
formally:

- **Complete vs. partial credential rotation.** The model proves that the *partial*
  rotation that actually happened does **not** close the attack, while *complete* rotation
  does — matching the documented incident causation.
- **SHA-pinning isolates a pipeline.** A commit-SHA-pinned pipeline is provably never
  compromised, *even when its neighbours are and even when the stolen credential stays
  valid* — the breach is contained to the un-pinned subset (a formal isolation theorem +
  a refinement relation quantifying the residual attack surface).
- **How likely, how fast, how far.** Exact compromise probabilities, expected
  time-to-compromise, a two-stage npm-propagation cascade, and closed-form parametric
  results, calibrated against real malicious-package frequency data.
- **The finding survives an automated search.** An LLM proposer (Claude Opus 4.8) searching
  the defender-policy space against the verified PRISM oracle converges — with no human
  guidance — on the same minimal-cost provably-safe policy: rotate the residual credential.
  The proposer suggests; the model checker decides.

---

## Key results

| Question | Result |
|---|---|
| Is the documented attack reachable? | **Yes** — TLC returns the exact 3-step dossier trace |
| Partial rotation sufficient? | **No** (`NoExfiltration` fails); complete rotation **yes** |
| SHA-pinning in a mixed population | **Isolation holds** over 8,185 states; breach contained |
| P(compromise), vulnerable config | **1.0**; E[time] **6 days**; P(≤30 days) **0.9985** |
| Multi-stage cascade | P(reach stage 2) **= q**; E[first downstream] **16 days**; **rotation → 0** |
| Parametric (closed form) | E[days-to-compromise] **= (p+1)/p**; P(stage 2) **= q** (exact) |
| Layer-1 corpus (189 real workflows) | floating-tag fraction **f = 0.3698**; construct coverage **88.2%** |
| Calibration (OpenSSF/OSV) | npm = 214,497 reports (94.2%); **Feb→Mar 2026: 329 → 1,048 (×3.19)** |
| Automated mitigation search | LLM proposes, PRISM verifies → **rotate-only optimum** (score −0.05), converged in 4 rounds |

---

## Three-layer validation

1. **Structural faithfulness** (`TrivySupplyChain/layer1/`) — a static analyzer over a
   corpus of real GitHub Actions workflows measures how often the modeled constructs occur
   (14/14 unit tests; the floating-tag fraction feeds Layer 3).
2. **Incident reconstruction** (`TrivySupplyChain/`) — the TLA+ model + 10 TLC
   configurations reproduce the attack and prove which mitigations close it (reachability,
   isolation, refinement, residual surface).
3. **Predictive calibration** (`TrivySupplyChain/layer3/`) — the PRISM MDP/DTMC computes
   probabilities, expected times, and the multi-stage cascade, calibrated against the
   OpenSSF malicious-packages dataset and the documented Feb→Mar timeline.

---

## Repository layout

```
TrivySupplyChain/            The model + verification harness
  TrivySupplyChain.tla       Core TLA+ transition system
  MCTrace.tla, SecureWorkflow.tla, MCRefine.tla
  cfg_*.cfg                  10 TLC configurations (the validation table)
  tools/tla2tools.jar        Bundled TLA+ / TLC 2.19
  layer1/                    Corpus analyzer (Python) + fixtures + tests
  layer3/                    PRISM models (.prism/.props) + bundled PRISM 4.10.1
  asi_evolve/                LLM mitigation-search loop (run_evolve.py) over the verified
                             PRISM oracle + an archived executed run (example_run.json)
  run-all.ps1                Reproduce all 10 TLC checks
  env-check.ps1              One-shot environment doctor
Trivy-USENIX-paper/          USENIX paper: main.tex (compiles standalone), main.pdf,
                             and the filled-in validation-results .docx
Trivy-TeamPCP-Dossier.md     Incident dossier — the sourced evidence base (read-only)
```

> **Where's `layer2/`?** Layer 2 (incident reconstruction) *is* the top level of
> `TrivySupplyChain/` — the `TrivySupplyChain.tla` model, the `cfg_*.cfg` configs, the
> `MC*.tla` / `SecureWorkflow.tla` modules, and `run-all.ps1`. It was built first as the
> core, so it lives at the root; `layer1/` and `layer3/` are the validation layers added
> around it.

---

## Reproduce it

**Requirements:** Windows + a JDK (set `JAVA_HOME`); Python 3.10+ (Layer 1 & calibration);
Node.js (only to regenerate the Word docs); Git for Windows (supplies the MinGW runtime
DLLs that PRISM's native library needs). TLA+ tools and PRISM are **bundled** in the repo.

```powershell
# 0. verify the toolchain
powershell -File TrivySupplyChain\env-check.ps1

# 1. Layer 2 — all 10 TLC checks (reachability, mitigations, isolation, refinement)
powershell -File TrivySupplyChain\run-all.ps1

# 2. Layer 1 — corpus analysis (unit tests + measured floating-tag fraction)
powershell -File TrivySupplyChain\layer1\run-layer1.ps1

# 3. Layer 3 — PRISM: probabilities, multi-stage cascade, parametric, calibration
powershell -File TrivySupplyChain\layer3\run-layer3.ps1

# 4. (optional) ASI-Evolve mitigation search — Claude Opus proposes policies,
#    PRISM verifies each one. Needs the Anthropic SDK + an API key.
pip install -r TrivySupplyChain\asi_evolve\requirements.txt
python TrivySupplyChain\asi_evolve\run_evolve.py
```

Layers 1–3 are self-contained and need no API key. Only step 4's *proposer* is an LLM;
its PRISM oracle (`asi_evolve/evaluate.py`) runs standalone and is what actually scores
each policy.

The `.tla`, `.prism`, and `.py` sources are portable; only the runner scripts are Windows
PowerShell. See `TrivySupplyChain/README.md` for the manual (cross-platform) commands.

> **Layer 3 is Windows-only as bundled.** PRISM ships here as its native Windows library
> (`prism.dll`, CUDD) plus the Git-for-Windows MinGW runtime, so `run-layer3.ps1` runs on
> Windows only. A Linux/macOS reviewer can't run Layer 3 from the bundled binary — but the
> `.prism`/`.props` models are portable: install upstream PRISM
> (<https://www.prismmodelchecker.org>) and run them directly, e.g.
> `prism layer3/trivy_mdp.prism layer3/trivy.props`. Layers 1–2 are cross-platform (Python,
> and the bundled `tla2tools.jar` runs anywhere with a JDK).

---

## The paper

`Trivy-USENIX-paper/main.tex` is the write-up in USENIX Security two-column format. It is
self-contained (standard CTAN packages) and compiles on Overleaf or with any TeX engine:

```bash
pdflatex main.tex && pdflatex main.tex     # or: tectonic main.tex
```

The compiled paper is `main.pdf`; the filled-in validation report (Word) is
`QA -- Validation Results (Filled In).docx` — both in `Trivy-USENIX-paper/`.

---

## Branches

- **`main`** — the current, corrected analysis. Build from here.
- **`pre-mercor-fix`** — an archival reconstruction of the project *before* the Mercor→v1
  relabel (Mercor's breach came via the stage-2 LiteLLM follow-on, not a direct
  trivy-action execution). Reference only; see `PRE-MERCOR-FIX.md` on that branch.

---

## Status & scope

Research preprint in progress by **Franklin Hanna** (affiliation/email are still
placeholders in `main.tex`). Incident
facts are drawn from the public dossier (Aqua, GHSA, CVE-2026-33634, Unit 42, Microsoft,
Wiz, ReversingLabs, Endor Labs, OpenSSF/OSV, and others). Modeling assumptions and their
limits are stated explicitly in the paper's *Limitations and Threats to Validity* section.

To cite this work, see [`CITATION.cff`](CITATION.cff).

---

## License

- **Code & formal-methods artifacts** (analyzers, TLA+/PRISM models, scripts, generators) —
  [Apache License 2.0](LICENSE).
- **Paper text and its renditions** (`Trivy-USENIX-paper/`) —
  [CC BY 4.0](Trivy-USENIX-paper/LICENSE).

Bundled third-party tools keep their own licenses: PRISM is GPL
(`TrivySupplyChain/layer3/prism/COPYING.txt`) and the TLA+ tools are MIT.
