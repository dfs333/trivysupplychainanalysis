------------------------------ MODULE MCTrace ------------------------------
(***************************************************************************)
(* Step 4 "trace-based sanity check" from the Layer-2 workflow.            *)
(*                                                                          *)
(* Where the four cfg_*.cfg runs perform the ADVERSARY-based check (let     *)
(* TLC find ANY path that violates NoExfiltration), this module performs    *)
(* the TRACE-based check: it scripts the EXACT documented execution path    *)
(* and confirms the formalism can reproduce it.  Per the workflow:          *)
(*                                                                          *)
(*   "If written as a specific trace scenario and TLC accepts it as         *)
(*    reachable from [Init], it is confirmed the formalism can represent    *)
(*    the documented attack.  If rejected, model is wrong."                 *)
(*                                                                          *)
(* The documented trace (dossier order):                                    *)
(*   1. [Init]  attacker holds the residual Aqua service-account credential *)
(*   2. ForcePushTag(trivy-action, v0.29, c_malicious)                      *)
(*   3. RunnerExecute(v1, trivy-action, v0.29)  -- which, in one atomic    *)
(*      step, both runs the malicious commit AND exfiltrates the victim's   *)
(*      secrets to the attacker (steps 3-4 of the dossier).                 *)
(*                                                                          *)
(* TraceConsistency is checked as an INVARIANT and must HOLD: whenever the  *)
(* scripted trace has run to completion (step = 2), the documented          *)
(* compromise must have occurred.  TLC reporting depth 3 with "no error"    *)
(* confirms the full documented trace is reachable from Init.               *)
(***************************************************************************)
EXTENDS TrivySupplyChain

CONSTANTS
    TargetRepo,     \* trivy_action
    TargetTag,      \* the tag the victim references (e.g. v0.29 -> tg1)
    TargetVictim    \* v1, a representative tag-pinned downstream org (direct
                    \* Action-execution victims were not individually named
                    \* publicly; Mercor's disclosure concerns the stage-2
                    \* LiteLLM follow-on, modeled in Layer 3's cascade)

VARIABLE step       \* program counter for the scripted documented trace

tvars == <<tagMap, pinningPolicy, rotationState, maintainerCreds,
           attackerKnowledge, victimSecrets, victimPin, step>>

TraceInit == Init /\ step = 0

\* Step 2 of the dossier: the attacker force-pushes the victim's tag.
DoForcePush ==
    /\ step = 0
    /\ ForcePushTag(TargetRepo, TargetTag)
    /\ step' = 1

\* Steps 3-4 of the dossier: the victim runner executes the now-malicious
\* commit and its secrets are exfiltrated.
DoRunnerExecute ==
    /\ step = 1
    /\ RunnerExecute(TargetVictim, TargetRepo, TargetTag)
    /\ step' = 2

TraceNext == DoForcePush \/ DoRunnerExecute

TraceSpec == TraceInit /\ [][TraceNext]_tvars

\* Must HOLD: completing the scripted trace implies the documented compromise.
TraceConsistency == (step = 2) => (TargetVictim \in attackerKnowledge)

=============================================================================
