// Generates the filled-in validation/results .docx for the paper:
// "Quantitative Analysis for Mitigation of Multi-Stage Supply Chain Attacks
//  during Routine Automated Workflows in CI/CD Pipelines."
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, TableOfContents, PageNumber, PageBreak,
  TabStopType, LeaderType,
} = require("docx");
const path = require("path");

const CONTENT_W = 9360; // US Letter, 1" margins
const HEAD_FILL = "1F3864", HEAD_TEXT = "FFFFFF", ALT_FILL = "EAF0F8";
const border = { style: BorderStyle.SINGLE, size: 1, color: "B7C3D6" };
const borders = { top: border, bottom: border, left: border, right: border };

// Collect headings so we can bake a STATIC table of contents (a live Word TOC
// field renders blank until the viewer updates fields; a baked TOC never does).
const tocEntries = [];
const H1 = (t) => { tocEntries.push({ text: t, level: 1 }); return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] }); };
const H2 = (t) => { tocEntries.push({ text: t, level: 2 }); return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] }); };
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] });

// page numbers measured from a first render (toc_pages.json); blank on first pass.
let pageMap = {};
try { pageMap = JSON.parse(fs.readFileSync(path.join(__dirname, "toc_pages.json"), "utf8")); } catch (e) {}
function tocLine(e) {
  return new Paragraph({
    spacing: { after: 24 },
    indent: { left: e.level === 2 ? 360 : 0 },
    tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W, leader: LeaderType.DOT }],
    children: [
      new TextRun({ text: e.text, size: 20, bold: e.level === 1, color: e.level === 1 ? "1F3864" : "44546A" }),
      new TextRun({ text: "\t" + (pageMap[e.text] != null ? String(pageMap[e.text]) : ""), size: 20, color: "44546A" }),
    ],
  });
}
const P = (t, opts = {}) => new Paragraph({ spacing: { after: 120 }, children: runs(t), ...opts });
function runs(t) {
  // t can be string or array of {text, bold, italics}
  if (typeof t === "string") return [new TextRun(t)];
  return t.map((r) => new TextRun(r));
}
const Bullet = (t) => new Paragraph({ numbering: { reference: "bul", level: 0 }, spacing: { after: 60 }, children: runs(t) });
const Num = (t) => new Paragraph({ numbering: { reference: "num", level: 0 }, spacing: { after: 60 }, children: runs(t) });

function cell(content, { width, fill, bold, color, align } = {}) {
  const children = (Array.isArray(content) ? content : [content]).map(
    (line) => new Paragraph({
      alignment: align || AlignmentType.LEFT,
      children: [new TextRun({ text: String(line), bold: !!bold, color: color || "000000", size: 19 })],
    })
  );
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 110, right: 110 },
    children,
  });
}

function makeTable(headers, rows, widths) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => cell(h, { width: widths[i], fill: HEAD_FILL, bold: true, color: HEAD_TEXT })),
  });
  const bodyRows = rows.map((r, ri) =>
    new TableRow({
      children: r.map((c, i) => cell(c, { width: widths[i], fill: ri % 2 ? ALT_FILL : undefined })),
    })
  );
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: widths,
    rows: [headerRow, ...bodyRows],
  });
}
const Spacer = () => new Paragraph({ spacing: { after: 80 }, children: [new TextRun("")] });

// ----------------------------------------------------------------------------
const children = [];

// Title block
children.push(new Paragraph({
  alignment: AlignmentType.CENTER, spacing: { before: 2400, after: 120 },
  children: [new TextRun({ text: "Quantitative Analysis for Mitigation of Multi-Stage Supply Chain Attacks during Routine Automated Workflows in CI/CD Pipelines", bold: true, size: 40, color: "1F3864" })],
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER, spacing: { after: 80 },
  children: [new TextRun({ text: "Validation & Results — Trivy / “TeamPCP” Incident Reconstruction", size: 28, color: "44546A" })],
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER, spacing: { after: 60 },
  children: [new TextRun({ text: "Formally verified with TLC (TLA+) and PRISM; mitigation search via ASI-Evolve", italics: true, size: 22, color: "44546A" })],
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER, spacing: { after: 2400 },
  children: [new TextRun({ text: "June 24, 2026", size: 22, color: "808080" })],
}));
children.push(new Paragraph({ children: [new PageBreak()] }));

// TOC (static, baked; lines spliced in here once every heading is collected)
children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Contents")] }));
const tocPos = children.length;
children.push(new Paragraph({ children: [new PageBreak()] }));

// 1. Overview
children.push(H1("1. Overview"));
children.push(P("This document reports the validation results for a formal-methods analysis of the March 2026 Trivy / “TeamPCP” GitHub Action supply-chain attack (CVE-2026-33634). The analysis establishes, with exhaustive model checking rather than simulation, (a) that the documented attack is reachable from the disclosed pre-attack state, and (b) which mitigations provably close it. The work is organized as the paper’s three validation layers, each built and executed:"));
children.push(Bullet([{ text: "Layer 1 — Structural faithfulness: ", bold: true }, { text: "static corpus analysis of real GitHub Actions workflows, measuring the frequencies the model relies on (headline: the floating-tag fraction f)." }]));
children.push(Bullet([{ text: "Layer 2 — Incident reconstruction: ", bold: true }, { text: "a TLA+ model checked with TLC, reproducing the documented attack and discriminating complete from partial mitigation." }]));
children.push(Bullet([{ text: "Layer 3 — Predictive calibration: ", bold: true }, { text: "a PRISM Markov Decision Process computing exact compromise probabilities, expected time-to-compromise, and propagation rates." }]));
children.push(P([{ text: "Tooling note. ", bold: true }, { text: "The paper outlines Storm for the probabilistic layer; PRISM is used here (identical MDP/PCTL semantics) because Storm has no native Windows build. ASI-Evolve is used for its actual purpose — autonomous optimization — to search the mitigation space against the verified model as ground truth; it is not itself a verifier." }]));

// 2. Methodology summary
children.push(H1("2. Methodology"));
children.push(P("Formal methods analyze all potential system behaviors rather than simulation samples. We define the automated workflow as a labeled transition system, prove multi-stage reachability properties with TLA+/TLC, and express the same dynamics as an MDP in PRISM to compute exact compromise probabilities under different mitigations. We formalize the distinction between a vulnerable and a hardened workflow and establish, per configuration, whether the safety property holds, thereby quantifying the residual attack surface."));
children.push(makeTable(
  ["Layer", "Artifact", "Tool", "Question answered"],
  [
    ["1", "corpus_analysis.py", "Python / PyYAML", "Does the model capture what real workflows do?"],
    ["2", "TrivySupplyChain.tla", "TLC 2.19 (TLA+)", "Is the attack reachable? Which mitigations close it?"],
    ["3", "trivy_mdp.prism", "PRISM 4.10.1", "With what probability, how fast, how far does it spread?"],
    ["+", "evaluate.py", "ASI-Evolve + PRISM", "What is the minimal-cost provably-safe policy?"],
  ],
  [900, 2750, 2200, 3510]
));

// 3. Layer 1
children.push(H1("3. Layer 1 — Structural Faithfulness (corpus analysis)"));
children.push(P("A static analyzer extracts, from each real workflow, the features the model claims to represent: trigger events, permission scopes, secret usage, action-version pinning (SHA vs floating tag), runner types, job dependencies, and artifact flows. Sample corpus: 189 workflow files from 18 major open-source projects (0 parse errors)."));
children.push(H2("3.1 Headline calibration parameter"));
children.push(makeTable(
  ["Quantity", "Measured value"],
  [
    ["External (resolvable) action references", "1,517"],
    ["SHA-pinned", "956  (63.0%)"],
    ["Floating tag / branch (unpinned)", "561  (37.0%)"],
    ["Floating-tag fraction  f", "0.3698"],
  ],
  [6360, 3000]
));
children.push(P([{ text: "This f is the empirical basis for the model’s pinning assumption. ", bold: true }, { text: "Feeding the measured f = 0.3698 into the Layer 3 propagation model yields a predicted downstream-compromise fraction of 0.3698 (≈37%). The Layer 2 safety proof instead uses the worst case f = 1 (universal floating tags), the conservative bound appropriate for a safety claim." }]));
children.push(H2("3.2 Compromise-relevant frequencies"));
children.push(makeTable(
  ["Property", "Observed"],
  [
    ["pull_request_target (privileged-context trigger)", "11.6% of workflows"],
    ["workflow_run trigger", "3.7%"],
    ["self-hosted runner", "14.8%"],
    ["references repository secrets", "50.3%"],
    ["permissions: least-privilege (none / granular-read)", "56 / 55 workflows"],
    ["permissions: granular-write / unspecified / read-all", "28 / 49 / 1 workflows"],
  ],
  [6360, 3000]
));
children.push(H2("3.3 Construct coverage"));
children.push(P([{ text: "88.2% ", bold: true }, { text: "of observed compromise-relevant construct-instances fall within the modeled set (external action use, SHA-vs-tag resolution, secrets in environment, trigger→run, runner execution). The remaining 11.8% are constructs the model abstracts and argues are independent of the tag-mutation→exfiltration property: matrix strategies (23.8% of workflows), artifact flows (27.0%), and reusable-workflow calls (9.0%)." }]));
children.push(P([{ text: "Coverage statement. ", italics: true }, { text: "“Our model captures 88.2% of the compromise-relevant constructs observed in the corpus; the remaining 11.8% consist of matrix strategies, artifact flows, and reusable-workflow nesting, which are independent of the tag-mutation reachability property under study.”", italics: true }]));

// 4. Layer 2
children.push(H1("4. Layer 2 — Incident Reconstruction (TLA+ / TLC)"));
children.push(P("The TLA+ model encodes the disclosed pre-attack state and two independent mitigation knobs. Each row of the table below is a separate TLC run with a different initial state; the table is the validation."));
children.push(H2("4.1 Combined mitigation / validation table"));
children.push(makeTable(
  ["Configuration", "NoExfiltration", "Residual access", "Matches reality"],
  [
    ["Tag refs + valid stolen cred (pre-March actual)", "FAILS", "triggered", "Yes — attack occurred"],
    ["Tag refs + complete rotation", "holds", "not triggered", "No attack"],
    ["SHA pins + valid stolen cred", "holds", "not triggered", "Protects even with residual cred"],
    ["SHA pins + complete rotation", "holds", "not triggered", "Full defense"],
  ],
  [3360, 1700, 1700, 2600]
));
children.push(P([{ text: "Load-bearing result: ", bold: true }, { text: "the model distinguishes complete credential rotation (safe) from the partial rotation that actually happened (still exploited) — i.e., it formally reproduces the documented incident causation. Independently, universal SHA-pinning closes the path even while the stolen credential remains valid (TLC explores all 1,024 tag-mutation states; none reach execution)." }]));
children.push(H2("4.2 Adversary counterexample vs documented dossier trace"));
children.push(P("On the vulnerable configuration, TLC returns the documented attack as the shortest counterexample (3 states). A scripted trace check independently confirms the path is reachable from Init (search depth 3)."));
children.push(makeTable(
  ["Documented (dossier)", "TLC counterexample"],
  [
    ["1. Attacker holds Aqua service account", "[Init] (attacker starts with credential)"],
    ["2. Force-push tags to malicious commits", "ForcePushTag(trivy_action, tg1, c_malicious)"],
    ["3. Victim pipeline executes on next run", "RunnerExecute(v1, trivy_action, tg1)"],
    ["4. Exfiltration to attacker C2", "attackerKnowledge′ = victimSecrets[v1]"],
  ],
  [4680, 4680]
));
children.push(H2("4.3 Evidence table (pre-attack state → dossier source)"));
children.push(makeTable(
  ["Model element", "Dossier claim", "Source"],
  [
    ["ForcePushTag repoints tags", "76/77 tags on trivy-action, 7/7 on setup-trivy force-pushed", "Aqua; Microsoft"],
    ["AquaServiceAcct valid + held", "Residual Feb service-account credential left valid", "Endor Labs"],
    ["victimSecrets exfiltrated", "Cloud creds, SSH keys, K8s configs, CI secrets in runner env", "Wiz; Endor Labs"],
    ["RunnerExecute → attackerKnowledge", "Payload reads runner env, exfiltrates to C2", "ReversingLabs; Wiz; IOCs"],
    ["v1..v5 anonymous victim orgs (Mercor = cascade evidence)", "Mercor, the first publicly named victim, attributes its breach to the follow-on LiteLLM compromise (stage 2), evidencing the multi-stage cascade", "Mercor disclosure (2026-03-31)"],
    ["stolen npm tokens → stage 2", "CanisterWorm on npm", "Palo Alto Unit 42"],
  ],
  [2900, 4360, 2100]
));

children.push(H2("4.4 Isolation between pipelines"));
children.push(P("Generalizing the SHA-pin knob to a set lets us check a MIXED population: v1 and v2 pin by SHA; v3-v5 use floating tags; the stolen credential is still valid. The Isolation invariant -- no SHA-pinned victim's secret is ever exfiltrated -- HOLDS across all 8,185 reachable states, even though the attack simultaneously succeeds against the tag-pinned victims. SHA-pinning therefore ISOLATES a pipeline from the blast radius of its unpinned neighbours."));
children.push(H2("4.5 Refinement relation and residual attack surface"));
children.push(P("An abstract SecureWorkflow spec exposes a single bit, leaked, that never becomes true. Under the mapping leaked := (a victim secret reaches the attacker), the HARDENED workflow refines SecureWorkflow (TLC: property holds), while the VULNERABLE workflow does not (TLC returns a behaviour whose leaked flips false to true -- the documented attack). The residual attack surface is quantified: the reachable compromised set equals exactly the unpinned subset, which hardening shrinks monotonically to the empty set."));
children.push(makeTable(
  ["Check", "Configuration", "TLC result"],
  [
    ["Isolation (mixed population)", "v1,v2 pinned; v3-v5 tags", "HOLDS (8,185 states)"],
    ["Containment witness", "same", "breach reaches only unpinned v3"],
    ["Refinement: hardened refines Secure", "all SHA-pinned", "HOLDS"],
    ["Refinement: vulnerable refines Secure", "all floating tags", "FAILS (leaked flips)"],
    ["Residual surface reachable", "all floating tags", "= all 5 victims (the unpinned set)"],
  ],
  [3200, 3360, 2800]
));

// 5. Layer 3
children.push(H1("5. Layer 3 — Predictive Calibration (PRISM MDP)"));
children.push(P("The same actions (ForcePushTag, RunnerExecute) are lifted into an MDP: the attacker’s weaponization timing is nondeterministic (adversary), the victim build cadence is probabilistic (p builds/day)."));
children.push(H2("5.1 Quantitative mitigation table (p = 0.2/day, horizon T = 30 days)"));
children.push(makeTable(
  ["Configuration", "Pmax(compromise)", "E[days] (fastest adversary)", "P(≤ 30 days)"],
  [
    ["Tag refs + valid stolen cred (actual)", "1.0", "6.00", "0.9985"],
    ["Tag refs + complete rotation", "0.0", "∞ (never)", "0.0000"],
    ["SHA pins + valid stolen cred", "0.0", "∞ (never)", "0.0000"],
    ["SHA pins + complete rotation", "0.0", "∞ (never)", "0.0000"],
  ],
  [3360, 2200, 2400, 1400]
));
children.push(P("The expected time 6.00 decomposes exactly as 1 day to weaponize + 1/p = 5 days to the next build — a closed-form sanity check the model checker confirms."));
children.push(H2("5.2 Propagation — compromised fraction equals the corpus tag-fraction f"));
children.push(makeTable(
  ["Corpus tag-fraction f", "0.10", "0.30", "0.3698*", "0.50", "0.70", "0.90"],
  [["Predicted compromised fraction", "0.10", "0.30", "0.3698", "0.50", "0.70", "0.90"]],
  [3360, 1000, 1000, 1200, 1000, 900, 900]
));
children.push(P([{ text: "*", bold: true }, { text: " the value measured in Layer 1. The propagation model returns Pmax = f exactly, so the Layer 1 measurement flows directly into a downstream-compromise prediction calibratable against reported incident counts." }]));
children.push(H2("5.3 Sensitivity — expected days-to-compromise vs build cadence p (10× range)"));
children.push(makeTable(
  ["p (builds/day)", "0.05", "0.10", "0.15", "0.20", "0.25", "0.30", "0.40", "0.50"],
  [["E[days] to compromise", "21.0", "11.0", "7.67", "6.00", "5.00", "4.33", "3.50", "3.00"]],
  [2760, 825, 825, 825, 825, 825, 825, 825, 825]
));
children.push(P([{ text: "Mitigation ranking stability: ", bold: true }, { text: "across this 10× variation in p the vulnerable time moves 21→3 days, but SHA-pinning yields Pmax = 0 at every value of p. Per the paper’s criterion — if the ranking is stable across a 10× variation, the recommendation is robust — the SHA-pin / rotation guidance survives parameter uncertainty." }]));

children.push(H2("5.4 Multi-stage propagation (stage 1 to stage 2)"));
children.push(P("A DTMC chains the two documented stages: stage 1 (trivy-action compromise yields a stolen npm publish token with probability q) enables stage 2 (CanisterWorm npm publication, adopted by downstream consumers at per-day rate r). With p = 0.2, q = 0.5, r = 0.1, N2 = 5:"));
children.push(makeTable(
  ["Multi-stage metric", "Value"],
  [
    ["P(reach stage 2 / npm propagation)", "0.50  (= token-theft rate q)"],
    ["P(stage 2 within 30 days)", "0.454"],
    ["P(full downstream propagation)", "0.50"],
    ["E[hosts compromised at day 30]", "2.18"],
    ["E[days to first downstream compromise] (q=1)", "16.0 = 1 weaponize + 5 stage-1 + 10 adoption"],
    ["P(reach stage 2) under complete rotation", "0.00  (rotation kills the entire cascade)"],
  ],
  [6000, 3360]
));
children.push(P([{ text: "Key result: ", bold: true }, { text: "complete credential rotation drives the probability of the whole downstream npm cascade to zero, not merely stage 1." }]));
children.push(H2("5.5 Parametric model checking"));
children.push(P("PRISM's parametric engine returns closed-form functions of the parameters, not point samples:"));
children.push(makeTable(
  ["Quantity", "Closed form (PRISM, exact)"],
  [
    ["Expected days-to-compromise vs build cadence p", "(p + 1) / p"],
    ["P(reach stage 2) vs token-theft rate q", "q"],
  ],
  [6000, 3360]
));
children.push(P("The first is the symbolic form of the discrete sensitivity sweep (21 to 3 days); the second proves the downstream propagation probability equals the token-theft rate exactly, for every q."));

// 6. Mitigation discovery
children.push(H1("6. Mitigation Discovery (ASI-Evolve over the verified model)"));
children.push(P("ASI-Evolve proposes candidate defender policies; each is model-checked by PRISM before it earns a score (score = −(compromise_fraction + operational_cost)). The LLM proposes; the model checker decides. Verified score landscape:"));
children.push(makeTable(
  ["Policy", "Compromise fraction", "Cost", "Score", "Safe?"],
  [
    ["baseline (no pin, no rotation)", "1.0", "0.00", "−1.00", "no"],
    ["rotate credential only", "0.0", "0.05", "−0.05  (optimum)", "yes"],
    ["full SHA-pin, no rotation", "0.0", "0.30", "−0.30", "yes"],
    ["half SHA-pin, no rotation", "0.5", "0.15", "−0.65", "no"],
  ],
  [3360, 2200, 1200, 1700, 900]
));
children.push(P("Maximizing the score converges on complete credential rotation — the minimal-cost provably-safe policy, which is exactly the paper’s central finding."));

// 7. Validation section (paper checklist, filled in)
children.push(H1("7. Validation Section"));
children.push(H2("7.1 Corpus coverage"));
children.push(P("88.2% of compromise-relevant constructs in the 189-workflow corpus are within the formalism; the excluded 11.8% (matrix strategies, artifact flows, reusable-workflow nesting) do not affect the tag-mutation→exfiltration reachability property."));
children.push(H2("7.2 Incident reconstruction"));
children.push(makeTable(
  ["Incident", "Reachable pre-mitigation?", "Closed by mitigation?", "Matches documented outcome?"],
  [
    ["Trivy / TeamPCP (Mar 2026, CVE-2026-33634)", "Yes (3-step trace)", "SHA pin: yes; complete rotation: yes; partial rotation: no", "Yes — partial rotation flagged insufficient, matching the real causation"],
  ],
  [2900, 1900, 2360, 2200]
));
children.push(H2("7.3 Calibration"));
children.push(P("Input distributions are derived from public data. The floating-tag fraction f = 0.3698 comes from Layer 1 corpus measurement. Stage-2 malicious-package rates come from the OpenSSF malicious-packages dataset (OSV format, seeded by the Backstabber's Knife Collection, Ohm et al. DIMVA 2020): npm accounts for 214,497 reports -- 94.2% of all ecosystems -- and npm malicious-package publications rose from 329 in February 2026 to 1,048 in March 2026 (a 3.19x spike), the exact month of the CanisterWorm stage-2 attack, which was one of those 1,048 packages."));
children.push(P([{ text: "Timeline consistency: ", bold: true }, { text: "the model's fastest-adversary times (6 days to stage-1 compromise, 16 days to the first downstream compromise) are lower bounds consistent with the documented ~28-day February-to-March residual-credential window; the surplus is adversarial patience, captured by the MDP's nondeterministic weaponization timing." }]));
children.push(H2("7.4 Sensitivity"));
children.push(P("Conclusions are stable under parameter uncertainty: a 10× variation in p changes absolute timings but not the mitigation ranking (SHA-pinning and complete rotation remain Pmax = 0 throughout)."));
children.push(H2("7.5 Threats to validity"));
children.push(Bullet("Disclosure bias: only publicly caught and disclosed incidents are modeled."));
children.push(Bullet("Model vs deployment: the formalism abstracts deployed systems (network path, payload internals, Git storage)."));
children.push(Bullet("Survivorship / popularity bias: the corpus is large, security-mature projects that SHA-pin more than average, so the measured f = 37% is a lower bound on the ecosystem-wide floating-tag rate."));
children.push(Bullet("Sample size: 189 workflows is a demonstration corpus; the analyzer scales unchanged to larger corpora."));

// 8. Reproducibility
children.push(H1("8. Reproducibility"));
children.push(P("Each layer regenerates its results with a single command (Windows PowerShell; bundled TLA+ and PRISM tools, JDK 20):"));
children.push(Num([{ text: "Layer 1: ", bold: true }, { text: "layer1\\run-layer1.ps1  (14/14 extractor unit tests, then corpus analysis)" }]));
children.push(Num([{ text: "Layer 2: ", bold: true }, { text: "run-all.ps1  (5 TLC checks: 4 configs + scripted trace)" }]));
children.push(Num([{ text: "Layer 3: ", bold: true }, { text: "layer3\\run-layer3.ps1  (PRISM quantitative table, propagation, sensitivity)" }]));
children.push(Num([{ text: "Discovery: ", bold: true }, { text: "asi_evolve\\evaluate.py  (PRISM-backed policy oracle)" }]));

// 9. References
// 9. Caveats & limitations (its own page)
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("9. Caveats & Limitations"));
children.push(P("This analysis is deliberately scoped and conservative. The following caveats qualify every result above and should be read alongside the threats to validity in §7.5."));

children.push(H2("9.1 Calibration and data"));
children.push(Bullet([{ text: "Unmeasured stage-2 parameters. ", bold: true }, { text: "q (fraction of compromised runners holding npm publish tokens) and r (downstream adoption rate) are assumptions; no clean public dataset exists for them. The parametric result P(reach stage 2) = q is reported precisely so this dependence is explicit rather than buried in a point estimate." }]));
children.push(Bullet([{ text: "Corpus is small and popularity-biased. ", bold: true }, { text: "189 workflows from large, security-mature OSS projects, which SHA-pin far more than typical repositories. The measured floating-tag fraction f = 37% is therefore a LOWER BOUND on the ecosystem-wide rate." }]));
children.push(Bullet([{ text: "Build cadence is illustrative. ", bold: true }, { text: "p = 0.2 builds/day is an assumed value, not a per-repository measurement." }]));
children.push(Bullet([{ text: "Calibration is correlational. ", bold: true }, { text: "The Feb->Mar npm spike (329 -> 1,048) corroborates the incident timing and situates CanisterWorm in measured base rates, but does not by itself establish causation." }]));
children.push(Bullet([{ text: "Incident facts taken from the dossier. ", bold: true }, { text: "CVE-2026-33634, the 76/77 and 7/7 tag counts, victim identities, and dates are encoded faithfully from the provided sources, not independently re-verified against live records." }]));

children.push(H2("9.2 Modeling abstractions"));
children.push(Bullet([{ text: "Small model scale. ", bold: true }, { text: "5 victims, 5 tags, 3 commits, 2 repos. Sufficient to exercise the reachability/safety property, but not a proof for arbitrary population size N." }]));
children.push(Bullet([{ text: "Deliberate boundary (Step 2). ", bold: true }, { text: "Out of scope by design: how the attacker first obtained the credential (an initial condition); the C2 network path (modeled as set union); victim production systems downstream; Git object-storage internals (tag mutation is atomic); GitHub's internal authn/authz; and payload byte-structure (only the active secret-transfer behaviour is modeled)." }]));
children.push(Bullet([{ text: "Stage-2 propagation is simplified. ", bold: true }, { text: "Downstream adoption is modeled as sequential (one consumer per day at rate r) over a small representative population (N2 = 5), not full population contagion dynamics." }]));
children.push(Bullet([{ text: "Worst-case adversary. ", bold: true }, { text: "Weaponization timing is nondeterministic, so Pmax / Rmin report the most-capable attacker, not expected real-world behaviour. Reported times are lower bounds." }]));
children.push(Bullet([{ text: "Single observable in the refinement. ", bold: true }, { text: "The abstract `leaked` bit collapses all victim-secret exfiltration into one observation; the refinement is proven at the model's scale." }]));

children.push(H2("9.3 Tooling and methodology"));
children.push(Bullet([{ text: "PRISM, not Storm. ", bold: true }, { text: "The paper names Storm; PRISM is used (identical MDP/PCTL semantics) because Storm has no native Windows build. No Storm run was performed; the .prism models are portable to Storm on Linux." }]));
children.push(Bullet([{ text: "Parametric engine limits. ", bold: true }, { text: "PRISM's parametric engine returns closed forms for unbounded reachability and expected rewards, but not for step-bounded (F<=T) properties; the bounded compromise probability is given by its analytic form 1-(1-p)^(T-1), verified numerically." }]));
children.push(Bullet([{ text: "ASI-Evolve loop not run. ", bold: true }, { text: "Only the evaluation oracle and its score landscape were verified locally; the full LLM-driven evolutionary loop requires an external API key and was not executed." }]));
children.push(Bullet([{ text: "No practitioner review. ", bold: true }, { text: "The paper calls for platform / CI-CD / SLSA engineers to review the threat model before formalization; that human step has not been done." }]));
children.push(Bullet([{ text: "Single incident reconstructed. ", bold: true }, { text: "Only the Trivy / TeamPCP incident is modeled; the validation methodology envisions a table of N historical incidents." }]));

children.push(H2("9.4 Reproducibility and environment"));
children.push(Bullet([{ text: "Host-specific paths. ", bold: true }, { text: "The run scripts hardcode this machine's JDK 20 and the Git-for-Windows MinGW runtime (for PRISM's native CUDD library) and work around a broken system java launcher; they will need adjustment on another host." }]));
children.push(Bullet([{ text: "Not under version control. ", bold: true }, { text: "The artifacts are not yet in a git repository; there is no commit history or provenance tracking." }]));

children.push(H1("10. References (dossier)"));
const refs = [
  "Aqua Security — Trivy supply-chain attack disclosure: https://www.aquasec.com/blog/trivy-supply-chain-attack-what-you-need-to-know/",
  "GitHub Security Advisory — aquasecurity/trivy: https://github.com/aquasecurity/trivy/security/advisories",
  "CVE-2026-33634: https://www.cve.org/CVERecord?id=CVE-2026-33634",
  "Palo Alto Unit 42 (CanisterWorm): https://unit42.paloaltonetworks.com/teampcp-supply-chain-attacks/",
  "Microsoft Security Blog — detecting/defending the Trivy compromise: https://www.microsoft.com/en-us/security/blog/2026/03/24/detecting-investigating-defending-against-trivy-supply-chain-compromise/",
  "Wiz Research: https://www.wiz.io/blog/trivy-compromised-teampcp-supply-chain-attack",
  "ReversingLabs: https://www.reversinglabs.com/blog/teampcp-supply-chain-attack-spreads",
  "Endor Labs (Feb–Mar causal chain): https://www.endorlabs.com/learn/teampcp-isnt-done",
  "Kudelski Security (two variants): https://kudelskisecurity.com/research/investigating-two-variants-of-the-trivy-supply-chain-compromise",
  "SANS ISC: https://isc.sans.edu/diary/32856",
  "Cato Networks: https://www.catonetworks.com/blog/teampcp-supply-chain-attack/",
];
refs.forEach((r) => children.push(Num(r)));

// ----------------------------------------------------------------------------
// bake the static table of contents now that all headings are collected
children.splice(tocPos, 0, ...tocEntries.map(tocLine));
fs.writeFileSync(path.join(__dirname, "toc_titles.json"), JSON.stringify(tocEntries.map((e) => e.text), null, 2));

const doc = new Document({
  styles: {
    default: { document: { run: { font: "Calibri", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 30, bold: true, color: "1F3864", font: "Calibri" },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, color: "2E4D7B", font: "Calibri" },
        paragraph: { spacing: { before: 220, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 23, bold: true, color: "44546A", font: "Calibri" },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bul", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "num", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Trivy / TeamPCP — Validation & Results", color: "808080", size: 18 })] })] }) },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Page ", size: 18, color: "808080" }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "808080" })] })] }) },
    children,
  }],
});

const out = process.argv[2] || "output.docx";
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(out, buf); console.log("Wrote " + out + " (" + buf.length + " bytes)"); });
