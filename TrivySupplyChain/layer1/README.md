# Layer 1 — Structural Faithfulness (corpus analysis)

Does the formal model capture what real GitHub Actions workflows actually do? This layer
statically analyzes a corpus of real workflow YAML and measures the frequency of exactly
the features the Layer 2/3 model claims to represent. Its headline output — the
**floating-tag fraction `f`** — is the empirical basis for the model's `pinningPolicy`
assumption and the Layer 3 propagation parameter.

## Tool

| File | Purpose |
|---|---|
| `corpus_analysis.py` | The analyzer. Parses workflow YAML (handles the `on:` → `True` quirk) and extracts: trigger events, permission scopes, secret usage, action-version pinning (SHA vs floating tag), runner types, job dependencies, artifact flows, matrix/reusable constructs. Computes frequencies + construct coverage. |
| `fetch_corpus.py` | Downloads a real sample corpus from popular public repos via the unauthenticated GitHub API. |
| `fixtures/` + `test_corpus_analysis.py` | Synthetic workflows with hand-computed expected values; 14 assertions that pin the extractor's correctness. |
| `run-layer1.ps1` | Runs the tests, (optionally) fetches, then analyzes. |
| `corpus/` | The fetched sample (189 real workflows from 18 projects). |
| `results/corpus_report.{json,md}` | Generated results. |

```powershell
powershell -File .\run-layer1.ps1          # tests + analyze
powershell -File .\run-layer1.ps1 -Fetch   # also re-fetch corpus
```

## Results (sample corpus: 189 workflows, 18 major OSS projects, 0 parse errors)

### Headline calibration parameter

| Quantity | Measured |
|---|---|
| External (resolvable) action references | 1,517 |
| SHA-pinned | 956 (**63.0%**) |
| Floating tag / branch | 561 (**37.0%**) |
| **Floating-tag fraction `f`** | **0.3698** |

This is the parameter that feeds Layer 3: running the propagation model at the measured
`f = 0.3698` yields `Pmax(compromise) = 0.3698` — the model predicts ~**37%** of this
population is compromised downstream when a malicious tag enters and the credential is
unrotated. The Layer 2 safety proof instead uses the worst case `f = 1` (`UniversalSHAPin
= FALSE`), which is the conservative bound appropriate for a safety claim.

### Compromise-relevant frequencies

| Property | Value |
|---|---|
| `pull_request_target` (privileged-context trigger) | 11.6% of workflows |
| `workflow_run` trigger | 3.7% |
| self-hosted runner | 14.8% |
| references secrets | 50.3% |
| permissions: `none`/granular-read (least-priv) | 56 / 55 workflows |
| permissions: granular-write / unspecified / read-all | 28 / 49 / 1 |

### Construct coverage

**88.2%** of observed compromise-relevant construct-instances are within the modeled set
(external action use, SHA-vs-tag resolution, secrets in env, trigger→run, runner
execution). The remaining ~11.8% are constructs the model deliberately abstracts and
argues are independent of the tag-mutation → exfiltration property:

- matrix strategies — 23.8% of workflows (parallelism; doesn't change whether the
  malicious commit executes);
- artifact flows — 27.0% (orthogonal to the credential/tag path);
- reusable workflow calls — 9.0% (indirection with the same `uses`-resolution semantics).

Coverage statement for the paper: *"our model captures 88.2% of the compromise-relevant
constructs observed in the corpus; the remaining 11.8% consist of matrix strategies,
artifact flows, and reusable-workflow nesting, which are independent of the tag-mutation
reachability property under study."*

## Threats to validity

- **Survivorship / popularity bias.** The sample is large, security-mature OSS projects,
  which SHA-pin far more than typical repositories. The measured `f = 37%` is therefore a
  **lower bound** on the floating-tag rate in the broader population; the true ecosystem
  fraction (and hence downstream propagation) is plausibly higher. The paper flags exactly
  this bias.
- **Sample size.** 189 workflows is a demonstration corpus, not the "millions" the full
  study targets. The analyzer runs unchanged on any larger directory of workflow YAML —
  point `corpus_analysis.py` at it to scale up.
- **Static only.** We see declared configuration, not runtime resolution (e.g., a tag that
  currently resolves to a benign commit). That is precisely the gap the formal model
  reasons about.
