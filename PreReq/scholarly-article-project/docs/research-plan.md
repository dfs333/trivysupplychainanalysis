# Research Plan

## Thesis

A formal framework combining TLA+ reachability analysis with PRISM probabilistic model checking enables sound quantitative reasoning about multi-stage supply chain compromise in automated workflows — where existing approaches using ad hoc attack graphs or CVSS-derived scores do not compose correctly across stages. The framework is validated structurally against a corpus of real workflows, by reconstruction of multiple documented incidents, and by rate calibration against public malicious-package datasets.

## Research Questions

1. **RQ1 (Formalization).** What is a minimal formalism expressive enough to capture the trust relationships, privilege transitions, and temporal dependencies of multi-stage compromise in automated workflows, while remaining small enough to verify with existing tools?

2. **RQ2 (Mitigation analysis).** Can the formalism distinguish between *complete* and *partial* applications of standard mitigations (SHA pinning, credential rotation, OIDC scoping, ephemeral runners) in ways that correspond to documented real-world outcomes?

3. **RQ3 (Quantitative composition).** What quantities about multi-stage attacks (expected time to compromise, fraction of population compromised within window W, residual risk after mitigation M) can be computed soundly under explicit parameter uncertainty?

4. **RQ4 (Faithfulness).** To what extent does a formal model calibrated from public data alone predict the outcomes of documented incidents, and which kinds of incidents resist faithful reconstruction from public data?

## Contributions Claimed

- A compositional formalism for automated workflow compromise, with explicit modeling of trust edges, credential lifecycles, and artifact resolution semantics.
- Reconstruction of N (≥3) documented multi-stage incidents, with matched attack traces and mitigation deltas.
- Quantitative analysis of mitigation efficacy, with sensitivity bounds from public data calibration.
- Open-source release of all specs, incident dossiers, and corpus analysis code.

## Phased Plan

### Phase 1 — Foundations (current)
- [x] Topic and venue selection
- [x] Methodology framework
- [x] Primary incident selection (Trivy/TeamPCP)
- [x] TLA+ spec sketch for Trivy
- [x] Evidence dossier skeleton for Trivy
- [ ] **Complete Trivy TLA+ spec** → runnable TLC
- [ ] **Run mitigation results table** for Trivy
- [ ] PRISM companion model for Trivy (MDP)
- [ ] First pass at sensitivity analysis

### Phase 2 — Layer 1 corpus analysis
- [ ] Corpus extraction pipeline (GitHub Archive BigQuery → structured dataset)
- [ ] Feature extraction schema (see `corpus-analysis/extraction-schema.md`)
- [ ] Run corpus extraction on 10,000+ workflows
- [ ] Compute empirical priors for PRISM model parameters
- [ ] Coverage analysis (what fraction of real-world constructs the formalism captures)
- [ ] Document exclusions explicitly

### Phase 3 — Additional validation (optional)
- [ ] **Consider second incident** for additional validation strength
- [ ] If adding second incident: follow the six-step reconstruction methodology

### Phase 4 — Layer 3 calibration
- [ ] OSV.dev ingestion pipeline
- [ ] Backstabber's Knife Collection integration
- [ ] Rate calibration for PRISM parameters
- [ ] Cross-check: model predictions vs. observed historical frequencies

### Phase 5 — Paper
- [ ] Skeleton + outline
- [ ] Drafts of §3 (framework), §4 (properties), §5 (validation)
- [ ] Practitioner threat-model review (OpenSSF working group)
- [ ] Internal review cycle
- [ ] Submission

## Risk Register

| Risk | Impact | Mitigation |
|---|---|---|
| TLA+ state space explodes for realistic configurations | High — can't verify real properties | Use Apalache (symbolic) for larger configs; keep TLC for small-config correctness |
| PRISM parameters not calibratable from public data | Medium — quantitative claims weakened | Fall back to sensitivity analysis across plausible ranges |
| Load-bearing assumption (e.g., Aqua Feb incident as root cause) later disproven | Medium — specific incident correspondence weakens | Structure claims so general formal results survive without the correspondence |
| Corpus biases skew priors | Medium — priors wrong | Analyze multiple corpora (popular repos + random sample + enterprise-flavor repos) |
| Second incident doesn't fit the formalism cleanly | High — suggests formalism is narrow | Either (a) extend formalism with justification or (b) pick different second incident |
| Reviewer pushes back on abstraction level | Medium — rewrite required | Defensive documentation of every modeling choice with explicit rationale |

## Timing Assumptions

This plan does not hardcode calendar dates because they depend on availability. Rough ordering:

1. Complete Phase 1 before anything else — Trivy spec must verify before building companion models or additional validation.
2. Phases 2 and 3 can proceed in parallel.
3. Phase 4 requires Phase 2 complete (priors feed calibration).
4. Phase 5 drafting can start once Phase 1 is complete; final drafts need Phases 2–4.

## What Success Looks Like

A submission-ready paper that:
- States a precise formal framework with proven properties
- Contains one rigorously reconstructed incident with mitigation-delta analysis
- Contains corpus-calibrated quantitative results with sensitivity bounds
- Contains an honest threats-to-validity section
- Has been reviewed by ≥3 practitioners thanked in acknowledgments
- Is ready for USENIX Security, CCS, ESORICS, or CSF
