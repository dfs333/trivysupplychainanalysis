# Layer 2 — Incident Reconstruction (TLA+)

### Trivy / "TeamPCP" GitHub Action supply-chain attack, formalized

This is the **Layer 2 ("Incident reconstruction") artifact** for the paper
*"Quantitative Analysis for Mitigation of Multi-Stage Supply Chain Attacks during
Routine Automated Workflows in CI/CD Pipelines."*

It is a [TLA+](https://lamport.azurewebsites.net/tla/tla.html) formal model of the
March-2026 compromise of the `trivy-action` / `setup-trivy` GitHub Actions, checked
with the **TLC** model checker. It does exactly what the *Layer 2 Workflow* document
prescribes: it encodes the **pre-attack system state** from the public dossier, then
asks TLC whether the documented attack is reachable, and whether each candidate
mitigation closes the path.

> **What this is, concretely.** A pure mathematical model. The "attacker", "victims",
> "secrets", and "exfiltration" are abstract symbols and set operations. Nothing here
> touches a real repository, credential, runner, or network. Running it is logic, not
> exploitation.

---

## 1. The result (the validation table *is* the validation)

Each row is one TLC run with a different initial state. Reproduce with `run-all.ps1`.

| Configuration | `NoExfiltration` | `ResidualAccessVulnerability` | Matches reality |
|---|---|---|---|
| Tag refs + valid stolen cred *(pre-March actual)* | **FAILS** (counterexample) | **triggered** | Yes — attack occurred |
| Tag refs + complete rotation | holds | not triggered | No attack |
| SHA pins + valid stolen cred | holds | not triggered | Protects even with residual cred |
| SHA pins + complete rotation | holds | not triggered | Full defense |

The load-bearing result is the **first vs. second row**: the model distinguishes
*complete* credential rotation (safe) from the *partial* rotation that actually
happened (still exploited). A formalism that flags partial rotation as insufficient is
saying something non-trivial that matches the documented incident causation.

The **first vs. third row** is the second independent finding: universal SHA-pinning
protects victims *even while the stolen credential remains valid* — the attacker can
still mutate tags (TLC explores all 1024 of those states), but no victim resolves the
action through a tag, so the malicious commit never executes.

### Adversary counterexample (cfg_vuln) — matches the dossier trace structurally

```
State 1  [Init]            attacker holds AquaServiceAcct; all tags -> c_benign
State 2  ForcePushTag(trivy_action, tg1)     tagMap[trivy_action,tg1] -> c_malicious
State 3  RunnerExecute(v1, trivy_action, tg1)       attackerKnowledge = {v1}
```

| Documented (dossier) | TLC counterexample |
|---|---|
| 1. Attacker holds Aqua service account | `[Init]` (attacker starts with credential) |
| 2. Force-push tags to malicious commits | `ForcePushTag(trivy_action, tg1, c_malicious)` |
| 3. Victim pipeline executes on next run | `RunnerExecute(v1, trivy_action, tg1)` |
| 4. Exfiltration to attacker C2 | `attackerKnowledge' = victimSecrets[v1]` (within `RunnerExecute`) |

---

## 2. Model at a glance

**Constants** (`5 victims, 5 tags, 3 commits` — "more than enough to exercise the
reachability claim"), plus two mitigation knobs that select the table row:

| Constant | Meaning |
|---|---|
| `Victims` | `{v1..v5}` — anonymous victim organizations (no direct Action-execution victim was individually named publicly) |
| `Repos` | `{trivy_action, setup_trivy}` — the two compromised action repos |
| `Tags`, `Commits` | mutable tag refs; commits incl. `BenignCommit`, `MaliciousCommit` |
| `AquaServiceAcct` | the Aqua CI service account (the residual February credential) |
| `UniversalSHAPin` | **knob:** TRUE ⇒ every victim pins by full SHA; FALSE ⇒ floating tag |
| `ServiceAcctRotated` | **knob:** TRUE ⇒ credential fully rotated/revoked; FALSE ⇒ left valid |

**Variables:** `tagMap`, `pinningPolicy`, `rotationState`, `maintainerCreds`,
`attackerKnowledge`, `victimSecrets`, `victimPin`.

**Actions:**
- `ForcePushTag(r,t)` — guarded by `AttackerCanForcePush` (attacker holds a *valid*
  service-account credential). Atomically repoints a tag to `MaliciousCommit`.
- `RunnerExecute(v,r,t)` — a victim's routine workflow runs the action; if the commit
  it resolves is malicious, that victim's secrets union into `attackerKnowledge`.

**Properties:**
- `NoExfiltration` (safety invariant) — no victim secret is ever known to the attacker.
- `ResidualCredentialValid` — config-determined predicate: an un-rotated valid
  credential exists. *ResidualAccessVulnerability* is **triggered** iff this holds **and**
  `NoExfiltration` fails (i.e., the residual access is the cause of a reachable
  compromise) — which is why row 3 (SHA pins) shows "not triggered" despite the
  credential still being valid.
- `TraceConsistency` (in `MCTrace.tla`) — the scripted documented path reaches the
  documented compromise (Step 4 trace-based sanity check).

---

## 3. Evidence table — every encoded fact traces to the public dossier

This is the Step 3 obligation: *"reproduce this init predicate annotated with source
citations — evidence table made precise."* Sources are the dossier cited by the paper.

| Model element | Dossier claim it encodes | Source |
|---|---|---|
| `MaliciousCommit`, `ForcePushTag` repoints tags | Attacker force-pushed tags to malicious commits (76/77 on `trivy-action`, 7/7 on `setup-trivy`) | Aqua Security disclosure; Microsoft Security Blog (tag-mutation mechanism) |
| `AquaServiceAcct` + `maintainerCreds` + `rotationState="valid"` | Pre-existing Aqua CI service-account credential, residual from the February incident, left valid | Endor Labs (Feb→Mar causal chain) |
| `AttackerCanForcePush` guard | Tag-write permission on the action repo was the attacker's stage-2 capability | Aqua disclosure; GitHub Security Advisory |
| `victimSecrets` (cloud creds, SSH keys, K8s configs, CI secrets) | Secrets enumerated in compromised runner environments | Wiz Research; Endor Labs |
| `RunnerExecute` ⇒ `attackerKnowledge ∪ victimSecrets[v]` | Malicious code read the runner env and exfiltrated to attacker C2 | ReversingLabs (payload structure); Wiz (post-exfil behavior); published IOCs (C2 domains/IPs), `tpcp.tar.gz` |
| `v1..v5` anonymous victim orgs; Mercor cited as *cascade* evidence | Mercor, the campaign's first publicly named victim, attributes its breach to the follow-on LiteLLM compromise (stage 2 of the TeamPCP campaign) — evidence for the Layer-3 multi-stage cascade, not a documented direct trivy-action execution | Mercor public disclosure (2026-03-31); TechCrunch; The Register |
| `pinningPolicy = [v ↦ "tag"]` (default) | Corpus-calibrated worst case: victims reference actions by floating tag | Layer 1 corpus analysis (SHA-pin vs. tag fraction) |
| stolen npm tokens enabling stage 2 | Exfiltrated npm tokens → CanisterWorm on npm (stage 2) | Palo Alto Unit 42 (CanisterWorm) |
| Identifier `CVE-2026-33634` | The assigned CVE for the compromise | CVE record; CISA KEV catalog |

Cross-referencing corpus per the dossier: Aqua, GHSA, CVE-2026-33634, CISA KEV,
Mercor, Palo Alto Unit 42, Microsoft, Wiz, ReversingLabs, Endor Labs, SANS ISC, Cato.

> These incident facts are taken from the paper's dossier (the `.docx` you provided);
> they are encoded faithfully, not independently re-investigated here.

---

## 4. Mapping to the *Layer 2 Workflow* five steps

| Workflow step | Where it lives |
|---|---|
| **Step 1** — gather every public artifact into a dossier | §3 evidence table |
| **Step 2** — identify the system boundary (in-scope vs. abstracted) | header comment + §6 below |
| **Step 3** — encode the pre-attack state in the formalism | `Init` in `TrivySupplyChain.tla` |
| **Step 4** — encode the attack as a *trace* and as an *adversary* | `MCTrace.tla` (trace) + `cfg_vuln.cfg` adversary run |
| **Step 5** — encode each mitigation and re-check | `cfg_rotate / cfg_shapin / cfg_full` + table |

---

## 5. How to run

**Prerequisites:** a working JDK (a JRE 8+ is enough). `tla2tools.jar` is bundled in
`tools/`. The system `java` launcher stub on this host crashes, so the scripts use the
real `C:\Program Files\Java\jdk-20\bin\java.exe` (or `JAVA_HOME`).

```powershell
# Reproduce the whole validation table + trace check in one shot:
powershell -File .\run-all.ps1
```

Run a single configuration manually:

```powershell
$java = "C:\Program Files\Java\jdk-20\bin\java.exe"
& $java -cp .\tools\tla2tools.jar tlc2.TLC -deadlock -config cfg_vuln.cfg TrivySupplyChain.tla
```

`-deadlock` disables deadlock detection: mitigated configurations correctly reach a
state with no enabled action (the attack is blocked), which is a successful end state
here, not a modeling error.

Outputs land in `results/` (`*.out` logs + `validation_table.md`).

---

## 6. Scope, abstractions, and threats to validity

**In scope (formal claims):** Aqua credential + rotation state; `trivy-action` /
`setup-trivy` tag→commit mappings; victim runners and their environment secrets; the
attacker's knowledge set; victim pinning policy; rotation completeness.

**Deliberately abstracted** (Step 2 boundary):
- *How* the attacker first obtained the credential — taken as the initial condition.
- The C2 network path — exfiltration is modeled as set union into `attackerKnowledge`.
- Victim *production* systems downstream of the stolen creds — a consequence of
  exfiltration, not part of the reachability question.
- Git object-storage internals — tag mutation is one atomic action.
- GitHub's internal authn/authz and payload byte-structure — only the *active behavior*
  (secret transfer) is modeled.

**Threats to validity:** we only model publicly disclosed, caught incidents; the model
abstracts deployed systems; the uniform all-tag pinning assumption is the worst case
chosen for the safety property (the true fraction is a Layer 1 corpus measurement).

---

## 7. File manifest

| File | Purpose |
|---|---|
| `TrivySupplyChain.tla` | Core model: Init / actions / invariants |
| `cfg_vuln.cfg` | Row 1 — tag refs + valid stolen cred (expects FAIL) |
| `cfg_rotate.cfg` | Row 2 — tag refs + complete rotation (expects HOLD) |
| `cfg_shapin.cfg` | Row 3 — SHA pins + valid stolen cred (expects HOLD) |
| `cfg_full.cfg` | Row 4 — SHA pins + complete rotation (expects HOLD) |
| `MCTrace.tla` + `cfg_trace.cfg` | Step 4 scripted documented-trace sanity check |
| `run-all.ps1` | Runs everything; regenerates the validation table |
| `tools/tla2tools.jar` | TLA+ tools (TLC) v2.19 |
| `results/` | TLC logs + generated `validation_table.md` |

---

## 8. Layers 1 and 3 (the rest of the paper)

- **Layer 1 (structural faithfulness) — BUILT.** See [`layer1/`](layer1/README.md): a
  static analyzer over a real corpus (189 workflows, 18 major OSS projects) that measures
  the floating-tag fraction `f = 0.3698`, 88.2% construct coverage, and the
  compromise-relevant frequencies. The measured `f` feeds Layer 3 directly; the Layer 2
  proof uses the worst-case `f = 1` (`UniversalSHAPin=FALSE`). 14/14 extractor unit tests.
- **Layer 3 (predictive calibration) — BUILT.** See [`layer3/`](layer3/README.md): the
  same actions (`ForcePushTag`, `RunnerExecute`) lifted into a **PRISM** MDP that
  computes exact compromise probabilities, expected time-to-compromise (~6 days in the
  vulnerable config), the propagation rate (= corpus tag-fraction `f`), and a sensitivity
  sweep showing the mitigation ranking is stable across a 10× parameter range. (The paper
  names Storm; PRISM is used because Storm has no Windows build — identical MDP/PCTL
  semantics, portable `.prism` files.)
- **Mitigation discovery — BUILT.** See [`asi_evolve/`](asi_evolve/README.md): an
  ASI-Evolve evaluation oracle that searches the defender policy space using the verified
  Layer 3 PRISM model as ground truth, converging on complete credential rotation as the
  minimal-cost safe policy. ASI-Evolve optimizes; PRISM/TLC verify.

## 9. Formal extensions & real-data calibration (latest round)

All verified; folded into the validation `.docx`. Run via `run-all.ps1` (TLA+) and
`layer3/run-layer3.ps1` (PRISM).

- **Isolation between pipelines (TLA+).** `Isolation` invariant on a mixed population
  (`ShaPinnedVictims` a proper subset): SHA-pinned victims' secrets are never exfiltrated
  even while tag-pinned neighbours are compromised. HOLDS over 8,185 states; the
  containment witness shows the breach reaches only the unpinned subset. See
  `cfg_mixed.cfg`, `cfg_mixed_breach.cfg`.
- **Refinement relation (TLA+).** `SecureWorkflow.tla` + `MCRefine.tla`: the hardened
  workflow refines the abstract secure spec (`RefinesSecure` HOLDS); the vulnerable one
  does not (the mapped `leaked` bit flips). Residual attack surface quantified = exactly
  `Victims \ ShaPinnedVictims`. See `cfg_refine_hardened.cfg`, `cfg_refine_vuln.cfg`,
  `cfg_surface.cfg`.
- **Multi-stage propagation (PRISM DTMC).** `layer3/trivy_multistage.prism`: stage 1
  (stolen npm token, prob `q`) → stage 2 (CanisterWorm npm publication, adoption rate
  `r`). P(reach stage 2)=`q`; E[days to first downstream]=16; **complete rotation →
  P(cascade)=0**.
- **Parametric model checking (PRISM).** `layer3/trivy_param.prism`: closed forms —
  expected days-to-compromise `= (p+1)/p`, P(reach stage 2) `= q` (both exact).
- **Calibration (OSV + Backstabber's).** `layer3/calibrate.py` over the OpenSSF
  malicious-packages dataset: npm = 214,497 reports (94.2% of all ecosystems); npm
  malicious publications **329 (Feb 2026) → 1,048 (Mar 2026), ×3.19** — the CanisterWorm
  month. Model fastest-adversary times (6 / 16 days) are lower bounds consistent with the
  documented ~28-day Feb→Mar residual-credential window.
