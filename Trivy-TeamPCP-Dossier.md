# Trivy / TeamPCP Campaign — Incident Dossier

**Incident date:** March 19–27, 2026 (primary compromise March 19; cascade through March 27)
**CVE:** CVE-2026-33634 (CVSS 9.4)
**Threat actor:** TeamPCP (tracked by multiple vendors; later reported to partner with LAPSUS$ and Vect ransomware group)

## Incident Summary

Between late February and late March 2026, the TeamPCP threat group conducted a cascading supply chain campaign that began with compromise of Aqua Security's Trivy vulnerability scanner and propagated across five ecosystems (GitHub Actions, Docker Hub, npm, OpenVSX, PyPI). The primary Trivy-stage compromise was executed by force-pushing 76 of 77 tags in the `aquasecurity/trivy-action` repository and all 7 tags in `setup-trivy` to point to malicious commits. Every CI/CD pipeline referencing these actions by tag name began executing attacker-controlled code on its next run, with no visible indication on GitHub.

The compromise is attributed to attacker retention of Aqua service-account credentials stolen in an earlier, incompletely remediated February 28 incident (an autonomous bot exploited a workflow vulnerability and stole a PAT; surface-level damage was remediated but residual access remained).

## Primary Sources

- Aqua Security's official incident disclosure (referenced by multiple downstream analyses)
- GitHub Security Advisory for `aquasecurity/trivy-action` and `aquasecurity/setup-trivy`
- CVE-2026-33634 NVD entry
- CISA Known Exploited Vulnerabilities catalog entry
- Mercor public disclosure (first confirmed downstream victim, 4TB data loss)

## Secondary Analyses

| Source | Strength | URL |
|---|---|---|
| Microsoft Security Blog | Tag-mutation technical mechanism | microsoft.com/en-us/security/blog/2026/03/24/detecting-investigating-defending-against-trivy-supply-chain-compromise/ |
| Wiz Research | Post-compromise attacker behavior | wiz.io/blog/tracking-teampcp-investigating-post-compromise-attacks-seen-in-the-wild |
| ReversingLabs | Payload structure, C2 analysis | reversinglabs.com/blog/teampcp-supply-chain-attack-spreads |
| Endor Labs | Feb→March causal chain, 3-stage payload | endorlabs.com/learn/teampcp-isnt-done |
| SANS ISC | Cascade timing, campaign-level view | sans.org/blog/when-security-scanner-became-weapon-inside-teampcp-supply-chain-campaign |
| Palo Alto Unit 42 | CanisterWorm, decentralized C2 | unit42.paloaltonetworks.com/teampcp-supply-chain-attacks/ |
| Arctic Wolf | Incident timeline, affected orgs | arcticwolf.com/resources/blog/teampcp-supply-chain-attack-campaign-targets-trivy-checkmarx-kics-and-litellm-potential-downstream-impact-to-additional-projects/ |
| Cato Networks | Cross-ecosystem attack pattern | catonetworks.com/blog/teampcp-supply-chain-attack/ |
| InvisiRisk | Build & CI/CD risk analysis | invisirisk.com/post/teampcp-how-a-supply-chain-attack-hit-build-systems-and-ci-cd-pipelines |
| Exposure Security | Executive briefing, full campaign narrative | exposuresecurity.com/briefings/teampcp-supply-chain-attack.html |

## Technical Artifacts

- Git history of `aquasecurity/trivy-action` and `aquasecurity/setup-trivy` (force-pushed tags visible in reflog / GitHub audit log)
- Malicious Trivy binaries starting with v0.69.4
- Malicious Docker Hub images
- C2 infrastructure: `checkmarx[.]zone` (Checkmarx KICS exfil), `83.142.209.203` (Telnyx exfil)
- Payload filename `tpcp.tar.gz` (TeamPCP → tpcp)
- LiteLLM malicious versions 1.82.7, 1.82.8
- Telnyx malicious versions 4.87.1, 4.87.2
- Trivy malicious version v0.69.4
- Attacker used Mullvad VPN exit nodes and InterServer VPS for operational infrastructure
- Resource naming patterns: "pawn", "massive-exfil" (TeamPCP prioritizes speed over stealth)

## Claims Table

| # | Claim | Sources | Confidence |
|---|---|---|---|
| 1 | Attacker force-pushed 76 of 77 `trivy-action` tags to malicious commits | Microsoft, SANS, Arctic Wolf | **High** |
| 2 | Attacker force-pushed all 7 `setup-trivy` tags to malicious commits | Microsoft, SANS | **High** |
| 3 | Tags are mutable references by default in Git; no visible UI indication of mutation on GitHub | Microsoft | **High** (matches Git semantics) |
| 4 | Primary vector was Aqua Security service-account credentials compromised earlier | Endor Labs, Arctic Wolf | **Medium** (load-bearing — see below) |
| 5 | Initial compromise: Feb 28 autonomous bot exploited workflow vulnerability, stole PAT | Endor Labs | **Medium** (single-source) |
| 6 | Aqua's February response remediated surface-level damage but left residual access | Endor Labs, Exposure Security | **Medium** (possibly derivative sources) |
| 7 | ~3 week gap between Feb 28 credential theft and March 19 tag mutation | Endor Labs timeline | **Medium** (single-source timing) |
| 8 | Malicious commits harvested environment variables, SSH keys, cloud tokens, K8s secrets, .env files, crypto wallets | Endor Labs, Wiz, ReversingLabs, Microsoft | **High** |
| 9 | Payload ran 3 stages: credential harvest → K8s lateral movement → systemd backdoor | Endor Labs | **High** (detailed technical description) |
| 10 | Exfiltration encrypted and sent to attacker-controlled domain | Wiz, ReversingLabs | **High** |
| 11 | Compromise cascade: Trivy → Checkmarx KICS (Mar 23) → LiteLLM (Mar 24) → Telnyx (Mar 27) → npm CanisterWorm | Multiple sources | **High** |
| 12 | CanisterWorm used Internet Computer Protocol (ICP) canisters as dead-drop C2 | Unit 42, SANS | **High** (novel technique) |
| 13 | Stolen npm tokens enabled self-propagating worm infecting 66+ npm packages | SANS, Unit 42 | **High** |
| 14 | Checkmarx compromise window: 12:58–16:50 UTC on Mar 23; resolved by 19:24 UTC | Cato Networks (citing Checkmarx) | **High** |
| 15 | LiteLLM versions 1.82.7 (10:39:24 UTC) and 1.82.8 (10:52:19 UTC) — 13 min apart — on Mar 24 | Endor Labs | **High** (precise timing) |
| 16 | Telnyx PyPI package ~3.75M total downloads; affected versions 4.87.1, 4.87.2 | ReversingLabs | **High** |
| 17 | LiteLLM ~95M monthly downloads | Endor Labs, Palo Alto Unit 42 | **High** |
| 18 | ~5,000+ organizations affected; ~300GB data and ~500K credentials exfiltrated | Exposure Security, Unit 42 | **Medium** (estimates) |
| 19 | TeamPCP later announced partnerships with LAPSUS$ and Vect ransomware | Wiz, Unit 42 | **High** but orthogonal to our formal claims |
| 20 | Mitigation #1: pin every GitHub Action to full commit SHA | SANS, Microsoft, Endor Labs | **High** (universally recommended) |
| 21 | Mitigation #2: audit workflows using `pull_request_target` (initial access vector) | SANS | **High** |
| 22 | Mitigation #3: rotate every secret accessible during compromise window | SANS | **High** |
| 23 | Chainguard research: organization-level action allowlists can be bypassed using commits from forked repos ("imposter commits") | SANS (citing Chainguard) | **High** (methodology detail) |

## What the Attacker Did NOT Do

This section constrains the model. Absence of these behaviors is documented across sources and means our formalism should not reason as if they occurred.

- **No direct source-code modification to Trivy itself** — only release artifacts and action tags were compromised. The core Trivy repository's source commits were not tampered with.
- **No social engineering of human maintainers** — the credential compromise was a service-account exploit, not account takeover via phishing.
- **No targeted victim selection at the Trivy stage** — mass exfiltration from any pipeline using the compromised actions, not selective.
- **No evidence of tampering with GitHub's authentication or authorization layer** — the attack used valid credentials, it did not exploit the platform.
- **No evidence that tags in unaffected repositories were mutated** — blast radius was scoped to what the compromised credential had permission to touch.

## Load-bearing Claims with Medium-or-Low Confidence

These claims are load-bearing for the `ResidualAccessVulnerability` property but have medium confidence. They must be flagged in the paper's threats-to-validity and analyzed via sensitivity:

1. **Claim #4-#7: Feb→March causal chain.** Primarily from Endor Labs with corroboration in Exposure Security (which may be derivative). If Aqua later discloses a different root cause, the *specific incident* correspondence weakens, though the *general formal result* about partial rotation remains.

**Mitigation strategy in the paper:** Structure the formal claim so it stands independent of the Feb→March specific link. The claim "partial credential rotation is insufficient to prevent tag-mutation attacks in our model" is true regardless. The claim "this is what happened in Trivy" depends on Endor Labs' reconstruction.

## System Boundary

**In-model:**
- Aqua Security service-account credentials and their rotation state
- `trivy-action` and `setup-trivy` repositories and their tag-to-commit mappings
- Victim GitHub Actions runners (abstract — one state per victim org)
- Secrets present in runner environment variables at execution time
- The attacker's knowledge set (secrets exfiltrated)
- Victim workflow configuration: tag reference vs. SHA pin
- Credential rotation actions and their completeness

**Out-of-model (environment assumptions):**
- How the attacker initially obtained the Aqua service-account credential in February
- Attacker C2 infrastructure (domain, IPs, ICP canisters)
- Victim production systems (Mercor's 4TB loss, K8s lateral movement consequences)
- Git object storage internals (tag mutation is atomic in the model)
- GitHub's internal authentication and authorization layer
- Payload internals (we model that malicious execution transfers secrets, not how)
- The downstream cascade (Checkmarx, LiteLLM, Telnyx, npm CanisterWorm) — scope this paper's formal claim to the Trivy stage; flag cascade composition as future work

## Pre-Attack State Mapping (feeds TLA+ Init)

| Modeling element | Formalization | Dossier claim | Confidence |
|---|---|---|---|
| Attacker holds Aqua service-account credential at start | `maintainerCreds = {AquaServiceAcct}` | #4, #5, #6 | Medium |
| Feb response did not rotate service account | `rotationState[AquaServiceAcct] = "valid"` | #6 | Medium |
| All tags initially benign | `tagMap = [a, t |-> c_benign]` | Pre-attack state implicit in all sources | High |
| Victims overwhelmingly use tag references | `pinningPolicy = [v |-> "tag"]` | From Layer 1 corpus analysis; SANS recommendation implies widespread tag use | High (when corpus analysis complete) |
| Secrets present in runner env | `victimSecrets[v] = {...}` non-empty | #8 | High |

## Documented Attack Trace

| Step | Description | Model action |
|---|---|---|
| 0 (out-of-model) | Feb 28: bot exploits Trivy workflow vulnerability, steals PAT | Init state captures outcome |
| 0 (out-of-model) | Feb: Aqua remediates surface damage but leaves service-account access | Init state captures outcome |
| 1 | Mar 19: Attacker force-pushes tags in `trivy-action` (76/77) and `setup-trivy` (7/7) | `ForcePushTag` |
| 2 | Victim pipelines resolve tag → fetch malicious commit → execute in runner context | `RunnerExecute` with `pinningPolicy = "tag"` |
| 3 | Malicious code reads runner environment variables, cloud tokens, SSH keys, K8s configs | Internal to `RunnerExecute` — `victimSecrets[v]` added to `attackerKnowledge` |
| 4 | Exfiltration to attacker C2 | Modeled as set-union (abstract) |
| 5 (cascade, out-of-scope) | Stolen npm tokens enable CanisterWorm on npm ecosystem | Future-work composition |
| 6 (cascade, out-of-scope) | Stolen Checkmarx/LiteLLM/Telnyx tokens enable PyPI/Actions compromises | Future-work composition |

## Documented Mitigations

| Mitigation | Mechanism | Model encoding |
|---|---|---|
| **SHA pinning** | Reference Action by 40-char commit SHA; bypass tag resolution entirely | `pinningPolicy[v] = "sha"` changes `RunnerExecute` resolution semantics |
| **Complete credential rotation** | Invalidate all credentials including service accounts | `rotationState[m] = "rotated"` for all `m` after incident; `maintainerCreds = {}` |
| **Audit `pull_request_target`** | Prevents initial-access vectors feeding credential theft | Out of scope for Trivy stage formalization but relevant for upstream February incident modeling |
| **Short-lived OIDC tokens instead of long-lived PATs** | Reduces credential retention window | Would require extending model with temporal credential lifetimes |
| **Organization-level action allowlists** | Restrict which actions can be used | Caveated: Chainguard showed these are bypassable via imposter commits from forks; model should reflect this |

## Expected Results Table

| Configuration | `NoExfiltration` | `ResidualAccessVulnerability` | Matches reality? |
|---|---|---|---|
| Tag refs + valid stolen cred (pre-March actual) | ❌ falsified | triggered | ✓ (attack occurred) |
| Tag refs + complete rotation | ✓ holds | not triggered | ✓ (counterfactual: no attack possible) |
| SHA pins + valid stolen cred | ✓ holds | not triggered | ✓ (protection even with residual cred) |
| SHA pins + complete rotation | ✓ holds | not triggered | ✓ (defense in depth) |

The last column is the validation claim: the model's predictions across all four configurations match documented reality (for config 1 and 3) or plausible counterfactuals (for 2 and 4).

## Threats to Validity (Incident-Specific)

- **Feb→March causal link.** Medium confidence. Sensitivity analysis should check: if the March credential was acquired through a different path, does the `ResidualAccessVulnerability` property still have predictive value? (Answer: yes, but the specific correspondence to this incident weakens.)
- **Partial rotation as stated root cause.** Appears in Endor Labs and Exposure Security, not in Aqua's own statements. Treated as modeled hypothesis.
- **Victim count and data volume** (5,000+ orgs, 300GB, 500K credentials). Estimates. Not load-bearing for formal claims.
- **Attribution to TeamPCP.** Not load-bearing for formal claims — the formalism reasons about capability, not identity.
- **Cascade modeling out of scope.** We explicitly scope the formal claim to the Trivy stage. Downstream effects (CanisterWorm, LiteLLM, etc.) are documented as evidence the stage-1 compromise provided inputs for stage-2 but are not verified as formal compositions. Future work.
