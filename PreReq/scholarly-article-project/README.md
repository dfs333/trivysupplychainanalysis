# Formal Framework for Multi-Stage Supply Chain Attack Analysis

Scholarly research project producing a paper on quantitative analysis and mitigation of multi-stage supply chain attacks during routine automated workflows, using formal methods.

## Working Title

**A Formal Framework for Quantifying Multi-Stage Compromise in Automated Software Workflows**

## The Problem

Modern software supply chains are attacked in stages: a compromised credential enables a malicious commit, which enables credential theft in downstream pipelines, which enables further propagation. Existing quantitative security models use ad hoc probabilistic scores (CVSS-derived, often) that do not compose soundly across stages. Existing formal models of attack graphs predate modern CI/CD threat models.

## The Contribution

A formal framework combining:
- **TLA+ models** for reachability and invariant properties over automated workflows
- **PRISM MDP/CTMC models** for quantitative compromise propagation probabilities
- **Refinement analysis** to formally quantify residual attack surface after mitigations

Validated against:
- A corpus of 10,000+ real GitHub Actions workflows (structural faithfulness)
- Multiple documented multi-stage incidents: Trivy/TeamPCP, XZ Utils, tj-actions/changed-files (incident reconstruction)
- OSV.dev and Backstabber's Knife Collection data (rate calibration)

## Target Venue

USENIX Security / CCS / ESORICS / CSF (primary).

## Project Layout

- `CLAUDE.md` — context for Claude Code when extending this work
- `docs/` — research plan, methodology docs, conversation history
- `specs/` — TLA+ and PRISM specs
- `dossiers/` — evidence dossiers for each reconstructed incident
- `corpus-analysis/` — Layer 1 corpus analysis code and methodology
- `paper/` — paper outline and drafts

## Getting Started

Read in this order:
1. `CLAUDE.md` — project overview and working agreements
2. `docs/conversation-history.md` — full prior context
3. `docs/research-plan.md` — what we're doing and why
4. `docs/validation-methodology.md` — the three-layer validation approach
5. `dossiers/trivy-teampcp.md` — the primary incident evidence dossier
6. `specs/trivy-compromise.tla` — the primary TLA+ spec
