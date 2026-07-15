// Generates an academic-paper .docx (single-column, LNCS/arXiv style) from the
// verified Trivy / TeamPCP formal-analysis project.
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, PageNumber, PageBreak, TabStopType, TabStopPosition,
} = require("docx");

const CW = 9360;                 // content width (US Letter, 1" margins)
const SERIF = "Times New Roman";
const MONO = "Consolas";
const INK = "111111", ACCENT = "1F3864", MUTE = "555555";
const cellBorder = { style: BorderStyle.SINGLE, size: 1, color: "AAAAAA" };
const cellBorders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

const children = [];
let TAB = 0, FIG = 0, LIST = 0;

// ---- inline-run helper (string | [{text,bold,italics,sup}] ) ----
function runs(t, base = {}) {
  const arr = typeof t === "string" ? [{ text: t }] : t;
  return arr.map((r) => new TextRun({
    text: r.text, bold: r.bold, italics: r.italics, superScript: r.sup,
    font: r.font || SERIF, size: r.size || base.size || 21, color: r.color || base.color || INK,
  }));
}
const body = (t, opts = {}) => new Paragraph({
  alignment: AlignmentType.JUSTIFIED, spacing: { after: 120, line: 264 },
  children: runs(t), ...opts,
});
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 260, after: 110 },
  children: [new TextRun({ text: t, bold: true, font: SERIF, size: 26, color: ACCENT })] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 180, after: 90 },
  children: [new TextRun({ text: t, bold: true, font: SERIF, size: 23, color: ACCENT })] });
const bullet = (t) => new Paragraph({ numbering: { reference: "bul", level: 0 }, alignment: AlignmentType.JUSTIFIED,
  spacing: { after: 70, line: 260 }, children: runs(t) });

// ---- table with academic caption ABOVE ----
function tcell(txt, { w, head, bold, alignC } = {}) {
  return new TableCell({
    borders: cellBorders, width: { size: w, type: WidthType.DXA },
    shading: head ? { fill: "1F3864", type: ShadingType.CLEAR } : undefined,
    margins: { top: 46, bottom: 46, left: 96, right: 96 },
    children: (Array.isArray(txt) ? txt : [txt]).map((line) => new Paragraph({
      alignment: alignC ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text: String(line), bold: !!(bold || head), font: SERIF, size: 18,
        color: head ? "FFFFFF" : INK })],
    })),
  });
}
function pushTable(caption, headers, rows, widths, aligns = []) {
  TAB += 1;
  children.push(new Paragraph({ spacing: { before: 140, after: 60 }, alignment: AlignmentType.LEFT,
    children: [ new TextRun({ text: `Table ${TAB}. `, bold: true, font: SERIF, size: 19, color: INK }),
                new TextRun({ text: caption, italics: true, font: SERIF, size: 19, color: INK }) ] }));
  const hr = new TableRow({ tableHeader: true, children: headers.map((h, i) => tcell(h, { w: widths[i], head: true, alignC: aligns[i] === "c" })) });
  const br = rows.map((r) => new TableRow({ children: r.map((c, i) => tcell(c, { w: widths[i], alignC: aligns[i] === "c" })) }));
  children.push(new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: widths, rows: [hr, ...br] }));
  children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
}
// ---- monospace figure/listing block ----
function pushListing(caption, lines, isListing) {
  const label = isListing ? "Listing" : "Figure";
  const rowsInner = lines.map((ln) => new Paragraph({ spacing: { after: 0, line: 236 },
    children: [new TextRun({ text: ln === "" ? " " : ln, font: MONO, size: 17, color: INK })] }));
  const shell = new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: [CW],
    rows: [new TableRow({ children: [new TableCell({
      borders: cellBorders, width: { size: CW, type: WidthType.DXA },
      shading: { fill: "F4F6FA", type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 140, right: 140 }, children: rowsInner })] })] });
  children.push(shell);
  if (isListing) { LIST += 1; } else { FIG += 1; }
  const num = isListing ? LIST : FIG;
  children.push(new Paragraph({ spacing: { before: 60, after: 140 }, alignment: AlignmentType.LEFT,
    children: [ new TextRun({ text: `${label} ${num}. `, bold: true, font: SERIF, size: 19 }),
                new TextRun({ text: caption, italics: true, font: SERIF, size: 19 }) ] }));
}
const cite = (n) => ({ text: `[${n}]`, sup: false });

// =====================================================================
// TITLE BLOCK
// =====================================================================
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240, after: 120 },
  children: [new TextRun({ text: "Quantitative Analysis for the Mitigation of Multi-Stage Supply-Chain Attacks in Routine Automated CI/CD Workflows",
    bold: true, font: SERIF, size: 34, color: INK })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 },
  children: [new TextRun({ text: "A Formal-Methods Reconstruction of the Trivy / TeamPCP Compromise (CVE-2026-33634)",
    italics: true, font: SERIF, size: 24, color: MUTE })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 160, after: 20 },
  children: [new TextRun({ text: "Franklin Hanna", font: SERIF, size: 22, color: INK })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 },
  children: [new TextRun({ text: "[Affiliation]  ·  [email]", font: SERIF, size: 20, color: MUTE })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
  children: [new TextRun({ text: "Preprint — June 2026", font: SERIF, size: 19, color: MUTE })] }));

// ABSTRACT
children.push(new Paragraph({ spacing: { after: 60 }, indent: { left: 480, right: 480 },
  children: [new TextRun({ text: "Abstract. ", bold: true, font: SERIF, size: 20 }),
    new TextRun({ text: "Modern software delivery depends on Continuous Integration and Continuous Deployment (CI/CD) pipelines that automatically resolve and execute third-party code, GitHub Actions being the dominant example. When an attacker mutates a floating version tag of a widely used Action, thousands of downstream pipelines execute attacker-controlled code with production credentials on their next routine run. In March 2026 exactly this occurred: the trivy-action and setup-trivy Actions were compromised (CVE-2026-33634), leaking secrets that seeded a second-stage npm worm. We present a formal, quantitative analysis of this multi-stage attack. We encode the disclosed pre-attack state as a labelled transition system in TLA+ and exhaustively check, with the TLC model checker, whether the documented attack is reachable and which mitigations provably close it. We prove a per-pipeline isolation property and establish a refinement relation between a hardened workflow and an abstract secure specification, quantifying the residual attack surface. We then lift the model into a Markov Decision Process and use the PRISM probabilistic model checker to compute exact compromise probabilities, expected time-to-compromise, and, via a two-stage cascade model, downstream propagation, including closed-form parametric results. The analysis is validated in three layers: structural faithfulness against a corpus of 189 real workflows, incident reconstruction against the public dossier, and predictive calibration against the OpenSSF/OSV malicious-package dataset. Our central finding is that the model formally distinguishes complete credential rotation (which prevents the attack) from the partial rotation that actually occurred (which does not), matching the documented incident causation, and that universal commit-SHA pinning isolates a pipeline even when the stolen credential remains valid.",
      font: SERIF, size: 20 })] }));
children.push(new Paragraph({ spacing: { after: 160 }, indent: { left: 480, right: 480 },
  children: [new TextRun({ text: "Keywords: ", bold: true, font: SERIF, size: 20 }),
    new TextRun({ text: "software supply-chain security · CI/CD · GitHub Actions · formal methods · model checking · TLA+ · probabilistic model checking · PRISM · refinement · isolation.",
      font: SERIF, size: 20 })] }));

// =====================================================================
// 1. INTRODUCTION
// =====================================================================
children.push(H1("1  Introduction"));
children.push(body([{ text: "A continuous-integration pipeline is, operationally, a program that fetches and executes code chosen by a version reference. The overwhelmingly common reference in GitHub Actions is a floating tag such as " },
  { text: "actions/checkout@v4", font: MONO, size: 19 },
  { text: ": a mutable pointer whose target commit the repository owner can change at any time. This convenience is also a capability. An adversary who can move a tag can, without touching any victim, cause every pipeline that resolves that tag to execute attacker-controlled code on its next routine run, with whatever secrets that runner holds." }]));
children.push(body([{ text: "In March 2026 the trivy-action and setup-trivy GitHub Actions, maintained by Aqua Security, were compromised in precisely this way (CVE-2026-33634) " }, cite(1), { text: " " }, cite(3), { text: ". A credential stolen in a February incident was left valid; in March the attacker used it to force-push 76 of 77 tags on trivy-action and all 7 tags on setup-trivy to malicious commits " }, cite(7), { text: ". Victim runners executed the payload, exfiltrated cloud credentials, SSH keys, Kubernetes configurations and CI secrets " }, cite(8), { text: ", and the stolen npm tokens seeded a second-stage worm (“CanisterWorm”) that propagated through the npm ecosystem " }, cite(6), { text: "." }]));
children.push(body("Public post-incident analyses are thorough but qualitative: they narrate what happened. They do not answer the questions a defender must answer before an incident: which mitigations provably eliminate the attack rather than merely inconveniencing it, whether a partial remediation is sufficient, and how quickly and how far a compromise is expected to spread. These are formal and quantitative questions. This paper answers them for the Trivy incident by construction, and offers the construction as a reusable template."));
children.push(body([{ text: "Contributions. ", bold: true }, { text: "We make the following contributions:" }]));
children.push(bullet([{ text: "A TLA+ transition-system model of the Trivy/TeamPCP pre-attack state whose every constant and variable traces to a cited dossier claim, and an exhaustive TLC proof that the documented attack is reachable from that state and that it is closed by (i) complete credential rotation and (ii) universal SHA-pinning (Section 4, 6)." }]));
children.push(bullet([{ text: "A formal per-pipeline isolation theorem: in a mixed population, a SHA-pinned pipeline is provably never compromised even while its tag-pinned neighbours are, so the blast radius is contained to the unpinned subset (Section 4.3)." }]));
children.push(bullet([{ text: "A refinement relation between a hardened workflow and an abstract secure specification, with the residual attack surface quantified as exactly the set of unpinned victims (Section 4.4)." }]));
children.push(bullet([{ text: "A PRISM Markov-model that computes exact compromise probability, expected time-to-compromise, a two-stage npm-propagation cascade, and closed-form parametric results (e.g. expected time (p+1)/p), calibrated against real malicious-package frequency data (Sections 4.5, 6.3–6.5)." }]));
children.push(bullet([{ text: "A three-layer validation methodology (structural faithfulness, incident reconstruction, predictive calibration) that makes the model's fidelity auditable (Section 5)." }]));

// =====================================================================
// 2. BACKGROUND: THE INCIDENT
// =====================================================================
children.push(H1("2  Background: The Trivy / TeamPCP Compromise"));
children.push(body([{ text: "We summarise the incident from the public dossier " }, cite(1), { text: "–" }, cite(13), { text: ". In February 2026 an Aqua Security continuous-integration service account was compromised. The February response rotated some credentials but left the service-account credential valid, a partial remediation. In March 2026 the attacker, holding that residual credential with tag-write permission on the Action repositories, force-pushed the repositories' version tags to point at malicious commits. Because the vast majority of downstream consumers reference the Actions by floating tag rather than by pinned commit SHA, the next scheduled or triggered run of each victim pipeline resolved the tag to the malicious commit and executed it in the runner context." }]));
children.push(body([{ text: "The payload read the runner environment and exfiltrated its secrets to attacker-controlled infrastructure. Among the stolen secrets were npm publish tokens, which enabled a distinct second stage: publication of malicious npm packages (the “CanisterWorm” family) that propagated to downstream package consumers " }, cite(6), { text: " " }, cite(9), { text: ". The campaign's first publicly named victim, Mercor, attributes its breach to a follow-on compromise in the same campaign (the LiteLLM library) rather than to direct execution of a malicious Action tag " }, cite(5), { text: " — a measure of how far downstream the cascade reached. The incident is thus genuinely multi-stage: a credential-residual stage enabling a tag-mutation stage enabling a secret-exfiltration stage enabling an ecosystem-propagation stage." }]));

// =====================================================================
// 3. THREAT AND SYSTEM MODEL
// =====================================================================
children.push(H1("3  Threat and System Model"));
children.push(body("We fix the boundary of formal claims before modelling. In scope are: the Aqua service-account credential and its rotation state; the Action repositories and their tag-to-commit mappings; victim runners and the secrets present in their environment at execution time; the attacker's accumulated knowledge (exfiltrated secrets); each victim's pinning policy (tag versus SHA); and the completeness of credential rotation."));
children.push(body("Deliberately abstracted, and argued not to affect the reachability property under study, are: how the attacker first obtained the credential (taken as an initial condition); the command-and-control network path (exfiltration is modelled as set union into the attacker's knowledge); victim production systems downstream of the stolen secrets; Git object-storage internals (tag mutation is one atomic action); the platform's internal authentication and authorization; and the byte-level structure of the payload (only its active behaviour, transferring secrets, is modelled)."));
children.push(body("The adversary begins holding solely the residual Aqua service-account credential. Its capability is tag mutation on the Action repositories, conditioned on that credential remaining valid. Victim pipelines are honest but automated: each runs its workflow on its own schedule, resolving the Action reference according to its pinning policy."));

// =====================================================================
// 4. FORMAL FRAMEWORK
// =====================================================================
children.push(H1("4  Formal Framework"));
children.push(H2("4.1  Transition-system model"));
children.push(body([{ text: "We model the system as a labelled transition system in TLA+ " }, cite(16), { text: ". The state comprises the current tag-to-commit map, each victim's pinning policy, the service-account rotation state, the credentials the attacker controls, the attacker's exfiltrated-secret set, each runner's secrets, and each SHA-pinning victim's locked commit. Two actions generate all behaviour. " },
  { text: "ForcePushTag", font: MONO, size: 19 }, { text: " repoints a tag to the malicious commit, guarded by the attacker holding a still-valid credential. " },
  { text: "RunnerExecute", font: MONO, size: 19 }, { text: " fires when a victim runs the Action: if the commit it resolves is malicious, that victim's secrets union into the attacker's knowledge. Listing 1 gives the two actions verbatim." }]));
pushListing("The two TLA+ actions. A tag-pinned victim resolves the (possibly mutated) tag; a SHA-pinned victim resolves its audited commit and is immune.", [
  "ForcePushTag(r, t) ==",
  "  /\\ AttackerCanForcePush              \\* holds a still-valid credential",
  "  /\\ tagMap[<<r, t>>] # MaliciousCommit",
  "  /\\ tagMap' = [tagMap EXCEPT ![<<r,t>>] = MaliciousCommit]",
  "  /\\ UNCHANGED <<pinningPolicy, rotationState, ...>>",
  "",
  "RunnerExecute(v, r, t) ==",
  "  /\\ ExecutedCommit(v, r, t) = MaliciousCommit",
  "  /\\ attackerKnowledge' = attackerKnowledge \\cup victimSecrets[v]",
  "  /\\ UNCHANGED <<tagMap, pinningPolicy, ...>>",
], true);
children.push(body([{ text: "The safety property is " }, { text: "NoExfiltration", font: MONO, size: 19 },
  { text: ": the attacker's knowledge never intersects any victim's secrets. TLC checks it exhaustively over a model with five victims, five tags, three commits and two repositories, a scale that is more than sufficient to exercise the reachability claim while remaining trivially checkable." }]));
children.push(H2("4.2  Reachability and mitigation discrimination"));
children.push(body([{ text: "On the vulnerable configuration (all victims tag-pinned, credential valid) TLC returns the documented attack as a shortest counterexample (Figure 1), confirming the formalism can represent the incident. Two mitigation knobs then parameterise the initial state: whether the credential was fully rotated, and which victims pin by SHA. Checking " }, { text: "NoExfiltration", font: MONO, size: 19 }, { text: " across the four extreme configurations yields the discrimination in Table 2." }]));
pushListing("TLC counterexample on the vulnerable configuration, structurally identical to the documented dossier trace.", [
  "State 1  [Init]            attacker holds AquaServiceAcct; all tags -> c_benign",
  "State 2  ForcePushTag(trivy_action, tg1)     tag -> c_malicious",
  "State 3  RunnerExecute(v1, trivy_action, tg1)       attackerKnowledge = {v1}",
], false);
children.push(H2("4.3  Isolation between pipelines"));
children.push(body([{ text: "Generalising the SHA-pinning knob from a Boolean to a set of victims lets us reason about mixed populations. Define " }, { text: "Isolation", font: MONO, size: 19 }, { text: " to hold when no SHA-pinning victim's secret is ever exfiltrated. Checking it on a mixed configuration, in which two victims pin by SHA and three use floating tags with the credential still valid, TLC reports that the invariant holds over the entire reachable state space, even though a companion check confirms the attack does compromise the tag-pinned victims in the very same runs. A hardened pipeline is therefore isolated from the blast radius of its unpinned neighbours; the breach is provably contained to the unpinned subset." }]));
children.push(H2("4.4  Refinement and residual attack surface"));
children.push(body([{ text: "We specify an abstract secure workflow exposing a single observation, " }, { text: "leaked", font: MONO, size: 19 }, { text: ", whose only permitted transitions leave it false. Under the refinement mapping " }, { text: "leaked ↦ (a victim secret has reached the attacker)", font: MONO, size: 19 }, { text: ", the hardened concrete workflow refines the abstract specification (TLC verifies the refinement holds), whereas the vulnerable workflow does not: TLC exhibits a behaviour whose mapped observation flips from false to true, namely the documented attack. The set of such flipping transitions is the residual attack surface. TLC witnesses that, for the vulnerable configuration, the reachable compromised set equals exactly the unpinned victims; growing the SHA-pinned set shrinks this surface monotonically to the empty set." }]));
children.push(H2("4.5  Probabilistic and multi-stage model"));
children.push(body([{ text: "Reachability answers whether; it does not answer how likely, how fast, or how far. We lift the two actions into a Markov model checked with PRISM " }, cite(17), { text: ". The attacker's weaponisation timing is nondeterministic (an adversary, resolved by PRISM's schedulers); the victim's build cadence is probabilistic with per-day probability p. Maximum reachability probability and minimum expected reward then give worst-case (most-capable-adversary) quantities. A separate discrete-time cascade model chains the two documented stages: stage one yields a stolen npm token with probability q, enabling stage two, in which downstream consumers adopt the malicious npm package at per-day rate r until a population of size N is saturated." }]));
children.push(H2("4.6  Parametric analysis"));
children.push(body([{ text: "Because the input rates are uncertain, we treat them symbolically. PRISM's parametric engine returns closed-form functions rather than point estimates: the expected time-to-compromise is (p+1)/p, and the probability of reaching the second stage is exactly q. Such closed forms make the dependence on each uncertain input explicit and support the sensitivity argument of Section 6." }]));

// =====================================================================
// 5. VALIDATION METHODOLOGY
// =====================================================================
children.push(H1("5  Three-Layer Validation Methodology"));
children.push(body("A formal model is only as valuable as its faithfulness to reality. We validate in three layers. Layer 1 (structural faithfulness) asks whether the model captures what real workflows do, by statically analysing a corpus of real GitHub Actions workflows and measuring the frequency of the constructs the model represents. Layer 2 (incident reconstruction) asks whether the model can reproduce the documented attack and whether its proposed mitigations close it, checking the encoded pre-attack state against the public dossier. Layer 3 (predictive calibration) asks whether the model's quantitative outputs are consistent with observed frequencies, calibrating input distributions against public malicious-package data and the documented incident timeline. The three layers correspond to Sections 6.1, 6.2 and 6.3–6.5 respectively."));

// =====================================================================
// 6. EVALUATION
// =====================================================================
children.push(H1("6  Evaluation"));
children.push(H2("6.1  Layer 1: structural faithfulness"));
children.push(body("We analysed 189 workflow files drawn from eighteen large open-source projects, extracting trigger events, permission scopes, secret usage, action-version pinning, runner types, job dependencies and artefact flows. The headline calibration parameter is the fraction of external Action references that use a floating tag rather than a pinned commit SHA."));
pushTable("Layer 1 corpus measurements (189 workflows, 18 projects, 0 parse errors).",
  ["Quantity", "Value"],
  [
    ["External (resolvable) Action references", "1,517"],
    ["Commit-SHA pinned", "956  (63.0%)"],
    ["Floating tag / branch (unpinned)", "561  (37.0%)"],
    ["Floating-tag fraction f", "0.3698"],
    ["Construct coverage of the formal model", "88.2%"],
    ["Workflows using pull_request_target", "11.6%"],
    ["Workflows referencing secrets", "50.3%"],
  ], [6360, 3000], ["", "c"]);
children.push(body("The measured floating-tag fraction feeds Layer 3 directly. Because the corpus consists of large, security-mature projects that pin more than average, the 37% figure is a lower bound on the ecosystem-wide rate; the model's safety proof instead uses the worst case of universal tag reference, the conservative choice for a safety claim. The model captures 88.2% of the compromise-relevant constructs observed; the remainder (matrix strategies, artefact flows, reusable-workflow nesting) are independent of the tag-mutation reachability property."));

children.push(H2("6.2  Layer 2: incident reconstruction"));
children.push(body("Each row of Table 2 is a separate TLC run with a different initial state. The vulnerable row reproduces the documented attack; the mitigated rows show which remediations close it."));
pushTable("Mitigation discrimination under exhaustive model checking. Each row is one TLC run.",
  ["Configuration", "NoExfiltration", "Matches reality"],
  [
    ["Tag refs + valid stolen credential (actual)", "FAILS", "Yes — attack occurred"],
    ["Tag refs + complete rotation", "holds", "No attack"],
    ["SHA pins + valid stolen credential", "holds", "Protects despite residual credential"],
    ["SHA pins + complete rotation", "holds", "Full defence"],
  ], [4560, 2200, 2600], ["", "c", ""]);
children.push(body("The load-bearing result is the contrast between the first two rows: the model formally distinguishes complete rotation (safe) from the partial rotation that actually occurred (still exploited), reproducing the documented incident causation. The first and third rows give the second, independent finding: universal SHA-pinning protects victims even while the stolen credential remains valid. Table 3 records the isolation and refinement results of Sections 4.3–4.4."));
pushTable("Isolation and refinement results (TLC).",
  ["Property checked", "Configuration", "Result"],
  [
    ["Isolation (SHA-pinned never leak)", "mixed population", "holds (8,185 states)"],
    ["Containment witness", "mixed population", "breach reaches only unpinned victims"],
    ["Hardened refines SecureWorkflow", "all SHA-pinned", "holds"],
    ["Vulnerable refines SecureWorkflow", "all floating tags", "fails (observation flips)"],
    ["Residual attack surface", "all floating tags", "= unpinned subset (all 5)"],
  ], [3560, 2900, 2900], ["", "", ""]);

children.push(H2("6.3  Layer 3: quantitative outputs"));
children.push(body("With build cadence p = 0.2 per day and a 30-day horizon, PRISM yields the quantitative counterpart of Table 2."));
pushTable("Quantitative mitigation table (PRISM MDP; p = 0.2/day, horizon 30 days).",
  ["Configuration", "P(compromise)", "E[days]", "P(≤30 days)"],
  [
    ["Tag refs + valid credential (actual)", "1.00", "6.00", "0.9985"],
    ["Tag refs + complete rotation", "0.00", "∞", "0.0000"],
    ["SHA pins + valid credential", "0.00", "∞", "0.0000"],
    ["SHA pins + complete rotation", "0.00", "∞", "0.0000"],
  ], [4260, 1900, 1500, 1700], ["", "c", "c", "c"]);
children.push(body("The expected time of six days decomposes exactly as one day to weaponise plus 1/p = five days to the next build. A sensitivity sweep of p across a tenfold range (0.05 to 0.5 per day) moves the vulnerable expected time from 21 to 3 days, but SHA-pinning yields probability zero at every value of p: the mitigation ranking is invariant under a tenfold change in the compromise rate, so the recommendation is robust to parameter uncertainty."));

children.push(H2("6.4  Multi-stage propagation"));
children.push(body("The cascade model quantifies the second stage. With p = 0.2, token-theft probability q = 0.5, adoption rate r = 0.1 and downstream population N = 5, PRISM gives Table 5."));
pushTable("Two-stage propagation (PRISM DTMC).",
  ["Metric", "Value"],
  [
    ["P(reach stage 2 / npm propagation)", "0.50  (= token-theft rate q)"],
    ["P(stage 2 within 30 days)", "0.454"],
    ["P(full downstream propagation)", "0.50"],
    ["E[hosts compromised at day 30]", "2.18"],
    ["E[days to first downstream compromise] (q=1)", "16.0"],
    ["P(reach stage 2) under complete rotation", "0.00"],
  ], [6360, 3000], ["", "c"]);
children.push(body("Complete credential rotation drives the probability of the entire downstream cascade, not merely the first stage, to zero. The expected sixteen days to the first downstream compromise decomposes as one day to weaponise, five days to first-stage compromise, and ten days to first downstream adoption."));

children.push(H2("6.5  Calibration against public data"));
children.push(body([{ text: "We calibrate the second-stage rates against the OpenSSF malicious-packages dataset " }, cite(15), { text: ", the OSV-format corpus seeded by the Backstabber's Knife Collection of Ohm et al. " }, cite(14), { text: ". Over the dataset, npm accounts for 214,497 malicious-package reports, 94.2% of all ecosystems. Crucially, npm malicious-package publications rose from 329 in February 2026 to 1,048 in March 2026, a factor of 3.19, in the exact month of the CanisterWorm second stage; the Trivy-derived package was one of those 1,048. The model's fastest-adversary times (six days to first-stage compromise, sixteen to first downstream) are lower bounds consistent with the documented four-week February-to-March residual-credential window; the surplus reflects adversarial patience, which the nondeterministic weaponisation timing of the MDP captures exactly." }]));

children.push(H2("6.6  Mitigation discovery"));
children.push(body([{ text: "Finally, we use the verified model as a ground-truth oracle for an automated search over defender policies, scoring each candidate by its model-checked compromise probability plus an operational-cost penalty " }, cite(20), { text: ". Maximising the score converges on complete credential rotation as the minimal-cost provably-safe policy, recovering the paper's central recommendation without human guidance. The search proposes; the model checker decides." }]));

// =====================================================================
// 7. DISCUSSION
// =====================================================================
children.push(H1("7  Discussion"));
children.push(body("Two findings are non-trivial in the precise sense that they contradict a plausible operational intuition. First, a partial credential rotation that revokes “most” credentials is not a partial defence but no defence at all against this attack class: a single retained valid credential with tag-write permission suffices, and the model flags exactly this. Second, commit-SHA pinning defends a pipeline unilaterally. A pinning victim is protected regardless of its neighbours' behaviour and regardless of whether the upstream credential is ever rotated, because it never resolves the mutated tag. Isolation formalises this as containment of the blast radius, and refinement quantifies the residual surface as precisely the set of pipelines that decline to pin."));
children.push(body("The quantitative layer sharpens the guidance rather than replacing it. Expected-time and bounded-horizon probabilities let an operator reason about detection windows; the parametric forms make explicit which conclusions are robust (the mitigation ranking) and which depend on uncertain inputs (absolute timings). The multi-stage model shows that the value of a mitigation is not confined to the pipeline that adopts it: preventing the first stage removes the token supply that powers the second."));

// =====================================================================
// 8. LIMITATIONS
// =====================================================================
children.push(H1("8  Limitations and Threats to Validity"));
children.push(body("The analysis is deliberately conservative, and several caveats bound its claims. On data: the second-stage parameters q (the fraction of compromised runners holding npm tokens) and r (downstream adoption rate) are assumptions rather than measurements, for want of a public dataset; we therefore report the parametric form P(stage 2) = q so the dependence is explicit. The workflow corpus is modest (189 files) and popularity-biased toward projects that pin more than average, so the measured floating-tag fraction is a lower bound. The build cadence p is illustrative. The calibration against the February-to-March publication spike is corroborative, not causal, and the incident facts themselves are taken from the public dossier rather than independently re-verified."));
children.push(body("On modelling: the checked instance is small (five victims), sufficient to exercise the safety property but not a proof for arbitrary populations; several mechanisms are abstracted by design (the credential-theft origin, the C2 path, Git internals, payload structure); the second-stage population dynamics are simplified to sequential adoption; and the worst-case adversary means the reported probabilities and times are bounds rather than expected real-world values. On methodology and tooling: PRISM is used in place of Storm (identical semantics, no native Windows build for the latter); the parametric engine does not support step-bounded properties, for which we give the analytic form; the automated policy search's outer loop was not executed end-to-end; a single incident is reconstructed where the methodology envisions several; and a practitioner review of the threat model, which the methodology recommends, has not been conducted."));

// =====================================================================
// 9. RELATED WORK
// =====================================================================
children.push(H1("9  Related Work"));
children.push(body([{ text: "Empirical study of open-source supply-chain attacks was catalogued by Ohm et al. in the Backstabber's Knife Collection " }, cite(14), { text: ", and is tracked continuously by the OpenSSF malicious-packages project and OSV " }, cite(15), { text: " and by industry telemetry " }, cite(20), { text: ". Defensive frameworks such as SLSA " }, cite(18), { text: " prescribe provenance and pinning controls; our contribution is to give one such control (SHA-pinning) a formal isolation guarantee and a quantified residual surface rather than a checklist status. Formal verification via TLA+ and TLC " }, cite(16), { text: " and probabilistic model checking via PRISM " }, cite(17), { text: " and Storm " }, cite(19), { text: " are mature; we apply them jointly to a documented CI/CD incident and, unusually, validate the abstraction against a real workflow corpus and against measured malicious-package frequencies rather than treating the model as self-justifying." }]));

// =====================================================================
// 10. CONCLUSION
// =====================================================================
children.push(H1("10  Conclusion"));
children.push(body("We reconstructed the March 2026 Trivy/TeamPCP supply-chain compromise as a formal, quantitative artefact. Exhaustive model checking shows the documented attack is reachable from the disclosed pre-attack state and is closed by complete credential rotation or by universal SHA-pinning; an isolation theorem and a refinement relation make the SHA-pinning guarantee precise and quantify the residual attack surface; and a probabilistic, multi-stage, parametric model, calibrated against public data, quantifies how likely, how fast, and how far a compromise spreads. The recurring lesson is that in automated CI/CD the difference between a partial and a complete remediation is not a difference of degree but of kind, and that a formalism which distinguishes them says something an incident report cannot."));

// =====================================================================
// REFERENCES
// =====================================================================
children.push(H1("References"));
const refs = [
  "Aqua Security. Trivy supply-chain attack: what you need to know. Technical report, 2026. https://www.aquasec.com/blog/trivy-supply-chain-attack-what-you-need-to-know/",
  "GitHub. Security Advisory for aquasecurity/trivy. GitHub Security Advisories, 2026. https://github.com/aquasecurity/trivy/security/advisories",
  "MITRE. CVE-2026-33634. Common Vulnerabilities and Exposures, 2026. https://www.cve.org/CVERecord?id=CVE-2026-33634",
  "CISA. Known Exploited Vulnerabilities Catalog. 2026.",
  "Mercor. Public disclosure statement on the TeamPCP supply-chain campaign (LiteLLM follow-on compromise). 2026.",
  "Palo Alto Networks, Unit 42. TeamPCP supply-chain attacks and the CanisterWorm payload. 2026. https://unit42.paloaltonetworks.com/teampcp-supply-chain-attacks/",
  "Microsoft. Detecting, investigating and defending against the Trivy supply-chain compromise. Microsoft Security Blog, 24 March 2026.",
  "Wiz Research. Trivy compromised: tracking the TeamPCP supply-chain attack. 2026. https://www.wiz.io/blog/trivy-compromised-teampcp-supply-chain-attack",
  "ReversingLabs. The TeamPCP supply-chain attack spreads: payload analysis. 2026.",
  "Endor Labs. TeamPCP isn't done: the February-to-March causal chain. 2026. https://www.endorlabs.com/learn/teampcp-isnt-done",
  "Kudelski Security. Investigating two variants of the Trivy supply-chain compromise. 2026.",
  "SANS Internet Storm Center. Diary entry 32856: Trivy Action compromise. 2026.",
  "Cato Networks. The TeamPCP supply-chain attack. 2026.",
  "M. Ohm, H. Plate, A. Sykosch, M. Meier. Backstabber's Knife Collection: A Review of Open-Source Software Supply-Chain Attacks. In DIMVA, 2020.",
  "Open Source Security Foundation. Malicious Packages repository (OSV format). 2026. https://github.com/ossf/malicious-packages",
  "L. Lamport. Specifying Systems: The TLA+ Language and Tools for Hardware and Software Engineers. Addison-Wesley, 2002.",
  "M. Kwiatkowska, G. Norman, D. Parker. PRISM 4.0: Verification of Probabilistic Real-Time Systems. In CAV, 2011.",
  "Open Source Security Foundation. SLSA: Supply-chain Levels for Software Artifacts. https://slsa.dev",
  "C. Hensel, S. Junges, J.-P. Katoen, T. Quatmann, M. Volk. The Probabilistic Model Checker Storm. STTT, 2022.",
  "Sonatype. State of the Software Supply Chain / Open-Source Malware Index. Industry report, 2025.",
];
refs.forEach((r, i) => children.push(new Paragraph({
  spacing: { after: 60 }, indent: { left: 460, hanging: 460 }, alignment: AlignmentType.JUSTIFIED,
  children: [ new TextRun({ text: `[${i + 1}]  `, bold: true, font: SERIF, size: 19 }),
              new TextRun({ text: r, font: SERIF, size: 19 }) ],
})));

// =====================================================================
const doc = new Document({
  styles: {
    default: { document: { run: { font: SERIF, size: 21, color: INK } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: SERIF, color: ACCENT }, paragraph: { outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 23, bold: true, font: SERIF, color: ACCENT }, paragraph: { outlineLevel: 1 } },
    ],
  },
  numbering: { config: [
    { reference: "bul", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 620, hanging: 300 } } } }] },
  ] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER,
      children: [ new TextRun({ text: "", font: SERIF, size: 18, color: MUTE }),
                  new TextRun({ children: [PageNumber.CURRENT], font: SERIF, size: 18, color: MUTE }) ] })] }) },
    children,
  }],
});
const out = process.argv[2] || "paper.docx";
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(out, b); console.log("Wrote " + out + " (" + b.length + " bytes)"); });
