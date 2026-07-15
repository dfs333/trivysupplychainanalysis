-------------------------- MODULE TrivySupplyChain --------------------------
(***************************************************************************)
(* Formal model of the March-2026 Trivy / "TeamPCP" GitHub Action          *)
(* supply-chain attack, built as the Layer-2 "incident reconstruction"     *)
(* artifact for the paper:                                                  *)
(*                                                                          *)
(*   "Quantitative Analysis for Mitigation of Multi-Stage Supply Chain      *)
(*    Attacks during Routine Automated Workflows in CI/CD Pipelines."       *)
(*                                                                          *)
(* The model encodes the PRE-ATTACK system state of the trivy-action /      *)
(* setup-trivy compromise and asks two questions with TLC:                  *)
(*                                                                          *)
(*   (1) Adversary reachability: starting from an attacker who holds ONLY   *)
(*       a residual Aqua CI service-account credential, can a victim        *)
(*       runner's secrets become known to the attacker?  (Invariant        *)
(*       NoExfiltration.)                                                    *)
(*                                                                          *)
(*   (2) Mitigation discrimination: does the model distinguish COMPLETE     *)
(*       credential rotation (safe) from PARTIAL rotation (still exploited),*)
(*       and does universal SHA-pinning close the path independently?       *)
(*                                                                          *)
(* Every CONSTANT / variable below traces to a specific claim in the        *)
(* public dossier (Aqua disclosure, GHSA, CVE-2026-33634, Unit 42, Wiz,     *)
(* Endor Labs, ReversingLabs, Microsoft, SANS ISC, Cato).  See README.md    *)
(* for the line-by-line evidence table.                                     *)
(***************************************************************************)
EXTENDS Naturals, FiniteSets

CONSTANTS
    Victims,            \* Set of victim organizations (dossier: thousands;
                        \* 5 model values are "more than enough" to exercise
                        \* the reachability claim).  e.g. {v1, v2, v3, v4, v5} --
                        \* anonymous model orgs: no direct Action-execution victim
                        \* was individually named publicly (Mercor, often cited,
                        \* disclosed a stage-2 / LiteLLM-path breach).
    Repos,              \* Compromised action repos: {trivy_action, setup_trivy}
    Tags,               \* Mutable tag references on those repos (5 model values)
    Commits,            \* Git commits (3 model values)
    BenignCommit,       \* The audited / expected commit a tag used to resolve to
    MaliciousCommit,    \* The attacker-planted commit (entpcp / tpcp payload)
    AquaServiceAcct,    \* The Aqua CI service account whose credential was the
                        \* residual from the February incident
    ShaPinnedVictims,   \* MITIGATION KNOB (SUBSET Victims): the set of victims that
                        \* pin the action by full commit SHA.  {} => every victim
                        \* uses a floating tag (the worst-case, corpus-calibrated
                        \* Layer-1 assumption); Victims => universal SHA pinning; a
                        \* proper subset => a MIXED population (used to prove the
                        \* per-pipeline ISOLATION property).
    ServiceAcctRotated  \* MITIGATION KNOB (BOOLEAN): TRUE  => the Aqua service
                        \* account credential was fully rotated and revoked in
                        \* February (complete rotation); FALSE => it was left
                        \* valid (the partial rotation that actually happened).

ASSUME BenignCommit \in Commits
ASSUME MaliciousCommit \in Commits
ASSUME BenignCommit # MaliciousCommit
ASSUME ShaPinnedVictims \subseteq Victims
ASSUME ServiceAcctRotated \in BOOLEAN

VARIABLES
    tagMap,             \* [Repos \X Tags -> Commits]: current resolution of every
                        \* repo tag.  Force-push is the only thing that mutates it.
    pinningPolicy,      \* [Victims -> {"tag","sha"}]: how each victim references
                        \* the action.  Fixed by Init (a configuration, not a move).
    rotationState,      \* [{AquaServiceAcct} -> {"valid","rotated"}]
    maintainerCreds,    \* SUBSET of credential holders the attacker controls;
                        \* {AquaServiceAcct} when residual access exists, else {}.
    attackerKnowledge,  \* SUBSET Victims: the set of victims whose runner secrets
                        \* have been exfiltrated (modeled as set union; the C2
                        \* network path is abstracted away, per the dossier scope).
    victimSecrets,      \* [Victims -> SUBSET Victims]: secrets held in each
                        \* runner's environment.  Each victim's secret is modeled
                        \* by its own identity, so victimSecrets[v] = {v}.
    victimPin           \* [Victims -> Commits]: the commit a SHA-pinning victim is
                        \* locked to (always the audited BenignCommit).

vars == <<tagMap, pinningPolicy, rotationState, maintainerCreds,
          attackerKnowledge, victimSecrets, victimPin>>

----------------------------------------------------------------------------
(* Convenience definitions *)

AllVictimSecrets == UNION { victimSecrets[v] : v \in Victims }

\* The commit that victim v actually executes when it runs action (r,t):
\* a SHA-pinned victim always gets its audited commit; a tag-pinned victim
\* gets whatever the tag currently resolves to (possibly attacker-controlled).
ExecutedCommit(v, r, t) ==
    IF pinningPolicy[v] = "sha"
    THEN victimPin[v]
    ELSE tagMap[<<r, t>>]

\* The attacker can still mutate a tag iff he holds a service-account
\* credential that is genuinely still valid (incomplete rotation).
AttackerCanForcePush ==
    /\ AquaServiceAcct \in maintainerCreds
    /\ rotationState[AquaServiceAcct] = "valid"

----------------------------------------------------------------------------
(* Initial state -- the encoded PRE-ATTACK dossier (Step 3). *)

Init ==
    /\ tagMap = [ rt \in Repos \X Tags |-> BenignCommit ]
    /\ pinningPolicy =
         [ v \in Victims |-> IF v \in ShaPinnedVictims THEN "sha" ELSE "tag" ]
    /\ rotationState =
         [ a \in {AquaServiceAcct} |->
             IF ServiceAcctRotated THEN "rotated" ELSE "valid" ]
    /\ maintainerCreds =
         IF ServiceAcctRotated THEN {} ELSE {AquaServiceAcct}
    /\ attackerKnowledge = {}
    /\ victimSecrets = [ v \in Victims |-> {v} ]
    /\ victimPin = [ v \in Victims |-> BenignCommit ]

----------------------------------------------------------------------------
(* Actions. *)

\* Stage 2 of the attack: the attacker force-pushes a repo tag so that it
\* resolves to the malicious commit (dossier: 76/77 tags on trivy-action,
\* 7/7 on setup-trivy).  Modeled as an atomic tag mutation.
ForcePushTag(r, t) ==
    /\ AttackerCanForcePush
    /\ tagMap[<<r, t>>] # MaliciousCommit
    /\ tagMap' = [ tagMap EXCEPT ![<<r, t>>] = MaliciousCommit ]
    /\ UNCHANGED <<pinningPolicy, rotationState, maintainerCreds,
                   attackerKnowledge, victimSecrets, victimPin>>

\* A victim's routine automated workflow runs the action.  If the commit it
\* executes is the attacker's, the payload reads the runner environment and
\* exfiltrates that victim's secrets into attackerKnowledge.
RunnerExecute(v, r, t) ==
    /\ ExecutedCommit(v, r, t) = MaliciousCommit
    /\ attackerKnowledge' = attackerKnowledge \cup victimSecrets[v]
    /\ UNCHANGED <<tagMap, pinningPolicy, rotationState, maintainerCreds,
                   victimSecrets, victimPin>>

Next ==
    \/ \E r \in Repos, t \in Tags : ForcePushTag(r, t)
    \/ \E v \in Victims, r \in Repos, t \in Tags : RunnerExecute(v, r, t)

Spec == Init /\ [][Next]_vars

----------------------------------------------------------------------------
(* Type / structural invariant (cheap sanity check on the encoding). *)

TypeOK ==
    /\ tagMap \in [ Repos \X Tags -> Commits ]
    /\ pinningPolicy \in [ Victims -> {"tag", "sha"} ]
    /\ rotationState \in [ {AquaServiceAcct} -> {"valid", "rotated"} ]
    /\ maintainerCreds \subseteq {AquaServiceAcct}
    /\ attackerKnowledge \subseteq AllVictimSecrets
    /\ victimSecrets \in [ Victims -> SUBSET Victims ]
    /\ victimPin \in [ Victims -> Commits ]

----------------------------------------------------------------------------
(* The properties the paper checks. *)

\* SAFETY INVARIANT.  No victim runner secret is ever known to the attacker.
\* TLC checking this on the vulnerable configuration produces the documented
\* attack as a shortest counterexample; on a mitigated configuration it holds.
NoExfiltration == attackerKnowledge \cap AllVictimSecrets = {}

\* A configuration-determined predicate: residual (un-rotated) access exists.
\* True exactly when rotation was incomplete.  Invariant of every run.
ResidualCredentialValid ==
    /\ AquaServiceAcct \in maintainerCreds
    /\ rotationState[AquaServiceAcct] = "valid"

\* The vulnerability the paper names: a residual valid credential that is
\* ALSO the cause of a reachable compromise.  Reported as
\* (ResidualCredentialValid /\ NOT NoExfiltration-holds-for-this-config);
\* TLC supplies the second conjunct.  See README validation table.

----------------------------------------------------------------------------
(* ISOLATION between CI/CD pipelines (paper obligation:                     *)
(* "Formalize Isolation between CI/CD pipelines and prove when mitigations  *)
(*  do or don't enforce it").                                               *)

\* Secrets held by the SHA-pinning victims.
ShaPinnedSecrets == UNION { victimSecrets[v] : v \in ShaPinnedVictims }

\* ISOLATION (per-pipeline blast-radius containment).  No SHA-pinning victim's
\* secret is EVER exfiltrated -- even in a MIXED population where tag-pinning
\* victims are actively compromised in the same run.  Checked as an invariant:
\* holding on a mixed configuration (cfg_mixed) where NoExfiltration FAILS proves
\* that SHA-pinning ISOLATES a pipeline from the blast radius of its unpinned
\* neighbours.  The residual attack surface is therefore exactly the unpinned
\* subset  Victims \ ShaPinnedVictims  (quantified in the refinement module).
Isolation == ShaPinnedSecrets \cap attackerKnowledge = {}

\* Sanity witness used to show isolation is NON-VACUOUS: in the mixed config the
\* attack really does reach some (necessarily unpinned) victim.  Checking this as
\* an invariant FAILS, and the counterexample compromises only an unpinned victim.
NoUnpinnedCompromise ==
    attackerKnowledge \cap (UNION { victimSecrets[v] : v \in Victims \ ShaPinnedVictims }) = {}

=============================================================================
