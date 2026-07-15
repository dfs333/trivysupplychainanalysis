# Related Work Notes

Preliminary literature review to inform paper's related-work section. Expand and verify each entry before writing.

## Attack Graph Foundations

- **Sheyner & Wing** — foundational attack graph generation, model-checking approach
- **Ou et al. — MulVAL** — logic-based attack graph, widely cited; predates modern CI/CD
- **Jha, Sheyner, Wing** — probabilistic attack graphs and analysis
- **Ingols, Chu, Lippmann et al.** — multiple-prerequisite graphs, scalability

**Gap we address:** These formalisms model network-centric enterprise attack surfaces. They do not natively represent trust mutation (tag force-push), credential lifecycle (rotation completeness), or CI/CD-specific semantics (runner execution context, artifact-vs-reference resolution).

## Probabilistic Model Checking

- **Kwiatkowska, Norman, Parker** — PRISM; foundational
- Multiple papers applying PRISM to security protocols, intrusion detection
- **Storm** (Dehnert et al.) — alternative implementation

**Gap we address:** Limited prior application of probabilistic model checking to supply chain specifically. Existing security applications focus on protocol analysis or IDS modeling.

## Software Supply Chain Security (Practice)

- **SLSA Framework** — build-level integrity model, provenance attestations
- **in-toto** (Torres-Arias et al.) — layout-based supply chain verification
- **Sigstore** — signing and transparency for package artifacts
- **OpenSSF Scorecard** — automated security posture scoring for open-source projects

**Gap we address:** These are engineering frameworks, not formal analyses. SLSA levels are defined in natural language; we can give them precise semantics and verify their implications.

## Supply Chain Attack Studies

- **Zimmermann et al. (2019) — "Small World with High Risks"** — npm dependency ecosystem analysis
- **Ohm et al. (2020) — "Backstabber's Knife Collection"** — malicious package dataset, 174 packages initially
- **Ladisa et al. (2023) — "SoK: Taxonomy of Attacks on Open-Source Software Supply Chains"** — taxonomic survey
- **Duan et al. (2021)** — measuring malicious npm packages
- Incident-specific writeups: SolarWinds (Peisert et al.), XZ backdoor analyses, Codecov post-mortems

**Gap we address:** These are empirical / measurement studies. None provide a formal framework for *quantitative* compositional reasoning about multi-stage attacks.

## Non-Interference and Information Flow

- **Goguen & Meseguer** — foundational non-interference
- **McCullough** — extending non-interference
- **Sabelfeld & Myers** — language-based information flow (surveys)
- **Schneider** — enforceable security policies (EM framework)

**Relevance:** Provides formal machinery for "isolation" claims between pipeline stages. Applying this to CI/CD is under-explored.

## Trust Models

- **BAN logic** (Burrows, Abadi, Needham) — foundational but narrow
- **Josang — subjective logic** — trust as opinions
- **Trust management systems** (KeyNote, PolicyMaker)

**Relevance:** Possible theoretical grounding for modeling mutable trust edges (e.g., tag mutation changes the trust relationship without revoking credentials).

## CI/CD Security (Recent)

- Papers on GitHub Actions security specifically are emerging but limited
- **Koishybayev et al. — GitHub Actions workflow analysis**
- **Wu, Chen, Gao — GitHub Actions misconfigurations**
- Industry reports: Trail of Bits (substantive), Palo Alto Unit 42, Chainguard

**Gap we address:** Existing academic CI/CD work is primarily empirical (measurement of misconfigurations, static analysis for vulnerabilities). No formal framework for reasoning about multi-stage compromise.

## Refinement and Verified Systems

- **Abadi & Lamport — refinement mappings**
- **Back & Kurki-Suonio — stepwise refinement**
- **seL4, CompCert — verified systems as exemplars**

**Relevance:** Refinement-based mitigation analysis uses these foundations. We don't prove full functional correctness of anything, but we use refinement relations to compare vulnerable and hardened systems.

## To Verify / Add

- Recent (2023-2026) papers specifically on SLSA formalization
- Any academic treatment of the TeamPCP incident once published
- Xygeni, tj-actions, and Nx breach analyses
- Formal models of blockchain-based C2 (novel in TeamPCP via ICP canisters)
- Verification efforts in OpenSSF or SLSA working groups

## Writing Strategy for Related Work Section

Structure the related work section around the gap we address, not chronologically or by tool family:

1. Attack graphs — mature but predate CI/CD threat models
2. Probabilistic security analysis — rare application to supply chain
3. Empirical supply chain studies — lack formal compositional reasoning
4. CI/CD security — emerging but empirical/static-analysis-focused
5. Engineering frameworks (SLSA, in-toto) — informal semantics

Close with an explicit positioning paragraph: "Our work differs from prior art in three ways: (1) formal framework specifically for multi-stage compromise in automated workflows, (2) dual TLA+/PRISM formalism combining reachability and quantitative claims, (3) validation methodology combining corpus, incident reconstruction, and rate calibration."
