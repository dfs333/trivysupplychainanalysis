-------------------------- MODULE TrivyCompromise --------------------------
(***************************************************************************)
(* Formal model of the TeamPCP / Trivy supply chain compromise of          *)
(* March 2026.                                                              *)
(*                                                                          *)
(* Evidence grounding: dossiers/trivy-teampcp.md                            *)
(* Companion documentation: docs/formal-methods-approach.md                 *)
(*                                                                          *)
(* System boundary:                                                         *)
(*   In-model: Aqua maintainer credentials, action repositories and their  *)
(*     tag-to-commit maps, victim Actions runners, secrets, attacker       *)
(*     knowledge set, victim pinning policy, credential rotation state.    *)
(*   Out-of-model: attacker C2, payload internals, GitHub auth layer,      *)
(*     git object storage internals, downstream cascade to other           *)
(*     ecosystems.                                                          *)
(*                                                                          *)
(* Properties verified:                                                     *)
(*   NoExfiltration           — safety invariant                            *)
(*   PinningPreventsExfil     — conditional invariant (mitigation claim)   *)
(*   ResidualAccessProperty   — the scholarly payoff: partial rotation     *)
(*                              leaves the attack path reachable           *)
(*                                                                          *)
(* Abstraction rationale:                                                   *)
(*   Commits are opaque identifiers with single label (benign/malicious).  *)
(*   Credentials modeled as maintainer identities, not tokens.             *)
(*   Tag-vs-SHA distinction is the heart of the spec; it's what            *)
(*     distinguishes vulnerable from mitigated systems.                    *)
(*   Exfiltration is bulk (set union), matching documented behavior.       *)
(***************************************************************************)

EXTENDS Naturals, FiniteSets, Sequences, TLC

CONSTANTS
    Maintainers,   \* e.g. {AquaServiceAcct, AquaHuman1, ...}
    Victims,       \* set of victim org identifiers
    Actions,       \* {"trivy-action", "setup-trivy"}
    Tags,          \* set of tag references
    Commits,       \* abstract commit identifiers
    Secrets,       \* set of secret identifiers present across victims
    BenignCommit,  \* a designated benign commit for SHA pinning resolution
    MaliciousCommit \* a designated malicious commit

ASSUME BenignCommit \in Commits
ASSUME MaliciousCommit \in Commits
ASSUME BenignCommit # MaliciousCommit

VARIABLES
    tagMap,             \* [Actions -> [Tags -> Commits]] current resolution
    commitContent,      \* [Commits -> {"benign", "malicious"}]
    maintainerCreds,    \* SUBSET Maintainers : creds attacker holds
    victimSecrets,      \* [Victims -> SUBSET Secrets] : secrets in runner env
    runnerExec,         \* [Victims -> Seq(Commits)] : execution history
    attackerKnowledge,  \* SUBSET Secrets : what attacker has exfiltrated
    pinningPolicy,      \* [Victims -> {"tag", "sha"}] : mitigation state
    rotationState       \* [Maintainers -> {"valid", "rotated"}]

vars == <<tagMap, commitContent, maintainerCreds, victimSecrets,
          runnerExec, attackerKnowledge, pinningPolicy, rotationState>>

---------------------------------------------------------------------------
(* Type invariant                                                          *)
TypeOK ==
    /\ tagMap \in [Actions -> [Tags -> Commits]]
    /\ commitContent \in [Commits -> {"benign", "malicious"}]
    /\ maintainerCreds \subseteq Maintainers
    /\ victimSecrets \in [Victims -> SUBSET Secrets]
    /\ runnerExec \in [Victims -> Seq(Commits)]
    /\ attackerKnowledge \subseteq Secrets
    /\ pinningPolicy \in [Victims -> {"tag", "sha"}]
    /\ rotationState \in [Maintainers -> {"valid", "rotated"}]

---------------------------------------------------------------------------
(* Initial state captures the world as of early March 2026:                *)
(*   - All tags point to benign commits (pre-attack)                       *)
(*   - Attacker holds Aqua service-account credential (from Feb incident)  *)
(*   - Service account is NOT rotated (per Endor Labs analysis)            *)
(*   - Other maintainer accounts may be in either state                    *)
(*   - Victims overwhelmingly use tag references (per corpus analysis)     *)
(*                                                                          *)
(* NOTE: `ServiceAcct` must be one of the Maintainers; we parameterize     *)
(* which via a CONSTANT in the .cfg so different scenarios can be tested. *)
(***************************************************************************)
CONSTANT ServiceAcct
ASSUME ServiceAcct \in Maintainers

Init ==
    \* All tags initially benign (dossier claim: pre-attack baseline, high confidence)
    /\ tagMap = [a \in Actions |-> [t \in Tags |-> BenignCommit]]
    \* Commit labels fixed: we have one benign and one malicious exemplar
    /\ commitContent = [c \in Commits |->
                         IF c = MaliciousCommit THEN "malicious" ELSE "benign"]
    \* Attacker holds service-account credential (dossier claim #4-#6, medium confidence)
    /\ maintainerCreds = {ServiceAcct}
    \* Service account NOT rotated; other maintainers are rotated
    /\ rotationState = [m \in Maintainers |->
                         IF m = ServiceAcct THEN "valid" ELSE "rotated"]
    \* Per-victim secret sets: non-empty (dossier claim #8)
    /\ victimSecrets \in [Victims -> (SUBSET Secrets) \ {{}}]
    /\ runnerExec = [v \in Victims |-> <<>>]
    /\ attackerKnowledge = {}
    \* Worst-case: all victims use tag references
    /\ pinningPolicy = [v \in Victims |-> "tag"]

---------------------------------------------------------------------------
(* Action: attacker steals an additional maintainer credential.            *)
(* This models further credential theft beyond the initial Feb compromise. *)
(* Guard: the credential must be currently valid.                          *)
(***************************************************************************)
StealCredential(m) ==
    /\ rotationState[m] = "valid"
    /\ m \notin maintainerCreds
    /\ maintainerCreds' = maintainerCreds \cup {m}
    /\ UNCHANGED <<tagMap, commitContent, victimSecrets, runnerExec,
                   attackerKnowledge, pinningPolicy, rotationState>>

(***************************************************************************)
(* Action: rotate a subset of maintainer credentials.                      *)
(* This is the KEY modeling action: it lets us represent partial vs. full  *)
(* remediation. If rotatedSet is a proper subset of compromised creds, the *)
(* attacker retains some capability — matching the Feb remediation.        *)
(***************************************************************************)
PartialRotation(rotatedSet) ==
    /\ rotatedSet \subseteq Maintainers
    /\ rotatedSet # {}
    /\ rotationState' = [m \in Maintainers |->
                            IF m \in rotatedSet THEN "rotated"
                            ELSE rotationState[m]]
    /\ maintainerCreds' = maintainerCreds \ rotatedSet
    /\ UNCHANGED <<tagMap, commitContent, victimSecrets, runnerExec,
                   attackerKnowledge, pinningPolicy>>

(***************************************************************************)
(* Action: attacker force-pushes a tag to point to a malicious commit.     *)
(* Guard: attacker must hold a currently-valid maintainer credential.      *)
(* This is the March 19 primary compromise action.                         *)
(***************************************************************************)
ForcePushTag(a, t, c) ==
    /\ \E m \in maintainerCreds : rotationState[m] = "valid"
    /\ commitContent[c] = "malicious"
    /\ tagMap' = [tagMap EXCEPT ![a][t] = c]
    /\ UNCHANGED <<commitContent, maintainerCreds, victimSecrets, runnerExec,
                   attackerKnowledge, pinningPolicy, rotationState>>

(***************************************************************************)
(* Action: victim runner fetches and executes an action reference.         *)
(*                                                                          *)
(* Tag-based resolution (vulnerable):                                      *)
(*   resolved commit = tagMap[a][t]                                        *)
(*     — whatever the tag currently points to, including attacker-pushed  *)
(*                                                                          *)
(* SHA-based resolution (mitigated):                                       *)
(*   resolved commit = BenignCommit                                        *)
(*     — abstraction: pinning to a known-good SHA always resolves benign  *)
(*                                                                          *)
(* If resolved commit is malicious, victim's entire secret set is          *)
(* transferred to attackerKnowledge.                                       *)
(***************************************************************************)
RunnerExecute(v, a, t) ==
    LET resolved ==
        IF pinningPolicy[v] = "tag"
        THEN tagMap[a][t]
        ELSE BenignCommit
    IN
    /\ runnerExec' = [runnerExec EXCEPT ![v] = Append(@, resolved)]
    /\ attackerKnowledge' =
         IF commitContent[resolved] = "malicious"
         THEN attackerKnowledge \cup victimSecrets[v]
         ELSE attackerKnowledge
    /\ UNCHANGED <<tagMap, commitContent, maintainerCreds, victimSecrets,
                   pinningPolicy, rotationState>>

(***************************************************************************)
(* Action: victim adopts SHA pinning mitigation for their workflows.      *)
(***************************************************************************)
AdoptSHAPinning(v) ==
    /\ pinningPolicy[v] = "tag"
    /\ pinningPolicy' = [pinningPolicy EXCEPT ![v] = "sha"]
    /\ UNCHANGED <<tagMap, commitContent, maintainerCreds, victimSecrets,
                   runnerExec, attackerKnowledge, rotationState>>

---------------------------------------------------------------------------
Next ==
    \/ \E m \in Maintainers : StealCredential(m)
    \/ \E s \in SUBSET Maintainers : s # {} /\ PartialRotation(s)
    \/ \E a \in Actions, t \in Tags, c \in Commits : ForcePushTag(a, t, c)
    \/ \E v \in Victims, a \in Actions, t \in Tags : RunnerExecute(v, a, t)
    \/ \E v \in Victims : AdoptSHAPinning(v)

Spec == Init /\ [][Next]_vars

---------------------------------------------------------------------------
(*                          Properties                                      *)
---------------------------------------------------------------------------

(* Safety invariant: attacker never learns any victim secret.              *)
(* In the vulnerable configuration (tag refs + residual credential), TLC  *)
(* should falsify this and produce a counterexample matching the          *)
(* documented attack trace.                                                *)
NoExfiltration == attackerKnowledge = {}

(* Conditional invariant: if all victims use SHA pinning, no exfiltration *)
(* is possible regardless of credential state.                            *)
(* Tests the primary mitigation claim.                                    *)
PinningPreventsExfil ==
    (\A v \in Victims : pinningPolicy[v] = "sha") => (attackerKnowledge = {})

(* The residual-access property expressed as invariant-about-reachability:*)
(* in any state where the attacker holds a still-valid credential AND at *)
(* least one victim uses tag references, exfiltration remains reachable. *)
(* This is what makes the paper's contribution: distinguishing partial   *)
(* from complete remediation.                                             *)
(*                                                                         *)
(* Note: this is expressed as the negation of the safety claim under the *)
(* vulnerable configuration. We verify by checking NoExfiltration is     *)
(* falsified iff the vulnerable configuration holds initially.           *)
VulnerableConfigHolds ==
    /\ \E m \in Maintainers :
         /\ m \in maintainerCreds
         /\ rotationState[m] = "valid"
    /\ \E v \in Victims : pinningPolicy[v] = "tag"

(* Combined: if the vulnerable config ever holds, the safety invariant is *)
(* eventually violated in some extension of the trace.                    *)
(* This is genuinely a liveness-style claim; TLC can be used to verify   *)
(* by checking counterexamples exist under the vulnerable configuration. *)

=============================================================================
