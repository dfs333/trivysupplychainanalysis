# Layer 3 — Predictive Calibration (PRISM MDP)

The **quantitative** counterpart of the Layer 2 TLA+ reachability model. Where Layer 2
answers *"is the attack reachable?"* (yes/no), Layer 3 answers *"with what probability,
how fast, and how far does it propagate?"* — the numbers the paper calibrates against
public frequency data (OSV, Backstabber's Knife Collection) and incident-report timings.

> **PRISM instead of Storm.** The paper outlines Storm for the MDP analysis. Storm has
> no native Windows build, so this implementation uses **PRISM** — the same MDP/PCTL
> semantics and the same queries (`Pmax`, expected-reward, bounded-until). The `.prism`
> models are small and portable; they run unchanged under Storm on Linux if desired.

## Models

| File | What it is |
|---|---|
| `trivy_mdp.prism` | MDP of the attack. Attacker weaponization timing is nondeterministic (adversary); victim build cadence is probabilistic. Knobs `rotated`, `shaPin`; parameter `p` (builds/day). |
| `trivy.props` | `Pmax[F compromise]`, `R{"days_to_compromise"}min[F compromise]`, `Pmax[F<=T compromise]`. |
| `trivy_propagation.prism` + `propagation.props` | Population model: draw a victim's pinning from the corpus distribution (fraction `f` tag-pinned). `Pmax[F compromise] = f` = downstream propagation rate. |
| `run-layer3.ps1` | Runs everything; writes `results/*.csv` and `results/layer3_table.md`. |

The MDP actions (`weaponize`, `run`) are the probabilistic lift of the Layer 2 TLA+
actions `ForcePushTag` and `RunnerExecute`, so the two layers describe the same system.

## Results (reproduce with `run-layer3.ps1`)

### Quantitative mitigation table (build cadence `p = 0.2`/day, horizon `T = 30` days)

| Configuration | `Pmax`(compromise) | E[days] (fastest adversary) | P(compromise ≤ 30 days) |
|---|---|---|---|
| Tag refs + valid stolen cred *(actual)* | **1.0** | **6.00** | **0.9985** |
| Tag refs + complete rotation | 0.0 | ∞ (never) | 0.0000 |
| SHA pins + valid stolen cred | 0.0 | ∞ (never) | 0.0000 |
| SHA pins + complete rotation | 0.0 | ∞ (never) | 0.0000 |

The expected time `6.00` decomposes exactly as `1` day to weaponize `+ 1/p = 5` days to
the next build — a closed-form sanity check the model checker confirms.

### Propagation — compromised population fraction = corpus tag-fraction `f`

`f` = 0.1 → 0.1, 0.2 → 0.2, … 0.9 → 0.9 (PRISM `Pmax` is exactly `f`). So if Layer 1
measures that a fraction `f` of real workflows reference the action by floating tag, the
model predicts a fraction `f` of that population is compromised downstream — the
quantity to check against reported incident counts.

### Sensitivity — expected days-to-compromise vs build cadence `p` (10× range)

| `p` | 0.05 | 0.10 | 0.15 | 0.20 | 0.25 | 0.30 | 0.40 | 0.50 |
|---|---|---|---|---|---|---|---|---|
| E[days] | 21.0 | 11.0 | 7.67 | 6.00 | 5.00 | 4.33 | 3.50 | 3.00 |

Across a **10× variation in `p`**, the vulnerable expected time moves ~21→3 days, **but
the mitigation ranking is invariant**: SHA-pinning yields `Pmax = 0` at *every* value of
`p` (see `results/sensitivity_shapin.csv`). Per the paper's criterion — *"if mitigation
ranking is stable across a 10× variation in compromise probability, it is likely to
succeed"* — the SHA-pin / rotation recommendation is robust to parameter uncertainty.

## Running it

**Prereqs:** a JDK (we use `C:\Program Files\Java\jdk-20`) and the MinGW runtime DLLs
that PRISM's native CUDD library (`prism.dll`) depends on — `libgcc_s_seh-1.dll`,
`libstdc++-6.dll`, `libwinpthread-1.dll`. These ship with **Git for Windows**
(`C:\Program Files\Git\mingw64\bin`), which `run-layer3.ps1` adds to `PATH` automatically.

```powershell
powershell -File .\run-layer3.ps1
```

PRISM itself lives in `prism/` (extracted from the official 4.10.1 Windows installer with
7-Zip — no admin install needed). A single manual query, for reference:

```powershell
$java="C:\Program Files\Java\jdk-20\bin\java.exe"; $P=".\prism"
$env:PATH="C:\Program Files\Git\mingw64\bin;$P\lib;$env:PATH"
& $java -Xss4M "-Djava.library.path=$P\lib" -cp "$P\lib\prism.jar;$P;$P\lib\*" `
   prism.PrismCL trivy_mdp.prism trivy.props -const rotated=0,shaPin=0,p=0.2,T=30
```

## Notes / threats to validity

- `p` (build cadence) and `f` (corpus tag-fraction) are the calibration inputs; both come
  from Layer 1 corpus measurement. The sensitivity sweep is exactly the obligation to
  show conclusions survive their uncertainty.
- The adversary's weaponization is modeled as nondeterministic timing; `Pmax`/`Rmin` are
  therefore worst-case (most-capable-attacker) quantities, the conservative choice for a
  safety argument — consistent with the Layer 2 worst-case uniform-tag assumption.
