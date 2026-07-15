# Formal Methods Approach

## Tool Selection Rationale

### TLA+ (primary)
- Strong tool support: TLC for finite-state model checking, Apalache for symbolic/parametric
- Well-suited to reasoning about trust relationships, reachability, invariants
- Readable by a broader audience of security researchers than, say, Isabelle/HOL
- Temporal logic is sufficient for our property classes

### PRISM (companion, for quantitative claims)
- Mature tool for probabilistic model checking
- Supports MDPs (non-determinism + probability, good for adversarial rate modeling) and CTMCs (continuous-time, good for rate-based ecosystem modeling)
- Parametric model checking supports sensitivity analysis natively
- Kwiatkowska's group has prior work in adjacent domains we can build on

### Alloy (tertiary, optional)
- Considered for static trust-graph visualization
- Useful if reviewers want a visual artifact for the trust model
- Not required for core contribution

### Why NOT others
- **Coq/Isabelle/HOL:** Overkill for reachability properties. Time cost too high relative to additional rigor. Would be justified if we were proving cryptographic properties or full refinement proofs, but we're not.
- **CSP/FDR:** Process algebra fits communicating-process modeling but less natural for the credential-lifecycle and trust-mutation properties we care about.
- **Uppaal:** Real-time properties would fit, but we're abstracting timing into rates in PRISM. Adding timed-automata reasoning would duplicate effort.

## Abstraction Level (Critical)

**The rule:** model trust relationships and data flow, NOT payload details or protocol semantics.

**Test of correct abstraction:** Can the spec distinguish the vulnerable system from the patched system?
- YES → correct level
- NO → refine

**Test of over-abstraction:**
- If spec models Bash tokenization → over-modeled, remove
- If spec models git object storage internals → over-modeled, remove
- If spec models TLS handshake → over-modeled, remove

**Test of under-abstraction:**
- If spec cannot distinguish tag reference from SHA pin → under-modeled, refine
- If spec cannot express partial credential rotation → under-modeled, refine
- If spec treats all secrets as equivalent when mitigation depends on secret type → under-modeled, refine

## State Variable Conventions

For consistency across specs:

- `Principals` / `Maintainers` / `Attackers` — named sets for authorization reasoning
- `Secrets` — abstract identifiers; attributes modeled only when mitigation depends on them
- `Artifacts` / `Commits` / `Packages` — opaque identifiers with a single content label (benign/malicious)
- `Trust edges` — expressed as resolution functions that map references to concrete artifacts
- `Attacker knowledge` — a set, grown by union on exfiltration actions
- `Mitigation state` — per-principal or per-victim flags controlling action guards

## Action Conventions

- Actions are atomic state transitions
- Every action that represents attacker capability must be guarded by an explicit capability predicate
- Mitigation adoption is a separate action (not baked into Init) so we can verify adoption dynamics
- Credential rotation is parameterized by the set rotated (to model partial vs. full rotation)

## Property Classes

1. **Safety invariants** — e.g., `attackerKnowledge = {}` never becomes false. Verified by TLC or Apalache.
2. **Conditional invariants** — e.g., `all victims SHA-pinned => safety invariant holds`. Verified by restricting Init.
3. **Reachability / liveness** — e.g., "there exists a reachable state where...". Expressed carefully; TLA+ `<>` is liveness under fairness, which we typically don't want. Prefer invariant-about-reachable-states formulation.
4. **Quantitative** — expected values, probabilities, hitting times. Expressed in PRISM using PCTL or CSL.

## Correspondence Between TLA+ and PRISM Models

Both model the same system. The correspondence is documented explicitly:

- State variables are in 1-1 correspondence (or PRISM has fewer, with TLA+ adding auxiliary variables for property expression)
- Actions in TLA+ correspond to transitions in PRISM
- TLA+ guards correspond to PRISM action enabling conditions
- TLA+ non-determinism corresponds to PRISM MDP non-determinism; probabilities are added on top in PRISM where public data supports calibration
- Reachability in TLA+ corresponds to positive-probability reachability in PRISM

A paper appendix shows the correspondence line-by-line for at least one incident's spec.

## Conventions for Spec Files

Every `.tla` spec file should have:

1. Module header with module name matching filename
2. Comment block at top explaining:
   - What system is being modeled
   - Which properties are checked
   - Which evidence dossier provides the grounding
3. Explicit `CONSTANTS` section for all parameters
4. Explicit `VARIABLES` section
5. `TypeOK` type invariant
6. `Init` predicate with comments tying each line to dossier claims
7. Named actions, each with a comment explaining what real-world event it represents
8. `Next` combining actions
9. `Spec` definition
10. Property section with each property commented with its scholarly purpose

Every `.tla` spec file is accompanied by a `.cfg` file specifying:
- Constant instantiations for TLC
- Invariants to check
- Properties to check
- Any symmetry reductions

And a `README.md` in `specs/` explaining:
- What each spec models
- What a passing/failing run indicates
- Known limitations and scope

## Apalache vs. TLC Selection

- **TLC:** first-pass verification, small configurations, quick iteration
- **Apalache:** larger state spaces, parametric configurations, when TLC blows up

Rule of thumb: develop with TLC, scale with Apalache, report both.
