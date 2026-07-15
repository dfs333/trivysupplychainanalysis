# ASI-Evolve integration — mitigation discovery over the verified model

## What this is (and what it is *not*)

[ASI-Evolve](https://github.com/GAIR-NLP/ASI-Evolve) (GAIR-NLP) is an autonomous-research
/ optimization framework — *"Let AI do the research."* It proposes candidate solutions,
runs an evaluation script, and learns from the score over many rounds (UCB1 / greedy /
MAP-Elites sampling).

**ASI-Evolve does not perform formal verification or model checking** — its own
documentation says so explicitly. So it cannot "verify" the TLA+/PRISM model; that job
belongs to **TLC** (Layer 2) and **PRISM** (Layer 3), and is already done.

What ASI-Evolve *can* do for this paper is the **mitigation-search / sensitivity** task:
explore the space of defender policies and *discover* the cheapest one that the formal
model proves is safe. This harness wires ASI-Evolve's evaluation step to the **verified
Layer 3 PRISM oracle**, so every candidate it proposes is model-checked before it earns a
score. The LLM proposes; the model checker decides.

```
        ASI-Evolve loop                         this harness
   ┌───────────────────────┐         ┌──────────────────────────────┐
   │ propose policy (LLM)   │ ─────►  │ evaluate.py                  │
   │ sample / rank / mutate │         │   → PRISM model-checks it    │
   │        ▲               │ ◄─────  │   → score = −(compromise+cost)│
   └────────┴──────────────┘  score   └──────────────────────────────┘
```

## Files

| File | Purpose |
|---|---|
| `evaluate.py` | The evaluation oracle. Reads a candidate policy (JSON), model-checks it with the Layer 3 PRISM propagation model, prints `score` + metrics. |
| `baseline_config.json` | The vulnerable starting point (no pinning, no rotation). |
| `problem.md` | Problem description / domain-knowledge seed for ASI-Evolve. |

## Verified locally (no API key needed)

`evaluate.py` is fully runnable on its own and was checked against the PRISM oracle:

| Policy | `compromise_fraction` | `cost` | `score` | safe? |
|---|---|---|---|---|
| baseline (0 pin, no rotation) | 1.0 | 0.00 | **−1.00** | no |
| **rotate credential only** | 0.0 | 0.05 | **−0.05** | ✅ **best** |
| full SHA-pin, no rotation | 0.0 | 0.30 | −0.30 | ✅ |
| half SHA-pin, no rotation | 0.5 | 0.15 | −0.65 | no |

Maximizing `score`, the optimum is **complete credential rotation** — the minimal-cost
safe policy, which is exactly the paper's central finding. Run it yourself:

```powershell
python evaluate.py baseline_config.json
python evaluate.py my_candidate.json
```

## Running the full ASI-Evolve loop (needs your setup)

ASI-Evolve is a separate Python project and an LLM-driven loop, so the full run needs
three things this repo can't bundle:

1. **Clone + install** ASI-Evolve:
   ```bash
   git clone https://github.com/GAIR-NLP/ASI-Evolve
   cd ASI-Evolve && pip install -r requirements.txt   # Python 3.10+
   ```
2. **An OpenAI-compatible API key** (GPT-4o / Claude / Gemini / local via LiteLLM) — the
   model that *proposes* candidate policies. Set it per ASI-Evolve's instructions.
3. **Point its eval-script at this oracle**, e.g.:
   ```bash
   python main.py --experiment trivy_mitigation \
                  --eval-script /path/to/asi_evolve/evaluate.py \
                  --steps 50 --sample-n 8
   ```
   (Use `problem.md` as the problem/seed and `baseline_config.json` as the baseline.)

I verified the oracle and the score landscape here; I did **not** run the LLM loop,
because it requires your API key. Hand me a key (or run step 3 yourself) and it will
converge to the rotate-the-credential optimum above.

> **Note on flag names:** ASI-Evolve's exact CLI flags may differ by version. Match
> `evaluate.py`'s contract — *input: candidate JSON path; output: final stdout line is the
> scalar score* — to whatever harness shape your ASI-Evolve version expects.
