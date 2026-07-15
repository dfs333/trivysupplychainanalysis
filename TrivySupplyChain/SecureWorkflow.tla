----------------------------- MODULE SecureWorkflow -----------------------------
(***************************************************************************)
(* Abstract specification of a SECURE CI/CD workflow.                       *)
(*                                                                          *)
(* It exposes a single observation, `leaked`, recording whether any victim  *)
(* secret has ever reached the attacker.  A workflow is *secure* exactly    *)
(* when this observation never becomes true: the only transitions the       *)
(* abstract system permits leave `leaked` unchanged (and false).            *)
(*                                                                          *)
(* The concrete model (TrivySupplyChain) REFINES this spec under the        *)
(* mapping  leaked  <-  (attackerKnowledge \cap AllVictimSecrets # {}).     *)
(* A hardened configuration satisfies SecureWorkflow!Spec (refinement       *)
(* holds); a vulnerable configuration does not (TLC exhibits a concrete     *)
(* behavior whose mapped `leaked` flips false -> true, and that flipping    *)
(* set of transitions is precisely the residual attack surface).            *)
(***************************************************************************)
VARIABLE leaked

AbsInit == leaked = FALSE
AbsNext == UNCHANGED leaked          \* a secure system never changes the leak bit
AbsSpec == AbsInit /\ [][AbsNext]_leaked

NoLeak == leaked = FALSE             \* the abstract safety invariant

=============================================================================
