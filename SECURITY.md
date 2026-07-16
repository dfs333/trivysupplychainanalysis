# Security Policy

This repository is a **research artifact** — formal models (TLA+, PRISM), an analysis
harness, a corpus of public CI workflow files, and an academic paper. It is not a deployed
service or a production library, so its footprint is limited to code you run locally to
reproduce the analysis.

## Reporting a vulnerability or issue

If you find a security-relevant problem in the **original code** here — the Layer 1
analyzer, the PRISM/TLA+ drivers, the docx/LaTeX generators, or the ASI-Evolve runner —
please report it privately rather than opening a public issue:

- **Preferred:** open a GitHub private security advisory on this repository
  (Security → Advisories → Report a vulnerability), or
- **Email:** franklinhanna9@gmail.com

Please include steps to reproduce and the affected file(s). I aim to acknowledge reports
within a few days and ask for a reasonable window to address an issue before public
disclosure.

## Scope

**In scope:** the original analysis code and scripts in this repository.

**Out of scope:**

- **Bundled third-party tools** (PRISM, TLA+ tools) — report issues to their upstream
  projects; they are redistributed here unmodified for reproducibility (see `PROVENANCE.md`).
- **The corpus** (`TrivySupplyChain/layer1/corpus/`) — unmodified public workflow files
  from other projects, retained only as analyzer input (see `PROVENANCE.md`).
- **The incident under study** — the Trivy / TeamPCP supply-chain compromise
  (CVE-2026-33634) is analyzed from public reporting; this repository hosts no exploit or
  attacker artifact.

## A note on the ASI-Evolve runner

`TrivySupplyChain/asi_evolve/run_evolve.py` calls the Anthropic API and requires **your
own** API key via the environment (`ANTHROPIC_API_KEY` or an `ant` profile). It does not
read or transmit credentials beyond the standard SDK. Never commit an API key; the other
three layers need no key and no network.
