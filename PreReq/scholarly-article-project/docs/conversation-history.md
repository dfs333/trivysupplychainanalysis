# Conversation History

Full context and decisions from the prior discussion that led to this project.

## Topic Selection Decision

### Question posed
Whether to write a scholarly article on "Quantitative Analysis for Mitigation of Multi-Stage Supply Chain Attacks during Routine Automated Workflows" OR on "AI-Driven Threat Analysis."

### Analysis

**Supply Chain Attacks (CHOSEN):**
- More defensible scholarly choice given current landscape
- Narrower and more empirically tractable
- Addresses genuine gap post-SolarWinds, XZ Utils, npm/PyPI compromises
- Amenable to attack graphs, propagation probability modeling, pipeline-as-Markov-chain formulation
- Strong venue fit for security conferences
- High citation density

**AI-Driven Threat Analysis (REJECTED):**
- Broader and more saturated literature
- Large volume of survey papers already
- Unless staking out a very specific angle (LLM-based triage FP rates, adversarial robustness of ML-based EDR, SOC workflow explainability), risks being derivative
- Easier to write but harder to get accepted at serious venues
- Harder to make lasting contribution

### Shaping questions asked
1. Target venue? → Security conference preferred (USENIX/CCS/NDSS/ACSAC/CSF)
2. Data access? → Public data only
3. Methodological strength? → **Formal methods**

### Decision
Supply chain topic chosen because formal methods + public-data constraint fits it perfectly, and because existing literature in supply chain quantitative analysis has a specific gap around sound compositional reasoning that formal methods directly addresses.

### Combined topic option considered
"Quantifying the Efficacy of AI-Driven Anomaly Detection Against Multi-Stage Supply Chain Attacks in CI/CD Pipelines" — rejected as optional expansion; core contribution stays formal-methods-centric.

## Methodology Decisions

### Formal methods tool selection
- **TLA+ (primary)** with TLC or Apalache for reachability/invariant properties
- **PRISM (companion)** for quantitative/probabilistic claims (MDPs or CTMCs)
- **Alloy (tertiary)** for visualizing static trust-graph structure if useful
- Two formalisms for the same system, explicit correspondence documented
- CSF reviewers in particular appreciate seeing both qualitative reachability and quantitative risk on the same system

### Validation strategy
Three layers of triangulation (detailed in `validation-methodology.md`):
1. **Structural faithfulness** via corpus analysis of 10,000+ real GitHub Actions workflows
2. **Incident reconstruction** of documented real-world attacks (PRIMARY persuasive validation)
3. **Predictive calibration** against OSV.dev and Backstabber's Knife Collection

Plus: **sensitivity analysis** on all parameters (formal-methods-specific obligation when input probabilities come from imperfect data).

Plus: **practitioner threat-model validation** before formalizing (OpenSSF working groups, SLSA contributors). Acknowledgments section thanking named practitioners signals reviewer confidence that problem wasn't invented in isolation.

## Incident Reconstruction Methodology (Six Steps)

Detailed walkthrough established for how to reconstruct an incident for Layer 2 validation:

### Step 1: Build evidence dossier
- Collect primary sources (victim/vendor statements)
- Collect secondary analyses (≥3 independent security vendors for cross-reference)
- Collect technical artifacts (git history, IOCs, payloads)
- Extract into structured claims table with cross-reference count and confidence
- Flag single-source claims explicitly
- Also catalog what attacker did NOT do (constrains the model)

### Step 2: Identify system boundary
- Explicit list of what's in-model vs. environment
- Decide whether to include downstream cascades or scope to single stage
- Reviewers will ask; write it down

### Step 3: Encode pre-attack state
- Map each dossier claim to TLA+ constants or initial state constraints
- Keep finite domains small enough for TLC (5 victims, 5 tags, 3 commits typical)
- Annotate Init predicate with source citations

### Step 4: Encode attack as trace AND adversary
- **Trace-based:** assert documented attack sequence is valid behavior of Spec (sanity check)
- **Adversary-based:** run model checker, compare counterexample to documented attack
- Both styles check different things; do both

### Step 5: Encode mitigation and re-check
- Each distinct mitigation → separate Init configuration → re-verify
- Produce results table: configuration × property → holds/fails × matches reality?
- The scholarly payoff is showing the model correctly distinguishes complete vs. partial mitigations

### Step 6: Document assumptions and their evidence
- Assumption traceability table (modeling element, value, evidence, confidence, sensitivity)
- Threats to validity section (required)
- Honest flagging of load-bearing-but-medium-confidence assumptions gets reviewer respect

## Primary Incident Selection: Trivy/TeamPCP (March 2026)

### Why this incident
Selected from TeamPCP campaign because it matches every criterion:
- **Multi-stage with clean stage boundaries** — February incomplete remediation enabling March primary compromise
- **Routine automated workflow as execution context** — fires during ordinary CI runs
- **Crisp trust-model failure to formalize** — mutable version tags as root vulnerability
- **Documented mitigation with testable delta** — SHA pinning
- **Deep public forensics** — Microsoft, Wiz, ReversingLabs, Endor Labs, Arctic Wolf, SANS, Unit 42, Aqua's own advisory
- **Cascading composition demonstrable** — stage N credentials enable stage N+1 in other ecosystems

### Load-bearing but medium-confidence claims
- "February 28 bot exploit of workflow vulnerability was the initial access" (Endor Labs; inference)
- "Aqua's February remediation was incomplete, leaving residual access" (Endor Labs + Exposure Security; one possibly derivative of other)
- "Three-week gap between Feb and March compromise" (Endor Labs single-source timing)

These go in the sensitivity analysis, not the asserted claims.

## TLA+ Spec Sketch Produced

A complete TLA+ module `TrivyCompromise` was sketched with:
- 7 state variables (tagMap, commitContent, maintainerCreds, victimSecrets, runnerExec, attackerKnowledge, pinningPolicy, rotationState)
- 5 actions (StealCredential, PartialRotation, ForcePushTag, RunnerExecute, AdoptSHAPinning)
- 3 properties (NoExfiltration, PinningPreventsExfil, ResidualAccessVulnerability)

Key modeling decisions:
- Commits are opaque identifiers with single attribute (benign/malicious)
- Tag-vs-SHA distinction is the heart of the spec
- Credentials modeled as maintainer identities, not tokens
- `PartialRotation` action is what makes residual-access modeling possible
- `ForcePushTag` is guarded by credential validity (not just possession)
- Exfiltration is bulk (set union), not per-secret

Sanity checks to run first:
1. Tiny config (2 maintainers, 2 victims, 2 actions, 3 tags, 3 commits): verify NoExfiltration violated in vulnerable config, counterexample matches documented attack, PinningPreventsExfil holds when all pin
2. Check whether ForcePushTag action is too permissive (real attack replaced 76/77 tags, not all)
3. Sanity-check ResidualAccessVulnerability liveness property (may need to restate as invariant about reachable states)

## Reconstruction Results Table (Target)

For the Trivy incident, the paper will produce:

| Configuration | NoExfiltration | ResidualAccessVulnerability | Matches reality? |
|---|---|---|---|
| Tag refs + valid stolen cred (pre-March actual) | ❌ falsified | triggered | ✓ (attack occurred) |
| Tag refs + complete rotation | ✓ holds | not triggered | ✓ (counterfactual: no attack) |
| SHA pins + valid stolen cred | ✓ holds | not triggered | ✓ (protects even with residual cred) |
| SHA pins + complete rotation | ✓ holds | not triggered | ✓ (defense in depth) |

## Next-Step Decisions Left Open

1. **PRISM MDP translation.** Not yet sketched. Will parallel the TLA+ structure with rate-parameterized transitions.
2. **Alloy version.** Optional; only if reviewers want visual trust-graph artifact.
3. **Downstream cascade modeling.** Deferred — pick option (a) single-stage scope, flag cascade as future work, unless time permits.
4. **Additional incidents.** Consider adding a second incident reconstruction for stronger validation, but not required for initial paper.

## Paper Structure (Emerging)

Likely sections:
1. Introduction (motivating incidents, gap in existing formal work)
2. Background (attack graphs, CI/CD threat model, public datasets)
3. Formal framework (TLA+ language fragment for workflows, PRISM model schema)
4. Properties of interest (reachability, non-interference, refinement)
5. Validation
   - §5.1 Corpus analysis (Layer 1)
   - §5.2 Incident reconstruction (Layer 2) — Trivy/TeamPCP case study
   - §5.3 Rate calibration (Layer 3)
   - §5.4 Sensitivity analysis
6. Discussion (what the framework can/cannot express, threats to validity)
7. Related work
8. Conclusion and future work
9. Appendix: Assumption traceability tables
