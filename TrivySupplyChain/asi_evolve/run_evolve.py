#!/usr/bin/env python3
"""
run_evolve.py - the full LLM-driven mitigation-search loop for the Trivy /
TeamPCP model, wired to the FORMALLY VERIFIED Layer 3 PRISM oracle.

This is the self-contained realization of the loop that asi_evolve/README.md
describes: an LLM *proposes* a defender mitigation policy, and the PRISM model
checker *decides* whether it is safe and at what operational cost. Every
candidate is model-checked by `evaluate.py` before it earns a score -- the LLM
never scores a policy on its own say-so. Maximizing the score converges to the
cheapest policy the model proves drives downstream compromise to zero, which is
the paper's central finding (rotate the residual credential).

    LLM proposes  ->  evaluate.py (PRISM model-checks)  ->  score
         ^-------------------- history feeds back --------------|

Proposer: Claude Opus 4.8 (claude-opus-4-8) via the official Anthropic SDK.
The model checker -- not the LLM -- is the source of ground truth.

Usage:
    pip install -r requirements.txt          # anthropic SDK
    # auth: `ant auth login`, or set ANTHROPIC_API_KEY
    python run_evolve.py                      # 12 rounds, Opus, effort=high
    python run_evolve.py --rounds 20 --effort medium

The oracle (evaluate.py) is fully runnable with no API key; only THIS driver
needs one, because only the *proposer* is an LLM.
"""
import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

# The verified oracle and its (fixed) cost/threat constants -- imported so the
# proposer prompt describes the exact objective PRISM will score against.
from evaluate import evaluate, W_PIN, W_ROT, BUILD_CADENCE_P  # noqa: E402

MODEL = "claude-opus-4-8"  # proposer model; the model checker is ground truth

# Structured-output schema for one candidate policy. Numeric bounds are enforced
# by evaluate() (it clamps fraction_sha_pinned to [0,1]), since JSON-schema
# min/max constraints are not part of structured outputs.
POLICY_SCHEMA = {
    "type": "object",
    "properties": {
        "reasoning": {
            "type": "string",
            "description": "One or two sentences: why this candidate, given the history.",
        },
        "fraction_sha_pinned": {
            "type": "number",
            "description": "Share of victim workflows migrated from floating tags to SHA pins, in [0,1].",
        },
        "rotation_complete": {
            "type": "boolean",
            "description": "Whether the residual Aqua CI credential is fully rotated/revoked.",
        },
    },
    "required": ["reasoning", "fraction_sha_pinned", "rotation_complete"],
    "additionalProperties": False,
}

SYSTEM = (
    "You are an optimization agent searching the defender-policy space for the "
    "March-2026 Trivy / TeamPCP GitHub Actions supply-chain attack. You PROPOSE "
    "candidate policies; a PRISM probabilistic model checker DECIDES their safety "
    "and cost. Never assume a policy is safe -- the model checker verifies every "
    "candidate you propose. Your goal is to discover the single policy with the "
    "highest score."
)


def _read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def _history_table(history):
    if not history:
        return "(no candidates evaluated yet)"
    lines = [
        "round | fraction_sha_pinned | rotation_complete | compromise_fraction | cost | score | safe",
        "------|---------------------|-------------------|---------------------|------|-------|-----",
    ]
    for h in history:
        m = h["metrics"]
        lines.append(
            "{r:>5} | {f:>19} | {rot:>17} | {c:>19} | {cost:>4} | {s:>5} | {safe}".format(
                r=h["round"],
                f=m["fraction_sha_pinned"],
                rot=str(m["rotation_complete"]).lower(),
                c=m["compromise_fraction"],
                cost=m["cost"],
                s=m["score"],
                safe="yes" if m["safe"] else "no",
            )
        )
    return "\n".join(lines)


def propose(client, effort, problem, history):
    """Ask the LLM for the next candidate policy (structured JSON)."""
    objective = (
        "The PRISM oracle scores each candidate as:\n"
        "  score = -(compromise_fraction + cost)\n"
        "where compromise_fraction is the PRISM-computed expected share of the "
        "population compromised (0.0 = fully safe), and\n"
        f"  cost = {W_PIN} * fraction_sha_pinned + {W_ROT} * (1 if rotation_complete else 0).\n"
        f"The threat environment is fixed: build cadence p = {BUILD_CADENCE_P}/day.\n"
        "Higher score is better; the best possible score is a SAFE policy "
        "(compromise_fraction = 0) achieved at the lowest cost. Explore first, "
        "then exploit toward the cheapest safe policy."
    )
    user = (
        f"# Problem\n{problem}\n\n"
        f"# Objective\n{objective}\n\n"
        f"# Candidates evaluated so far (verified by PRISM)\n{_history_table(history)}\n\n"
        "Propose the next candidate policy to evaluate. Return JSON only."
    )
    resp = client.messages.create(
        model=MODEL,
        max_tokens=8192,
        system=SYSTEM,
        thinking={"type": "adaptive"},
        output_config={"effort": effort, "format": {"type": "json_schema", "schema": POLICY_SCHEMA}},
        messages=[{"role": "user", "content": user}],
    )
    # With structured outputs the first text block is valid JSON for the schema.
    text = next(b.text for b in resp.content if b.type == "text")
    return json.loads(text)


def main():
    ap = argparse.ArgumentParser(description="LLM-driven mitigation search over the verified PRISM oracle.")
    ap.add_argument("--rounds", type=int, default=12, help="Max proposer rounds (default 12).")
    ap.add_argument("--effort", default="high", choices=["low", "medium", "high", "xhigh", "max"],
                    help="Reasoning effort for the proposer (default high).")
    ap.add_argument("--patience", type=int, default=3,
                    help="Stop early after this many rounds with no score improvement (default 3).")
    ap.add_argument("--out", default=os.path.join(HERE, "..", "layer3", "results", "asi_evolve_run.json"),
                    help="Where to write the run record (JSON).")
    args = ap.parse_args()

    try:
        import anthropic
    except ImportError:
        sys.exit("The 'anthropic' package is required: pip install -r requirements.txt")

    problem = _read(os.path.join(HERE, "problem.md"))
    client = anthropic.Anthropic()  # resolves ANTHROPIC_API_KEY or an `ant auth login` profile

    print(f"ASI-Evolve mitigation search  |  proposer={MODEL} effort={args.effort}  |  oracle=PRISM (Layer 3)\n")
    print("round | policy (sha_pinned, rotation) -> compromise / cost / SCORE  [safe?]")
    print("------+--------------------------------------------------------------------")

    history = []
    best = None
    stale = 0
    for rnd in range(1, args.rounds + 1):
        try:
            cand = propose(client, args.effort, problem, history)
        except anthropic.AuthenticationError:
            sys.exit("No valid Anthropic credentials. Run `ant auth login` or set ANTHROPIC_API_KEY, then retry.")

        policy = {
            "fraction_sha_pinned": cand["fraction_sha_pinned"],
            "rotation_complete": cand["rotation_complete"],
        }
        metrics = evaluate(policy)  # <-- PRISM model-checks the candidate
        history.append({"round": rnd, "reasoning": cand.get("reasoning", ""), "metrics": metrics})

        print("{r:>5} | pin={f:<4} rot={rot:<5} -> comp={c:<4} cost={cost:<4} SCORE={s:<6} [{safe}]  {why}".format(
            r=rnd,
            f=metrics["fraction_sha_pinned"],
            rot=str(metrics["rotation_complete"]).lower(),
            c=metrics["compromise_fraction"],
            cost=metrics["cost"],
            s=metrics["score"],
            safe="safe" if metrics["safe"] else "UNSAFE",
            why=cand.get("reasoning", "")[:60],
        ))

        if best is None or metrics["score"] > best["metrics"]["score"]:
            best = history[-1]
            stale = 0
        else:
            stale += 1
            if stale >= args.patience:
                print(f"\nNo improvement for {args.patience} rounds -- converged.")
                break

    print("\n================ Best policy discovered ================")
    bm = best["metrics"]
    print(f"  fraction_sha_pinned = {bm['fraction_sha_pinned']}")
    print(f"  rotation_complete   = {bm['rotation_complete']}")
    print(f"  compromise_fraction = {bm['compromise_fraction']}  (PRISM-verified)")
    print(f"  cost                = {bm['cost']}")
    print(f"  score               = {bm['score']}   safe = {bm['safe']}")
    print(f"  found in round {best['round']} -- rationale: {best['reasoning']}")

    record = {
        "model": MODEL,
        "effort": args.effort,
        "rounds_run": len(history),
        "best": best,
        "history": history,
    }
    out = os.path.abspath(args.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(record, fh, indent=2)
    print(f"\nWrote run record to {out}")

    # The expected optimum is rotate-only (score -0.05): the cheapest safe policy,
    # i.e. the February remediation, had it been complete, would have prevented
    # the March attack class -- exactly the Layer 2 / Layer 3 finding.


if __name__ == "__main__":
    main()
