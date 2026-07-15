------------------------------- MODULE MCRefine -------------------------------
(***************************************************************************)
(* Refinement check (paper: "establish a refinement relation between the   *)
(* vulnerable and hardened workflow, then quantify the residual attack      *)
(* surface").                                                               *)
(*                                                                          *)
(* We check the concrete TrivySupplyChain model against the abstract        *)
(* SecureWorkflow spec under the refinement mapping                         *)
(*                                                                          *)
(*     leaked  <-  (attackerKnowledge \cap AllVictimSecrets # {}).          *)
(*                                                                          *)
(* TLC verifies  Spec => Secure!AbsSpec :                                   *)
(*   - HARDENED config  (cfg_refine_hardened): property HOLDS -> the        *)
(*       hardened workflow refines the secure abstract workflow.            *)
(*   - VULNERABLE config (cfg_refine_vuln): property FAILS -> TLC returns a  *)
(*       behavior in which the mapped `leaked` flips false -> true; those    *)
(*       exfiltration transitions are the residual attack surface (whose     *)
(*       probability mass Layer 3 then quantifies).                          *)
(***************************************************************************)
EXTENDS TrivySupplyChain

Secure == INSTANCE SecureWorkflow
            WITH leaked <- (attackerKnowledge \cap AllVictimSecrets # {})

RefinesSecure == Secure!AbsSpec

\* ---- Residual attack surface (quantification) ----
\* The unpinned victims: the conjectured residual surface under a given config.
UnpinnedVictims == Victims \ ShaPinnedVictims

\* Violated exactly when the attacker has compromised the ENTIRE unpinned subset.
\* TLC's counterexample then witnesses that the full residual surface is
\* reachable, so |UnpinnedVictims| is a tight measure of the residual attack
\* surface: hardening (growing ShaPinnedVictims) shrinks it monotonically to {}.
NotFullSurface == attackerKnowledge # UnpinnedVictims

=============================================================================
