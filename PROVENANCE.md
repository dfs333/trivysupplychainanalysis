# Provenance of third-party material

This repository bundles some third-party material to make the analysis reproducible.
Its origin and license status are documented here so nothing non-original is ambiguous.

## Layer 1 corpus (`TrivySupplyChain/layer1/corpus/`)

189 GitHub Actions workflow files (`.github/workflows/*.yml`) collected from 18 large,
public open-source projects. They are used **only as read-only input** to the Layer 1
structural analyzer, which measures how often the modeled constructs (tag-vs-SHA pinning,
triggers, permissions, secrets, runners, matrices, reusable calls, artifact flow) appear in
real workflows. The files are **unmodified**; nothing in this repository is derived from
them beyond aggregate statistics.

Source repositories:

| Project | Repository |
|---|---|
| actions/runner | https://github.com/actions/runner |
| denoland/deno | https://github.com/denoland/deno |
| django/django | https://github.com/django/django |
| elastic/elasticsearch | https://github.com/elastic/elasticsearch |
| facebook/react | https://github.com/facebook/react |
| fastapi/fastapi | https://github.com/fastapi/fastapi |
| grafana/grafana | https://github.com/grafana/grafana |
| hashicorp/terraform | https://github.com/hashicorp/terraform |
| home-assistant/core | https://github.com/home-assistant/core |
| microsoft/vscode | https://github.com/microsoft/vscode |
| nodejs/node | https://github.com/nodejs/node |
| numpy/numpy | https://github.com/numpy/numpy |
| pallets/flask | https://github.com/pallets/flask |
| prometheus/prometheus | https://github.com/prometheus/prometheus |
| pytorch/pytorch | https://github.com/pytorch/pytorch |
| sveltejs/svelte | https://github.com/sveltejs/svelte |
| tokio-rs/tokio | https://github.com/tokio-rs/tokio |
| vercel/next.js | https://github.com/vercel/next.js |

**Licensing.** Each workflow file remains subject to the license of its originating
repository as of retrieval. Those licenses vary: most are permissive (MIT, BSD-3-Clause,
Apache-2.0), and a few are copyleft or source-available (for example, Grafana under
AGPL-3.0, HashiCorp Terraform under BUSL-1.1, Elastic under its own license). This
repository does **not** relicense them — the Apache-2.0 and CC-BY-4.0 licenses here cover
only the original work (the analyzer, models, scripts, generators, and paper). Anyone
redistributing the corpus should consult each upstream project's license.

**Regenerating the corpus.** The corpus can be re-fetched from these public repositories
with `TrivySupplyChain/layer1/fetch_corpus.py`. The committed copy exists so the Layer 1
results reproduce deterministically — including in CI — without network access.

## Bundled tools

| Tool | Location | License |
|---|---|---|
| PRISM 4.10.1 (probabilistic model checker) | `TrivySupplyChain/layer3/prism/` | GPL — see `prism/COPYING.txt` |
| TLA+ tools / TLC 2.19 | `TrivySupplyChain/tools/tla2tools.jar` | MIT |

These are redistributed under their own licenses so the analysis runs offline.

## The incident under study

The Trivy / TeamPCP supply-chain compromise (CVE-2026-33634) is analyzed from public
reporting (cited in the paper and `Trivy-TeamPCP-Dossier.md`). This repository does not
host, reproduce, or distribute any exploit or attacker artifact.
