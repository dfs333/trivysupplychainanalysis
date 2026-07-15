# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Project Overview

This is a scholarly research project producing a paper titled (working):

> **A Formal Framework for Quantifying Multi-Stage Compromise in Automated Software Workflows**

The paper develops a formal-methods-based quantitative framework for analyzing and mitigating multi-stage supply chain attacks that execute during routine automated workflows (CI/CD pipelines, package registries, build systems).

### Target venue
Primary target: **USENIX Security**, **CCS**, **ESORICS**, or **CSF (Computer Security Foundations Symposium)**. CSF is the best fit for a methods-forward framing — it values formal security work and is less demanding about large-scale empirical validation.

### Author's methodological background
- **Strength:** Formal methods (TLA+, Alloy, PRISM, process calculi, model checking)
- **Data constraint:** Public data sources only (no access to proprietary CI/CD telemetry, enterprise SOC logs, or labeled attack datasets)

### Why this topic was chosen over alternatives
Considered "AI-Driven Threat Analysis" as an alternative but rejected it because:
- Saturated literature with many survey papers
- Dominated by empirical ML work requiring proprietary data
- Formal methods is a niche-within-a-niche there

The supply chain angle plays directly to formal methods strengths: multi-stage attacks are fundamentally a **compositional reasoning problem** (stage A enables stage B enables stage C, with trust relationships, privilege transitions, temporal dependencies). Existing quantitative work in this space uses ad hoc probabilistic models or CVSS-derived scores that don't compose soundly across stages.

## Core Contribution Angles

Four specific angles where formal methods gives a real contribution over existing literature:

1. **Attack graph formalization with sound composition** — Define a process calculus or labeled transition system for automated workflows (GitHub Actions, GitLab CI, Jenkins, Argo), then prove properties about multi-stage reachability. Build on Sheyner/Wing and Ou's MulVAL but update for modern CI/CD.

2. **Probabilistic model checking** — Use PRISM or Storm to express pipelines as MDPs or CTMCs and compute exact probabilities of compromise propagation under different mitigations. Under-applied to supply chain specifically. Kwiatkowska's group has related work to build on.

3. **Information flow and non-interference properties** — Formalize what "isolation" actually means between pipeline stages and prove when mitigations (ephemeral runners, OIDC token scoping, SLSA provenance) do or don't enforce it.

4. **Refinement-based mitigation analysis** — Model a vulnerable workflow and a hardened workflow, establish a formal refinement relation, quantify residual attack surface.

## Three-Layer Validation Strategy

Each layer has different weaknesses; together they triangulate.

### Layer 1: Structural faithfulness (corpus analysis)
Pull 10,000+ real GitHub Actions workflows from public sources (GitHub Archive BigQuery dataset, githubarchive). For each, extract features the formalism claims to model: trigger events, permission scopes, secret usage, action pinning (tag vs. SHA), runner types, job dependencies, artifact flows. Verify the abstract syntax covers what's observed in the wild. Document coverage percentage explicitly. Also provides empirical prior distributions for the probabilistic model.

### Layer 2: Incident reconstruction (primary validation)
Reconstruct documented real-world incidents in the formalism and check whether the model flags documented attack paths as reachable and documented mitigations as sufficient.

**Selected incidents (see `dossiers/` directory):**
- **TeamPCP / Trivy compromise (March 2026)** — Primary, fully specified. See `dossiers/trivy-teampcp.md`.

### Layer 3: Predictive calibration
Use OSV.dev and Backstabber's Knife Collection for labeled malicious-package data. Calibrate PRISM model rates against observed rates of malicious package publication. Sensitivity analysis on all parameters.

## Project Structure

```
.
├── CLAUDE.md                          # This file
├── README.md                          # Human-facing project summary
├── docs/
│   ├── research-plan.md               # Full research plan and timeline
│   ├── validation-methodology.md      # Three-layer validation overview
│   ├── layer-1-methodology.md         # Layer 1 (corpus) six-step methodology
│   ├── layer-3-methodology.md         # Layer 3 (calibration) six-step methodology
│   ├── formal-methods-approach.md     # TLA+/PRISM/Alloy tool selection rationale
│   ├── related-work.md                # Literature review notes
│   └── conversation-history.md        # Summary of prior context / decisions
├── specs/
│   ├── trivy-compromise.tla           # TLA+ spec for Trivy/TeamPCP incident
│   ├── trivy-compromise.cfg           # TLC configuration
│   └── README.md                      # Specs directory guide
├── dossiers/
│   ├── README.md                      # Dossier methodology (Layer 2)
│   └── trivy-teampcp.md               # Full evidence dossier for Trivy incident
├── corpus-analysis/                   # Layer 1 workspace
│   ├── README.md                      # Methodology overview (see docs/layer-1-methodology.md for details)
│   └── extraction-schema.md           # What features to extract from workflows
├── calibration/                       # Layer 3 workspace
│   └── README.md                      # Methodology overview (see docs/layer-3-methodology.md for details)
└── paper/
    └── outline.md                     # Paper section outline
```

## Working Agreements with Claude Code

### Tone and approach
- This is rigorous academic work. Precision matters more than speed.
- When in doubt about a formal-methods modeling choice, ASK before committing to it in code. Modeling decisions propagate; they are expensive to reverse.
- Defend every modeling choice against a skeptical reviewer. "Why this abstraction level?" should have an answer grounded in the property being verified.

### Specific technical preferences established in prior discussion
- **Dual formalism approach:** TLA+ for dynamics/reachability + PRISM for quantitative/probabilistic claims. Both models of the same system, with explicit correspondence documented.
- **Alloy as tertiary option** for visualizing static trust models if reviewers want that.
- **Abstraction level:** model trust relationships and data flow, NOT payload details or protocol semantics. Test of correct abstraction: can the spec distinguish the vulnerable system from the patched system? If yes, correct level. If no, refine.

### Avoid these failure modes
- **Over-modeling.** If a spec models Bash tokenization or git object storage, abstraction level is wrong.
- **Under-modeling.** If a spec can't distinguish SHA-pinned from tag-pinned action references, it's useless.
- **Hindsight fitting.** Don't build a model from the post-mortem and then "validate" that it flags that attack. Build the model from threat modeling (Layer 1) first, then check against incidents.
- **Treating public post-mortems as ground truth.** Cross-reference multiple sources. Flag single-source claims explicitly.

### Evidence handling
Every claim in the model traces to evidence in a dossier. Every load-bearing claim must be corroborated by ≥2 independent sources OR explicitly flagged as a modeled hypothesis with sensitivity analysis.

## Current Status (Pick Up Point)

Completed in prior discussion:
- ✅ Topic selection (supply chain over AI threat analysis)
- ✅ Venue targeting
- ✅ Validation methodology (three layers)
- ✅ Incident selection (primary: Trivy/TeamPCP)
- ✅ Reconstruction methodology (six steps — see `docs/validation-methodology.md`)
- ✅ TLA+ spec sketch for Trivy incident (see `specs/trivy-compromise.tla`)
- ✅ Evidence dossier for Trivy incident (see `dossiers/trivy-teampcp.md`)
- ✅ Mapping of all six reconstruction steps to Trivy incident

Next steps:
1. Flesh out the Trivy TLA+ spec into runnable code and verify with TLC
2. Run the three mitigation configurations and produce the results table
3. Build PRISM companion model for quantitative claims
4. Begin Layer 1 corpus analysis (scrape GitHub Actions workflows, build extraction pipeline)
5. Consider adding a second incident reconstruction for additional validation

See `docs/research-plan.md` for detailed plan and `docs/conversation-history.md` for full prior context.

## Key References to Keep Handy

- **Formal methods for security:** Sheyner & Wing (attack graphs), Ou (MulVAL), Kwiatkowska (probabilistic model checking), Meadows (protocol analysis).
- **Supply chain security practice:** SLSA framework, in-toto, Sigstore, OpenSSF working groups.
- **Public datasets:** OSV.dev, Backstabber's Knife Collection, MalOSS, GitHub Advisory Database, CVE/NVD.
- **Corpus source:** GitHub Archive BigQuery dataset (`githubarchive`), direct GitHub API scraping.

## Notes on Tools Claude Code Should Use

- For TLA+: prefer writing `.tla` and `.cfg` files that can be run with `tlc2` (TLC model checker) or `apalache`.
- For PRISM: write `.prism` or `.pm` model files with accompanying `.props` property files.
- For corpus analysis: Python with `pandas`, `pyyaml`, `PyGithub`, `duckdb` for querying GitHub Archive data.
- All specs should be accompanied by a README explaining what property is being checked and what a passing/failing run means.
