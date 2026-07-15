# Validation Methodology

The core challenge for a formal methods paper using only public data: convincing reviewers the model is faithful to reality. We address this with three layers of triangulation plus sensitivity analysis plus practitioner review.

Each layer has a corresponding detailed six-step methodology document:
- Layer 1: `docs/layer-1-methodology.md`
- Layer 2: below (this document, §"Layer 2")
- Layer 3: `docs/layer-3-methodology.md`

This document summarizes each layer; the detailed methodology docs specify execution.

## Layer 1: Structural Faithfulness (Corpus Analysis)

**See `docs/layer-1-methodology.md` for the full six-step methodology.**


**Goal:** Demonstrate that the formalism's abstract syntax covers what real automated workflows actually do.

**Approach:**
1. Pull a large sample of real GitHub Actions workflows. Sources:
   - GitHub Archive BigQuery dataset (`githubarchive` public dataset)
   - Direct GitHub API scraping (use PyGithub, rate-limit aware)
   - Aim for 10,000+ workflows across language ecosystems
   - Include both popular repos (visible) and random samples (unbiased)

2. For each workflow, extract features the formalism claims to model:
   - Trigger events (`push`, `pull_request`, `workflow_run`, `pull_request_target`, `workflow_dispatch`, schedule)
   - Permission scopes (`GITHUB_TOKEN` permissions, default vs. explicit)
   - Secret usage patterns
   - Action references (pinned to SHA vs. floating tag vs. branch)
   - Runner types (hosted vs. self-hosted)
   - Job dependencies and matrix strategies
   - Artifact flows between jobs
   - Reusable workflow usage
   - Composite action usage

3. Verify abstract syntax coverage. Edge cases to expect and handle:
   - `workflow_run` triggers (secondary workflows)
   - Reusable workflows (`uses: owner/repo/.github/workflows/x.yml`)
   - Matrix strategies
   - Composite actions
   - Self-hosted runner labels

4. Document coverage explicitly:
   > "Our model captures X% of constructs observed in the corpus; the remaining Y% consists of [enumerated list], which we argue are orthogonal to the compromise properties under study because [justification per category]."

5. Compute empirical prior distributions for PRISM model parameters:
   - Frequency of unpinned actions (by percentile)
   - Frequency of overly permissive `GITHUB_TOKEN` scopes
   - Frequency of `pull_request_target` misuse
   - Distribution of secret counts per runner environment
   - Distribution of action dependency depth

**References for threat-modeling quality:**
- Trail of Bits' work on GitHub Actions security
- GitHub Security Lab's "Keeping your GitHub Actions and workflows secure" series

**Deliverable:** `corpus-analysis/coverage-report.md` with numbers and a `corpus-analysis/priors.json` with calibrated PRISM parameters.

## Layer 2: Incident Reconstruction (Primary Persuasive Validation)

**Goal:** Show that the formalism can reproduce the attack trajectories and mitigation effectiveness of documented historical incidents.

**Approach — the six-step methodology:**

### Step 1: Build the evidence dossier
For each incident, collect into a single `dossiers/<incident>.md`:
- **Primary sources** — victim statements, vendor advisories, CVE entries, CISA KEV catalog
- **Secondary analyses** — at least 3 independent security vendors for cross-reference
- **Technical artifacts** — git history, IOCs, payload samples

Extract claims into a structured table with columns: *claim, source, cross-references, confidence*.

Single-source claims are flagged. Load-bearing claims require ≥2 independent sources OR must be treated as modeled hypotheses with sensitivity analysis.

**Critically important:** also catalog what the attacker did NOT do. Absence of behavior constrains the model.

### Step 2: Identify system boundary
Write down explicitly:
- **In-model:** principals, trust edges, capabilities, data flows, mitigation states
- **Out-of-model:** attacker infrastructure, victim production systems, payload internals, protocol semantics below the abstraction level

This is critical for reviewer trust. The boundary is explicit; anything not in-model is either an environment assumption or out of scope for the formal claim.

### Step 3: Encode pre-attack state
Map each dossier claim to a TLA+ constant or initial state constraint. Each Init predicate line should be annotated with its source citation.

Keep finite domains small — TLC verification must terminate. Typical sizing: 2-5 principals, 3-5 victims, 2-3 action repos, 3-5 tags, 2-3 commits. You're not enumerating reality; you're exercising the structural property.

### Step 4: Encode attack as trace AND adversary
Two styles, both required:

- **Trace-based sanity check.** Write documented attack as specific action sequence. Assert it's a valid behavior of Spec. If TLC rejects it, model is wrong before anything else.

- **Adversary-based reachability check.** Run model checker with the safety property (e.g., `NoExfiltration`) as invariant. Counterexample trace is compared to documented attack structurally.

Produce a trace-match table:

| Step | Documented (from dossier) | Model counterexample |
|---|---|---|
| 1 | ... | ... |

Structural match is the persuasive artifact.

If TLC finds a shorter path than documented: multiple viable attack strategies existed and the attacker happened to pick a longer one. Worth discussing, not a bug.

### Step 5: Encode mitigation and re-check
For each documented mitigation, change the Init configuration and re-verify. Produce a results table:

| Configuration | Safety property | Secondary property | Matches reality? |
|---|---|---|---|

The scholarly payoff is showing the model correctly distinguishes **complete** vs. **partial** applications of mitigations in ways that match documented outcomes.

### Step 6: Document assumptions and their evidence
Two artifacts:

**Assumption traceability table:**

| Modeling element | Formalization | Evidence | Confidence | Sensitivity impact |
|---|---|---|---|---|

**Threats to validity section.** Required. Topics to address:
- Selection bias in public reporting
- Causation-vs-correlation for load-bearing claims
- Abstraction level trade-offs
- Corpus representativeness
- Timing abstraction (if using untimed spec)
- Any single-source claims in the dossier

The honest acknowledgment of load-bearing-but-medium-confidence assumptions is what makes CSF/USENIX reviewers trust the paper.

## Layer 3: Predictive Calibration

**See `docs/layer-3-methodology.md` for the full six-step methodology.**

**Goal:** Show the quantitative model's predictions are consistent with observed frequencies in public data.

**Approach:**

1. Ingest labeled malicious-package data:
   - OSV.dev advisory database
   - Backstabber's Knife Collection
   - MalOSS dataset
   - GitHub Advisory Database

2. Extract observable frequencies:
   - Malicious package publications per ecosystem per month
   - Time-to-detection distributions (from advisory publication dates)
   - Dependency propagation depths (from OSV affected-package lists)

3. For the PRISM model:
   - Compute predicted quantities (expected time to compromise given malicious dep enters ecosystem; fraction of pipeline population compromised within window W)
   - Compare predictions to observed rates
   - Where inconsistent: either revise model or explicitly flag a gap

4. Dwell-time calibration:
   - Incident reports document attacker dwell time
   - Model should produce dwell-time distributions consistent with these

**Caveat:** We don't observe compromised pipelines directly, only compromised packages. The calibration is indirect and requires explicit argument. Make this argument in the paper; don't paper over it.

## Sensitivity Analysis (Formal-Methods Obligation)

Because PRISM inputs are imperfect, we must:

1. Vary each input parameter across plausible ranges.
2. Report how conclusions change.
3. Use PRISM's parametric model checking or Storm's equivalent.

**Robustness threshold:** If mitigation ranking is stable across 10× parameter variation, that's a robust finding. If it flips, say so explicitly.

## Practitioner Review

Pre-formalization threat-model validation with 3-5 practitioners:
- Platform engineers
- CI/CD tool maintainers
- SLSA contributors
- OpenSSF working group members (meet publicly, generally welcoming)

Acknowledgments section names reviewers with their consent. This is a strong signal to reviewers that the problem wasn't invented in isolation.

## What the Paper's Validation Section Looks Like

Standard structure per incident:

1. **Dossier summary paragraph** — key facts + claims table
2. **System boundary figure** — what's in-model vs. environment
3. **Instantiated Init** — with source annotations
4. **Trace-match table** — documented attack vs. model counterexample
5. **Mitigation results table**
6. **Assumption traceability + threats to validity**

One incident done rigorously is a decent paper. Three incidents with shared framework is a strong paper.
