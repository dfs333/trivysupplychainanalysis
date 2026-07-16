# Trivy / TeamPCP paper — USENIX Security LaTeX source

`main.tex` is the paper, transpiled into USENIX Security two-column format.
It is **self-contained**: it uses only standard CTAN packages, so it compiles
anywhere without the external USENIX style file.

## Compile

**Option A — Overleaf (recommended for submission).** Create a project, paste
`main.tex`. For camera-ready, start from Overleaf's built-in **"USENIX"**
template and drop this body in, or replace the geometry/titlesec preamble block
with `\usepackage{usenix-2020-09}` (USENIX's official style file).

**Option B — locally with the bundled `tectonic`** (single-binary TeX engine,
already fetched into `_tec/`):

```powershell
.\_tec\tectonic.exe main.tex     # writes main.pdf
```

**Option C — any TeX Live / MiKTeX:**

```bash
pdflatex main.tex && pdflatex main.tex   # twice, to resolve \ref/\cite
```

## Verified

Compiled clean with tectonic 0.16.9: exit 0, **6 pages**, 0 unresolved
references, all 10 sections, Tables 1–5, Listing 1 (TLA+ actions), Figure 1
(TLC counterexample), 20 references.

## Layout notes

- `\documentclass[letterpaper,twocolumn,10pt]` with a full-width title+abstract
  banner via `\twocolumn[...]`, then two-column body.
- Wide tables use `table*` (full width); compact ones use `table`. The code
  listing uses `float=*`; the counterexample is a full-width `figure*`.
- References are an inline `thebibliography` (no external `.bib` needed),
  cited as `\cite{key}`.

## To finish before submitting

- Author block is complete: **Franklin Hanna**, Independent Scholar, franklinhanna9@gmail.com.
- USENIX submissions are typically **anonymous** — leave the author block empty
  or use `\usepackage{usenix-2020-09}`'s anonymous mode for the review version.
