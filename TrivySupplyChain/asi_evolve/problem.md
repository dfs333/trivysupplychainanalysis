# Problem seed — minimal-cost mitigation discovery for the Trivy supply-chain attack

**Goal.** Find the cheapest defender mitigation *policy* that the formal model proves
reduces downstream compromise to zero for the March-2026 Trivy / "TeamPCP" GitHub Action
supply-chain attack.

**Levers (the candidate policy).**
- `fraction_sha_pinned ∈ [0,1]` — the share of victim workflows migrated from floating
  tag references to full commit-SHA pins. Operationally costly at scale (ongoing toil
  across every consuming repo).
- `rotation_complete ∈ {false,true}` — whether the residual Aqua CI service-account
  credential (left valid after the February incident) is fully rotated and revoked. A
  cheap one-off action.

**Oracle.** `evaluate.py` model-checks each candidate with the Layer 3 PRISM MDP
(`trivy_propagation.prism`) and returns:
`score = −(compromise_fraction + cost)`, where `compromise_fraction` is the
PRISM-computed expected share of the population compromised and
`cost = 0.30·fraction_sha_pinned + 0.05·rotation_complete`.

**What a good search should discover.** Complete credential rotation alone drives
`compromise_fraction → 0` at the lowest cost — i.e., the February remediation, had it
been complete, would have prevented the March attack class. SHA-pinning is an
independent, more expensive safe alternative; partial measures leave residual risk
proportional to the un-pinned tag fraction. This mirrors the Layer 2 / Layer 3 finding
that *partial* rotation is insufficient.

**Why this is a sound use of ASI-Evolve.** ASI-Evolve performs empirical optimization,
not verification. Correctness here is supplied entirely by the PRISM model checker; the
evolutionary loop only *searches the policy space* against that verified oracle. No
candidate is ever trusted on the LLM's say-so — each is model-checked before it scores.
