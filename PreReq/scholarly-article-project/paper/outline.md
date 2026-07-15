# Paper Outline

Working title: **A Formal Framework for Quantifying Multi-Stage Compromise in Automated Software Workflows**

Target venue: USENIX Security / CCS / ESORICS / CSF (CSF is best fit for methods-forward framing).

## Abstract (to write last)

Roughly: modern software supply chain attacks compromise through multiple stages within routine CI/CD workflows. Existing quantitative approaches use ad hoc attack graphs or CVSS-derived scores that don't compose soundly across stages. We present a formal framework combining TLA+ reachability and PRISM probabilistic model checking for compositional reasoning about multi-stage compromise. We validate structurally against a corpus of 10,000+ real GitHub Actions workflows, by reconstruction of the documented Trivy/TeamPCP incident, and by rate calibration against OSV.dev. The framework correctly distinguishes complete vs. partial applications of standard mitigations — including explaining why Aqua Security's February 2026 incomplete remediation enabled the March TeamPCP attack.

## §1 Introduction

- Motivate with recent incidents: TeamPCP campaign (2026), XZ (2024), tj-actions (2025), SolarWinds (2020), Codecov (2021)
- Pattern: attacks are multi-stage and exploit trust relationships within routine automated workflows
- Observation: existing quantitative approaches use ad hoc models that don't compose soundly
- Our contribution: formal framework with three-layer public-data validation
- Non-goals: not a runtime detection system, not a replacement for SLSA/in-toto, not a full verification of CI/CD platforms

## §2 Background and Threat Model

### §2.1 Automated software workflows
GitHub Actions, GitLab CI, Jenkins, Argo — common structure: trigger → jobs → steps with actions/plugins → artifacts → distribution.

### §2.2 Trust relationships in workflows
Tag references, SHA pins, credential lifecycles, runner environments, artifact resolution. Mutable trust edges (tags, branches) vs. immutable (content-addressed SHAs).

### §2.3 Multi-stage supply chain compromise
Definition: attack where stage N's output is a precondition for stage N+1 to be executable by the attacker. Examples from recent literature.

### §2.4 Threat model
Principals, capabilities, attacker goals. Public-data-only validation constraint explicit.

## §3 Formal Framework

### §3.1 Language fragment for workflows
TLA+ module structure: principals, credentials, artifacts, trust edges, mitigations. Grammar-ish presentation.

### §3.2 PRISM companion model
MDP / CTMC structure parallel to TLA+. State variable correspondence table.

### §3.3 Properties of interest
- Safety invariants (no exfiltration, no unauthorized artifact)
- Conditional invariants (holds under mitigation M)
- Reachability / residual-access properties
- Quantitative (expected time, fraction compromised)

### §3.4 Refinement-based mitigation analysis
Formal statement of what it means for mitigation M' to strictly improve on M.

## §4 Validation Methodology

### §4.1 Three-layer triangulation
Brief overview.

### §4.2 Layer 1: corpus analysis
Methods and sample size.

### §4.3 Layer 2: incident reconstruction
Six-step methodology summary.

### §4.4 Layer 3: rate calibration
OSV, Backstabber, dwell-time analysis.

### §4.5 Sensitivity analysis
Parametric model checking approach.

## §5 Evaluation

### §5.1 Corpus coverage (Layer 1)
Results table: coverage percentage, uncaptured constructs, calibrated priors.

### §5.2 Incident reconstruction (Layer 2)

Primary case study: Trivy / TeamPCP campaign
- Dossier summary
- System boundary
- Instantiated Init with citations
- Trace-match table
- Mitigation results table
- Assumption traceability

This section demonstrates the framework's ability to reconstruct a documented multi-stage attack and verify that the formalism correctly distinguishes vulnerable from mitigated configurations.

### §5.3 Quantitative results (Layer 3)
PRISM output: expected compromise times, population fractions. Comparison to observed rates in OSV.

### §5.4 Sensitivity analysis
How results change across plausible parameter ranges.

## §6 Discussion

### §6.1 What the framework expresses well
Trust-mutation attacks, credential lifecycle mistakes, mitigation refinement.

### §6.2 What the framework does not express
Social engineering dynamics, payload detection, runtime behavioral analysis. Not a replacement for empirical/ML approaches; complementary.

### §6.3 Threats to validity
- Public-data selection bias
- Corpus representativeness
- Abstraction level trade-offs
- Load-bearing medium-confidence assumptions per incident
- Timing abstraction

### §6.4 Implications for practice
- Why partial remediation fails (formally)
- Why SHA pinning is essential (formally)
- Why SLSA levels should have formal semantics

## §7 Related Work

(See `docs/related-work.md` for draft content)

## §8 Conclusion

- Recap contribution
- Future work: compose stages across ecosystems (the cascade modeling we deferred); extend to non-CI/CD automated workflows (Kubernetes controllers, CRON jobs, bot-triggered workflows); additional incident reconstructions for broader validation; mechanize proofs in Coq/Isabelle if CSF demands; empirical validation with industry partner (future paper)

## Appendices

- **A.** Full TLA+ specs
- **B.** Full PRISM models
- **C.** Assumption traceability tables per incident
- **D.** Corpus extraction schema and reproducibility notes
- **E.** Practitioner reviewer acknowledgments and their review scope

## Writing Tips

- Every formal claim has a sentence stating its scope and evidence.
- Every assumption gets an evidence citation or is flagged as a modeled hypothesis.
- Every quantitative result has a sensitivity footnote.
- No claim survives that lacks one of: proof, model-checking output, cited evidence, explicit assumption.
