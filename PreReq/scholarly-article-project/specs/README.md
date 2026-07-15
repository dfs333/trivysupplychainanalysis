# Specifications Directory

Formal specifications for the paper. Each spec models one incident or one abstract framework component.

## Files

### `trivy-compromise.tla` + `trivy-compromise.cfg`
TLA+ specification modeling the TeamPCP / Trivy compromise of March 2026. See `dossiers/trivy-teampcp.md` for the evidence grounding.

**What it models:**
- Maintainer credential lifecycle (valid/rotated) including partial rotation
- GitHub Actions tag-to-commit mapping (mutable) and force-push operations
- Victim runner execution with tag-based vs. SHA-based resolution
- Secret exfiltration on malicious-commit execution
- SHA-pinning mitigation adoption

**Properties checked:**
- `NoExfiltration` — safety invariant, attacker never learns any secret. Should be violated in vulnerable config.
- `PinningPreventsExfil` — conditional invariant, holds when all victims SHA-pin.
- `VulnerableConfigHolds` — characterizes when the residual-access attack path is live.

**How to run:**
```bash
# With TLC (requires Java 11+ and tlc2 on PATH)
tlc2 -config trivy-compromise.cfg trivy-compromise.tla
```

**Expected behavior:**
The vulnerable-baseline configuration (this `.cfg`) should produce a counterexample trace where:
1. Attacker starts with `AquaServiceAcct` credential, unrotated
2. Attacker executes `ForcePushTag` on some (action, tag) pair to point at `Malicious`
3. A victim executes `RunnerExecute` on that (action, tag)
4. `attackerKnowledge` becomes non-empty, violating the invariant

Compare the TLC counterexample to the documented attack trace in `dossiers/trivy-teampcp.md` §"Documented Attack Trace". Structural match is the validation claim.

### Planned

- `trivy-compromise-mitigations.cfg` variants:
  - `cfg-rotated-completely` — all creds rotated in Init; NoExfiltration should hold
  - `cfg-all-sha-pinned` — all victims SHA-pinned; NoExfiltration should hold
  - `cfg-both-mitigations` — defense in depth

- `trivy-compromise.prism` — PRISM MDP companion model with calibrated rates from Layer 1 corpus

- `tj-actions-compromise.tla` — second incident reconstruction (planned)

- `workflow-framework.tla` — generic workflow framework that specific incidents instantiate (longer-term refactor once ≥2 incidents are complete)

## Conventions

See `docs/formal-methods-approach.md` for:
- Abstraction level conventions
- State variable and action naming
- Property classes and how to express them
- TLC vs. Apalache selection
- TLA+ to PRISM correspondence rules

## Sanity Checks Before Publishing Results

Run in order:

1. **Type check:** verify `TypeOK` is invariant. If not, there's a type bug.
2. **Trace match:** verify the TLC counterexample for `NoExfiltration` violation structurally matches the dossier attack trace. If not, either the model is wrong or the dossier is wrong; investigate.
3. **Mitigation check:** verify each mitigation configuration produces the expected result (holds/fails) per the Expected Results Table in the dossier.
4. **Scale check:** increase constants (more victims, more tags) and verify TLC still terminates in reasonable time. If not, switch to Apalache.
5. **Sensitivity check:** vary the modeled assumptions (especially medium-confidence ones from the dossier) and verify the qualitative conclusions hold.
