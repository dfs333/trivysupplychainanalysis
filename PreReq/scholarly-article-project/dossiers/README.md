# Incident Dossiers

Each dossier is the evidentiary foundation for reconstructing one incident in our formalism. Dossiers are the primary input to the six-step reconstruction process documented in `docs/validation-methodology.md`.

## Dossier Format

Every dossier file has the following sections:

1. **Incident Summary** — one-paragraph description
2. **Primary Sources** — victim and vendor statements
3. **Secondary Analyses** — independent security vendor reports (≥3)
4. **Technical Artifacts** — git history, IOCs, payloads
5. **Claims Table** — structured extraction with source, cross-references, confidence
6. **What the Attacker Did NOT Do** — negative-space constraints
7. **Load-bearing Claims with Medium-or-Low Confidence** — flagged for sensitivity analysis
8. **System Boundary** — in-model vs. environment (feeds Step 2 of reconstruction)
9. **Pre-Attack State Mapping** — claim-to-Init mapping (feeds Step 3)
10. **Attack Trace** — step-by-step documented attack (feeds Step 4)
11. **Mitigations** — documented fixes and their mechanisms (feeds Step 5)

## Dossiers Present

- `trivy-teampcp.md` — Trivy / TeamPCP campaign, March 2026. Primary incident.

## Dossiers Potentially Planned

Additional incident reconstructions could strengthen the validation but are not required for the initial paper. Candidates if pursued:
- `tj-actions-changed-files.md` — March 2025. Same attack class (mutable tag hijacking).
- `xz-utils.md` — CVE-2024-3094. Different threat model: long-term maintainer trust accumulation.

## Source Quality Standards

**High-confidence sources:**
- Vendor security advisories with technical detail
- Microsoft Security Blog technical writeups
- Independent security research (Wiz, ReversingLabs, Endor Labs, Unit 42, SANS ISC)
- CISA advisories
- CVE/NVD entries with details

**Medium-confidence sources:**
- Vendor marketing blogs referencing incidents
- Journalistic coverage
- Forum posts citing authoritative sources

**Treat with caution:**
- Single-source technical claims, especially about causation
- Attribution claims (useful but rarely load-bearing for our formal claims)
- Victim counts (often estimates)

## Cross-Referencing Rule

Load-bearing claims for the formal model require ≥2 independent sources. "Independent" means not citing each other. If Vendor A's blog is the primary source and Vendor B merely quotes Vendor A, that's one source, not two.

## Negative-Space Cataloging

Every dossier must include a "What the attacker did NOT do" section. Absence of behavior is often as informative as presence for constraining the model. Examples:
- Attacker had capability X but did not exercise it → model should not flag X as an enabled transition that would have led to additional compromise
- Attacker had access for duration T but did not perform action Y within T → model should reflect that Y was either not a priority or required capability the attacker lacked

## Confidence Labels

- **High:** multi-source, technically detailed, internally consistent across sources
- **Medium:** corroborated but with some inference, or sources possibly derivative
- **Low:** single-source, or significant uncertainty in the claim itself
