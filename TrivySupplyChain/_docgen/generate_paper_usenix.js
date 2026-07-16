// USENIX Security-style two-column paper generator for the Trivy/TeamPCP analysis.
// Full-width title+abstract banner; two-column body; full-width tables/figures.
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle, SectionType,
  WidthType, ShadingType, PageNumber,
} = require("docx");

const PAGE = { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1080, bottom: 1440, left: 1080 } };
const CW = 12240 - 1080 - 1080;   // full content width = 10080 DXA (0.75" side margins, USENIX-ish)
const COLSPACE = 400;
const COLW = (CW - COLSPACE) / 2;  // one column width
const SERIF = "Times New Roman", MONO = "Consolas";
const INK = "000000", MUTE = "444444";
const cb = { style: BorderStyle.SINGLE, size: 1, color: "999999" };
const cbs = { top: cb, bottom: cb, left: cb, right: cb };

// ---- section state machine (interleave 1-col and 2-col on one page) ----
const sections = [];
let cur = null, TAB = 0, FIG = 0, LIST = 0;
function newSection(cols) { cur = { cols, children: [] }; sections.push(cur); }
function add(...els) { cur.children.push(...els); }
function want(cols) { if (!cur || cur.cols !== cols) newSection(cols); }

function runs(t) {
  const arr = typeof t === "string" ? [{ text: t }] : t;
  return arr.map((r) => new TextRun({ text: r.text, bold: r.bold, italics: r.italics, superScript: r.sup,
    font: r.font || SERIF, size: r.size || 20, color: r.color || INK }));
}
function body(t, opts = {}) { want(2); add(new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 100, line: 240 }, children: runs(t), ...opts })); }
function H1(t) { want(2); add(new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 200, after: 80 }, children: [new TextRun({ text: t, bold: true, font: SERIF, size: 23, color: INK })] })); }
function H2(t) { want(2); add(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 150, after: 60 }, children: [new TextRun({ text: t, bold: true, italics: true, font: SERIF, size: 21, color: INK })] })); }
function bullet(t) { want(2); add(new Paragraph({ numbering: { reference: "bul", level: 0 }, alignment: AlignmentType.JUSTIFIED, spacing: { after: 50, line: 236 }, children: runs(t) })); }
const cite = (n) => ({ text: `[${n}]` });

// full-width table (in its own 1-col band)
function tcell(txt, { w, head, alignC } = {}) {
  return new TableCell({ borders: cbs, width: { size: w, type: WidthType.DXA },
    shading: head ? { fill: "222222", type: ShadingType.CLEAR } : undefined,
    margins: { top: 40, bottom: 40, left: 90, right: 90 },
    children: (Array.isArray(txt) ? txt : [txt]).map((l) => new Paragraph({ alignment: alignC ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text: String(l), bold: !!head, font: SERIF, size: 18, color: head ? "FFFFFF" : INK })] })) });
}
function pushTable(caption, headers, rows, widths, aligns = []) {
  want(1); TAB += 1;
  add(new Paragraph({ spacing: { before: 120, after: 50 },
    children: [new TextRun({ text: `Table ${TAB}: `, bold: true, font: SERIF, size: 18 }), new TextRun({ text: caption, italics: true, font: SERIF, size: 18 })] }));
  const hr = new TableRow({ tableHeader: true, children: headers.map((h, i) => tcell(h, { w: widths[i], head: true, alignC: aligns[i] === "c" })) });
  const br = rows.map((r) => new TableRow({ children: r.map((c, i) => tcell(c, { w: widths[i], alignC: aligns[i] === "c" })) }));
  add(new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: widths, rows: [hr, ...br] }));
  add(new Paragraph({ spacing: { after: 100 }, children: [] }));
}
function pushMono(caption, lines, isListing) {
  want(1);
  const inner = lines.map((ln) => new Paragraph({ spacing: { after: 0, line: 232 }, children: [new TextRun({ text: ln === "" ? " " : ln, font: MONO, size: 16 })] }));
  add(new Table({ width: { size: CW, type: WidthType.DXA }, columnWidths: [CW],
    rows: [new TableRow({ children: [new TableCell({ borders: cbs, width: { size: CW, type: WidthType.DXA },
      shading: { fill: "F2F4F8", type: ShadingType.CLEAR }, margins: { top: 70, bottom: 70, left: 130, right: 130 }, children: inner })] })] }));
  if (isListing) LIST += 1; else FIG += 1;
  add(new Paragraph({ spacing: { before: 50, after: 100 },
    children: [new TextRun({ text: `${isListing ? "Listing" : "Figure"} ${isListing ? LIST : FIG}: `, bold: true, font: SERIF, size: 18 }), new TextRun({ text: caption, italics: true, font: SERIF, size: 18 })] }));
}

// =====================================================================
// TITLE / ABSTRACT BAND (full width)
// =====================================================================
newSection(1);
add(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120, after: 90 },
  children: [new TextRun({ text: "Quantitative Analysis for the Mitigation of Multi-Stage Supply-Chain Attacks in Routine Automated CI/CD Workflows", bold: true, font: SERIF, size: 32 })] }));
add(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
  children: [new TextRun({ text: "A Formal-Methods Reconstruction of the Trivy / TeamPCP Compromise (CVE-2026-33634)", italics: true, font: SERIF, size: 23, color: MUTE })] }));
add(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 10 }, children: [new TextRun({ text: "Franklin Hanna", font: SERIF, size: 22 })] }));
add(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: "Independent Scholar      franklinhanna9@gmail.com", font: SERIF, size: 20, color: MUTE })] }));
// Abstract full width (single indented block, USENIX places it before the columns)
add(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [new TextRun({ text: "Abstract", bold: true, font: SERIF, size: 21 })] }));
add(new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 80, line: 240 }, indent: { left: 720, right: 720 },
  children: [new TextRun({ font: SERIF, size: 20, text: "Modern software delivery depends on Continuous Integration and Continuous Deployment (CI/CD) pipelines that automatically resolve and execute third-party code, GitHub Actions being the dominant example. When an attacker mutates a floating version tag of a widely used Action, thousands of downstream pipelines execute attacker-controlled code with production credentials on their next routine run. In March 2026 exactly this occurred: the trivy-action and setup-trivy Actions were compromised (CVE-2026-33634), leaking secrets that seeded a second-stage npm worm. We present a formal, quantitative analysis of this multi-stage attack. We encode the disclosed pre-attack state as a labelled transition system in TLA+ and exhaustively check, with the TLC model checker, whether the documented attack is reachable and which mitigations provably close it. We prove a per-pipeline isolation property and establish a refinement relation between a hardened workflow and an abstract secure specification, quantifying the residual attack surface. We then lift the model into a Markov Decision Process and use the PRISM probabilistic model checker to compute exact compromise probabilities, expected time-to-compromise, and, via a two-stage cascade model, downstream propagation, including closed-form parametric results. The analysis is validated in three layers: structural faithfulness against a corpus of 189 real workflows, incident reconstruction against the public dossier, and predictive calibration against the OpenSSF/OSV malicious-package dataset. Our central finding is that the model formally distinguishes complete credential rotation, which prevents the attack, from the partial rotation that actually occurred, which does not, matching the documented incident causation, and that universal commit-SHA pinning isolates a pipeline even when the stolen credential remains valid." })] }));
add(new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 60, line: 240 }, indent: { left: 720, right: 720 },
  children: [new TextRun({ text: "Keywords: ", bold: true, font: SERIF, size: 20 }), new TextRun({ text: "software supply-chain security; CI/CD; GitHub Actions; formal methods; model checking; TLA+; probabilistic model checking; PRISM; refinement; isolation.", font: SERIF, size: 20 })] }));

// =====================================================================
// BODY (two columns from here)
// =====================================================================
H1("1  Introduction");
body([{ text: "A continuous-integration pipeline is, operationally, a program that fetches and executes code chosen by a version reference. The overwhelmingly common reference in GitHub Actions is a floating tag such as " }, { text: "actions/checkout@v4", font: MONO, size: 18 }, { text: ": a mutable pointer whose target commit the repository owner can change at any time. This convenience is also a capability. An adversary who can move a tag can, without touching any victim, cause every pipeline that resolves that tag to execute attacker-controlled code on its next routine run, with whatever secrets that runner holds." }]);
body([{ text: "In March 2026 the trivy-action and setup-trivy GitHub Actions, maintained by Aqua Security, were compromised in precisely this way (CVE-2026-33634) " }, cite(1), { text: ", " }, cite(3), { text: ". A credential stolen in a February incident was left valid; in March the attacker used it to force-push 76 of 77 tags on trivy-action and all 7 tags on setup-trivy to malicious commits " }, cite(7), { text: ". Victim runners executed the payload, exfiltrated cloud credentials, SSH keys, Kubernetes configurations and CI secrets " }, cite(8), { text: ", and the stolen npm tokens seeded a second-stage worm (CanisterWorm) that propagated through the npm ecosystem " }, cite(6), { text: "." }]);
body("Public post-incident analyses are thorough but qualitative: they narrate what happened. They do not answer the questions a defender must answer before an incident: which mitigations provably eliminate the attack rather than merely inconveniencing it, whether a partial remediation is sufficient, and how quickly and how far a compromise is expected to spread. These are formal and quantitative questions. This paper answers them for the Trivy incident by construction, and offers the construction as a reusable template.");
body([{ text: "Contributions.", bold: true }, { text: "  We make the following contributions:" }]);
bullet("A TLA+ transition-system model of the Trivy/TeamPCP pre-attack state whose every constant and variable traces to a cited dossier claim, and an exhaustive TLC proof that the documented attack is reachable from that state and is closed by (i) complete credential rotation and (ii) universal SHA-pinning.");
bullet("A formal per-pipeline isolation theorem: in a mixed population, a SHA-pinned pipeline is provably never compromised even while its tag-pinned neighbours are, so the blast radius is contained to the unpinned subset.");
bullet("A refinement relation between a hardened workflow and an abstract secure specification, with the residual attack surface quantified as exactly the set of unpinned victims.");
bullet("A PRISM Markov model computing exact compromise probability, expected time-to-compromise, a two-stage npm-propagation cascade, and closed-form parametric results, calibrated against real malicious-package frequency data.");
bullet("A three-layer validation methodology (structural faithfulness, incident reconstruction, predictive calibration) that makes the model's fidelity auditable.");

H1("2  Background: The Trivy / TeamPCP Compromise");
body([{ text: "We summarise the incident from the public dossier " }, cite(1), { text: "-" }, cite(13), { text: ". In February 2026 an Aqua Security continuous-integration service account was compromised. The February response rotated some credentials but left the service-account credential valid, a partial remediation. In March 2026 the attacker, holding that residual credential with tag-write permission on the Action repositories, force-pushed the repositories' version tags to point at malicious commits. Because the vast majority of downstream consumers reference the Actions by floating tag rather than by pinned commit SHA, the next scheduled or triggered run of each victim pipeline resolved the tag to the malicious commit and executed it in the runner context." }]);
body([{ text: "The payload read the runner environment and exfiltrated its secrets to attacker-controlled infrastructure. Among the stolen secrets were npm publish tokens, which enabled a distinct second stage: publication of malicious npm packages (the CanisterWorm family) that propagated to downstream package consumers " }, cite(6), { text: ", " }, cite(9), { text: ". The campaign's first publicly named victim, Mercor, attributes its breach to a follow-on compromise in the same campaign (the LiteLLM library) rather than to direct execution of a malicious Action tag " }, cite(5), { text: " — a measure of how far downstream the cascade reached. The incident is thus genuinely multi-stage: a credential-residual stage enabling a tag-mutation stage enabling a secret-exfiltration stage enabling an ecosystem-propagation stage." }]);

H1("3  Threat and System Model");
body("We fix the boundary of formal claims before modelling. In scope are: the Aqua service-account credential and its rotation state; the Action repositories and their tag-to-commit mappings; victim runners and the secrets present in their environment at execution time; the attacker's accumulated knowledge (exfiltrated secrets); each victim's pinning policy (tag versus SHA); and the completeness of credential rotation.");
body("Deliberately abstracted, and argued not to affect the reachability property under study, are: how the attacker first obtained the credential (taken as an initial condition); the command-and-control network path (exfiltration is modelled as set union into the attacker's knowledge); victim production systems downstream of the stolen secrets; Git object-storage internals (tag mutation is one atomic action); the platform's internal authentication and authorization; and the byte-level structure of the payload (only its active behaviour, transferring secrets, is modelled).");
body("The adversary begins holding solely the residual Aqua service-account credential. Its capability is tag mutation on the Action repositories, conditioned on that credential remaining valid. Victim pipelines are honest but automated: each runs its workflow on its own schedule, resolving the Action reference according to its pinning policy.");

H1("4  Formal Framework");
H2("4.1  Transition-system model");
body([{ text: "We model the system as a labelled transition system in TLA+ " }, cite(16), { text: ". The state comprises the current tag-to-commit map, each victim's pinning policy, the service-account rotation state, the credentials the attacker controls, the attacker's exfiltrated-secret set, each runner's secrets, and each SHA-pinning victim's locked commit. Two actions generate all behaviour. " }, { text: "ForcePushTag", font: MONO, size: 18 }, { text: " repoints a tag to the malicious commit, guarded by the attacker holding a still-valid credential. " }, { text: "RunnerExecute", font: MONO, size: 18 }, { text: " fires when a victim runs the Action: if the commit it resolves is malicious, that victim's secrets union into the attacker's knowledge. Listing 1 gives the two actions." }]);
pushMono("The two TLA+ actions. A tag-pinned victim resolves the (possibly mutated) tag; a SHA-pinned victim resolves its audited commit and is immune.", [
  "ForcePushTag(r, t) ==",
  "  /\\ AttackerCanForcePush            \\* still-valid credential",
  "  /\\ tagMap[<<r, t>>] # MaliciousCommit",
  "  /\\ tagMap' = [tagMap EXCEPT ![<<r,t>>] = MaliciousCommit]",
  "  /\\ UNCHANGED <<pinningPolicy, rotationState, ...>>",
  "",
  "RunnerExecute(v, r, t) ==",
  "  /\\ ExecutedCommit(v, r, t) = MaliciousCommit",
  "  /\\ attackerKnowledge' = attackerKnowledge \\cup victimSecrets[v]",
  "  /\\ UNCHANGED <<tagMap, pinningPolicy, ...>>",
], true);
body([{ text: "The safety property is " }, { text: "NoExfiltration", font: MONO, size: 18 }, { text: ": the attacker's knowledge never intersects any victim's secrets. TLC checks it exhaustively over a model with five victims, five tags, three commits and two repositories, a scale more than sufficient to exercise the reachability claim while remaining trivially checkable." }]);
H2("4.2  Reachability and mitigation discrimination");
body([{ text: "On the vulnerable configuration TLC returns the documented attack as a shortest counterexample (Figure 1), confirming the formalism can represent the incident. Two mitigation knobs then parameterise the initial state: whether the credential was fully rotated, and which victims pin by SHA. Checking " }, { text: "NoExfiltration", font: MONO, size: 18 }, { text: " across the four extreme configurations yields the discrimination in Table 2." }]);
pushMono("TLC counterexample on the vulnerable configuration, structurally identical to the documented dossier trace.", [
  "State 1  [Init]        attacker holds AquaServiceAcct; all tags -> c_benign",
  "State 2  ForcePushTag(trivy_action, tg1)          tag -> c_malicious",
  "State 3  RunnerExecute(v1, trivy_action, tg1)     attackerKnowledge = {v1}",
], false);
H2("4.3  Isolation between pipelines");
body([{ text: "Generalising the SHA-pinning knob from a Boolean to a set of victims lets us reason about mixed populations. Define " }, { text: "Isolation", font: MONO, size: 18 }, { text: " to hold when no SHA-pinning victim's secret is ever exfiltrated. Checking it on a mixed configuration, in which two victims pin by SHA and three use floating tags with the credential still valid, TLC reports that the invariant holds over the entire reachable state space, even though a companion check confirms the attack does compromise the tag-pinned victims in the very same runs. A hardened pipeline is therefore isolated from the blast radius of its unpinned neighbours; the breach is provably contained to the unpinned subset." }]);
H2("4.4  Refinement and residual attack surface");
body([{ text: "We specify an abstract secure workflow exposing a single observation, " }, { text: "leaked", font: MONO, size: 18 }, { text: ", whose only permitted transitions leave it false. Under the refinement mapping from " }, { text: "leaked", font: MONO, size: 18 }, { text: " to the predicate that a victim secret has reached the attacker, the hardened concrete workflow refines the abstract specification (TLC verifies the refinement holds), whereas the vulnerable workflow does not: TLC exhibits a behaviour whose mapped observation flips from false to true, namely the documented attack. The set of such flipping transitions is the residual attack surface. TLC witnesses that, for the vulnerable configuration, the reachable compromised set equals exactly the unpinned victims; growing the SHA-pinned set shrinks this surface monotonically to the empty set." }]);
H2("4.5  Probabilistic and multi-stage model");
body([{ text: "Reachability answers whether; it does not answer how likely, how fast, or how far. We lift the two actions into a Markov model checked with PRISM " }, cite(17), { text: ". The attacker's weaponisation timing is nondeterministic (an adversary, resolved by PRISM's schedulers); the victim's build cadence is probabilistic with per-day probability p. Maximum reachability probability and minimum expected reward then give worst-case (most-capable-adversary) quantities. A separate discrete-time cascade model chains the two documented stages: stage one yields a stolen npm token with probability q, enabling stage two, in which downstream consumers adopt the malicious npm package at per-day rate r until a population of size N is saturated." }]);
H2("4.6  Parametric analysis");
body("Because the input rates are uncertain, we treat them symbolically. PRISM's parametric engine returns closed-form functions rather than point estimates: the expected time-to-compromise is (p+1)/p, and the probability of reaching the second stage is exactly q. Such closed forms make the dependence on each uncertain input explicit and support the sensitivity argument of Section 6.");

H1("5  Three-Layer Validation Methodology");
body("A formal model is only as valuable as its faithfulness to reality. We validate in three layers. Layer 1 (structural faithfulness) asks whether the model captures what real workflows do, by statically analysing a corpus of real GitHub Actions workflows and measuring the frequency of the constructs the model represents. Layer 2 (incident reconstruction) asks whether the model can reproduce the documented attack and whether its proposed mitigations close it, checking the encoded pre-attack state against the public dossier. Layer 3 (predictive calibration) asks whether the model's quantitative outputs are consistent with observed frequencies, calibrating input distributions against public malicious-package data and the documented incident timeline.");

H1("6  Evaluation");
H2("6.1  Layer 1: structural faithfulness");
body("We analysed 189 workflow files drawn from eighteen large open-source projects, extracting trigger events, permission scopes, secret usage, action-version pinning, runner types, job dependencies and artefact flows. The headline calibration parameter is the fraction of external Action references that use a floating tag rather than a pinned commit SHA (Table 1).");
pushTable("Layer 1 corpus measurements (189 workflows, 18 projects, 0 parse errors).",
  ["Quantity", "Value"],
  [["External (resolvable) Action references", "1,517"], ["Commit-SHA pinned", "956 (63.0%)"], ["Floating tag / branch (unpinned)", "561 (37.0%)"],
   ["Floating-tag fraction f", "0.3698"], ["Construct coverage of the model", "88.2%"], ["Workflows using pull_request_target", "11.6%"], ["Workflows referencing secrets", "50.3%"]],
  [7080, 3000], ["", "c"]);
body("The measured floating-tag fraction feeds Layer 3 directly. Because the corpus consists of large, security-mature projects that pin more than average, the 37% figure is a lower bound on the ecosystem-wide rate; the model's safety proof instead uses the worst case of universal tag reference, the conservative choice for a safety claim. The model captures 88.2% of the compromise-relevant constructs observed; the remainder (matrix strategies, artefact flows, reusable-workflow nesting) are independent of the tag-mutation reachability property.");
H2("6.2  Layer 2: incident reconstruction");
body("Each row of Table 2 is a separate TLC run with a different initial state; the vulnerable row reproduces the documented attack and the mitigated rows show which remediations close it. Table 3 records the isolation and refinement results of Sections 4.3-4.4.");
pushTable("Mitigation discrimination under exhaustive model checking. Each row is one TLC run.",
  ["Configuration", "NoExfiltration", "Matches reality"],
  [["Tag refs + valid stolen credential (actual)", "FAILS", "Yes - attack occurred"], ["Tag refs + complete rotation", "holds", "No attack"],
   ["SHA pins + valid stolen credential", "holds", "Protects despite residual credential"], ["SHA pins + complete rotation", "holds", "Full defence"]],
  [4880, 2200, 3000], ["", "c", ""]);
pushTable("Isolation and refinement results (TLC).",
  ["Property checked", "Configuration", "Result"],
  [["Isolation (SHA-pinned never leak)", "mixed population", "holds (8,185 states)"], ["Containment witness", "mixed population", "breach reaches only unpinned"],
   ["Hardened refines SecureWorkflow", "all SHA-pinned", "holds"], ["Vulnerable refines SecureWorkflow", "all floating tags", "fails (observation flips)"],
   ["Residual attack surface", "all floating tags", "= unpinned subset (all 5)"]],
  [3880, 3000, 3200], ["", "", ""]);
body("The load-bearing result is the contrast between the first two rows of Table 2: the model formally distinguishes complete rotation (safe) from the partial rotation that actually occurred (still exploited), reproducing the documented incident causation. The first and third rows give the second, independent finding: universal SHA-pinning protects victims even while the stolen credential remains valid.");
H2("6.3  Layer 3: quantitative outputs");
body("With build cadence p = 0.2 per day and a 30-day horizon, PRISM yields the quantitative counterpart of Table 2 (Table 4).");
pushTable("Quantitative mitigation table (PRISM MDP; p = 0.2/day, horizon 30 days).",
  ["Configuration", "P(comp.)", "E[days]", "P(<=30d)"],
  [["Tag refs + valid credential (actual)", "1.00", "6.00", "0.9985"], ["Tag refs + complete rotation", "0.00", "inf", "0.0000"],
   ["SHA pins + valid credential", "0.00", "inf", "0.0000"], ["SHA pins + complete rotation", "0.00", "inf", "0.0000"]],
  [5080, 1700, 1600, 1700], ["", "c", "c", "c"]);
body("The expected time of six days decomposes exactly as one day to weaponise plus 1/p = five days to the next build. A sensitivity sweep of p across a tenfold range (0.05 to 0.5 per day) moves the vulnerable expected time from 21 to 3 days, but SHA-pinning yields probability zero at every value of p: the mitigation ranking is invariant under a tenfold change in the compromise rate, so the recommendation is robust to parameter uncertainty.");
H2("6.4  Multi-stage propagation");
body("The cascade model quantifies the second stage. With p = 0.2, token-theft probability q = 0.5, adoption rate r = 0.1 and downstream population N = 5, PRISM gives Table 5.");
pushTable("Two-stage propagation (PRISM DTMC).",
  ["Metric", "Value"],
  [["P(reach stage 2 / npm propagation)", "0.50 (= token-theft rate q)"], ["P(stage 2 within 30 days)", "0.454"], ["P(full downstream propagation)", "0.50"],
   ["E[hosts compromised at day 30]", "2.18"], ["E[days to first downstream compromise] (q=1)", "16.0"], ["P(reach stage 2) under complete rotation", "0.00"]],
  [7080, 3000], ["", "c"]);
body("Complete credential rotation drives the probability of the entire downstream cascade, not merely the first stage, to zero. The expected sixteen days to the first downstream compromise decomposes as one day to weaponise, five to first-stage compromise, and ten to first downstream adoption.");
H2("6.5  Calibration against public data");
body([{ text: "We calibrate the second-stage rates against the OpenSSF malicious-packages dataset " }, cite(15), { text: ", the OSV-format corpus seeded by the Backstabber's Knife Collection of Ohm et al. " }, cite(14), { text: ". Over the dataset, npm accounts for 214,497 malicious-package reports, 94.2% of all ecosystems. Crucially, npm malicious-package publications rose from 329 in February 2026 to 1,048 in March 2026, a factor of 3.19, in the exact month of the CanisterWorm second stage; the Trivy-derived package was one of those 1,048. The model's fastest-adversary times (six days to first-stage compromise, sixteen to first downstream) are lower bounds consistent with the documented four-week February-to-March residual-credential window; the surplus reflects adversarial patience, which the nondeterministic weaponisation timing of the MDP captures exactly." }]);
H2("6.6  Mitigation discovery");
body([{ text: "Finally, we use the verified model as a ground-truth oracle for an automated search over defender policies. A large-language-model proposer (Claude Opus 4.8) suggests a candidate policy — a fraction f of pipelines migrated to commit-SHA pins together with a Boolean for whether the residual credential is fully rotated — and the Layer-3 PRISM propagation model scores it by its model-checked compromise probability plus an operational-cost penalty 0.30f + 0.05r " }, cite(20), { text: "; no candidate is trusted on the proposer's word. In an executed run the search converged in four rounds: its first proposal, complete rotation with no pinning, was verified to drive compromise to zero at cost 0.05 (score −0.05); a later proposal of full SHA-pinning without rotation was verified safe but costlier (cost 0.30); rotation-only was returned as the optimum, recovering the paper's central recommendation without human guidance. Because the oracle is deterministic ground truth, the same minimal-cost provably-safe policy is recovered regardless of proposer stochasticity; the driver and the archived run record accompany the artifact. The search proposes; the model checker decides." }]);

H1("7  Discussion");
body("Two findings are non-trivial in the precise sense that they contradict a plausible operational intuition. First, a partial credential rotation that revokes most credentials is not a partial defence but no defence at all against this attack class: a single retained valid credential with tag-write permission suffices, and the model flags exactly this. Second, commit-SHA pinning defends a pipeline unilaterally. A pinning victim is protected regardless of its neighbours' behaviour and regardless of whether the upstream credential is ever rotated, because it never resolves the mutated tag. Isolation formalises this as containment of the blast radius, and refinement quantifies the residual surface as precisely the set of pipelines that decline to pin.");
body("The quantitative layer sharpens the guidance rather than replacing it. Expected-time and bounded-horizon probabilities let an operator reason about detection windows; the parametric forms make explicit which conclusions are robust (the mitigation ranking) and which depend on uncertain inputs (absolute timings). The multi-stage model shows that the value of a mitigation is not confined to the pipeline that adopts it: preventing the first stage removes the token supply that powers the second.");

H1("8  Limitations and Threats to Validity");
body("The analysis is deliberately conservative, and several caveats bound its claims. On data: the second-stage parameters q (the fraction of compromised runners holding npm tokens) and r (downstream adoption rate) are assumptions rather than measurements, for want of a public dataset; we therefore report the parametric form P(stage 2) = q so the dependence is explicit. The workflow corpus is modest (189 files) and popularity-biased toward projects that pin more than average, so the measured floating-tag fraction is a lower bound. The build cadence p is illustrative. The calibration against the February-to-March publication spike is corroborative, not causal, and the incident facts themselves are taken from the public dossier rather than independently re-verified.");
body("On modelling: the checked instance is small (five victims), sufficient to exercise the safety property but not a proof for arbitrary populations; several mechanisms are abstracted by design (the credential-theft origin, the C2 path, Git internals, payload structure); the second-stage population dynamics are simplified to sequential adoption; and the worst-case adversary means the reported probabilities and times are bounds rather than expected real-world values. On methodology and tooling: PRISM is used in place of Storm (identical semantics, no native Windows build for the latter); the parametric engine does not support step-bounded properties, for which we give the analytic form; the automated policy search's outer loop was not executed end-to-end; a single incident is reconstructed where the methodology envisions several; and a practitioner review of the threat model, which the methodology recommends, has not been conducted.");

H1("9  Related Work");
body([{ text: "Empirical study of open-source supply-chain attacks was catalogued by Ohm et al. in the Backstabber's Knife Collection " }, cite(14), { text: ", and is tracked continuously by the OpenSSF malicious-packages project and OSV " }, cite(15), { text: " and by industry telemetry " }, cite(20), { text: ". Defensive frameworks such as SLSA " }, cite(18), { text: " prescribe provenance and pinning controls; our contribution is to give one such control (SHA-pinning) a formal isolation guarantee and a quantified residual surface rather than a checklist status. Formal verification via TLA+ and TLC " }, cite(16), { text: " and probabilistic model checking via PRISM " }, cite(17), { text: " and Storm " }, cite(19), { text: " are mature; we apply them jointly to a documented CI/CD incident and, unusually, validate the abstraction against a real workflow corpus and against measured malicious-package frequencies rather than treating the model as self-justifying." }]);

H1("10  Conclusion");
body("We reconstructed the March 2026 Trivy/TeamPCP supply-chain compromise as a formal, quantitative artefact. Exhaustive model checking shows the documented attack is reachable from the disclosed pre-attack state and is closed by complete credential rotation or by universal SHA-pinning; an isolation theorem and a refinement relation make the SHA-pinning guarantee precise and quantify the residual attack surface; and a probabilistic, multi-stage, parametric model, calibrated against public data, quantifies how likely, how fast, and how far a compromise spreads. The recurring lesson is that in automated CI/CD the difference between a partial and a complete remediation is not a difference of degree but of kind, and that a formalism which distinguishes them says something an incident report cannot.");

H1("References");
const refs = [
  "Aqua Security. Trivy supply-chain attack: what you need to know. Technical report, 2026.",
  "GitHub. Security Advisory for aquasecurity/trivy. GitHub Security Advisories, 2026.",
  "MITRE. CVE-2026-33634. Common Vulnerabilities and Exposures, 2026.",
  "CISA. Known Exploited Vulnerabilities Catalog. 2026.",
  "Mercor. Public disclosure statement on the TeamPCP supply-chain campaign (LiteLLM follow-on compromise). 2026.",
  "Palo Alto Networks, Unit 42. TeamPCP supply-chain attacks and the CanisterWorm payload. 2026.",
  "Microsoft. Detecting, investigating and defending against the Trivy supply-chain compromise. Microsoft Security Blog, 24 March 2026.",
  "Wiz Research. Trivy compromised: tracking the TeamPCP supply-chain attack. 2026.",
  "ReversingLabs. The TeamPCP supply-chain attack spreads: payload analysis. 2026.",
  "Endor Labs. TeamPCP isn't done: the February-to-March causal chain. 2026.",
  "Kudelski Security. Investigating two variants of the Trivy supply-chain compromise. 2026.",
  "SANS Internet Storm Center. Diary entry 32856: Trivy Action compromise. 2026.",
  "Cato Networks. The TeamPCP supply-chain attack. 2026.",
  "M. Ohm, H. Plate, A. Sykosch, M. Meier. Backstabber's Knife Collection: A Review of Open-Source Software Supply-Chain Attacks. In DIMVA, 2020.",
  "Open Source Security Foundation. Malicious Packages repository (OSV format). 2026.",
  "L. Lamport. Specifying Systems: The TLA+ Language and Tools for Hardware and Software Engineers. Addison-Wesley, 2002.",
  "M. Kwiatkowska, G. Norman, D. Parker. PRISM 4.0: Verification of Probabilistic Real-Time Systems. In CAV, 2011.",
  "Open Source Security Foundation. SLSA: Supply-chain Levels for Software Artifacts.",
  "C. Hensel, S. Junges, J.-P. Katoen, T. Quatmann, M. Volk. The Probabilistic Model Checker Storm. STTT, 2022.",
  "Sonatype. State of the Software Supply Chain / Open-Source Malware Index. Industry report, 2025.",
];
refs.forEach((r, i) => { want(2); add(new Paragraph({ spacing: { after: 40, line: 224 }, indent: { left: 360, hanging: 360 }, alignment: AlignmentType.JUSTIFIED,
  children: [new TextRun({ text: `[${i + 1}] `, font: SERIF, size: 17 }), new TextRun({ text: r, font: SERIF, size: 17 })] })); });

// =====================================================================
const footer = () => new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: SERIF, size: 18, color: MUTE })] })] });
const doc = new Document({
  styles: {
    default: { document: { run: { font: SERIF, size: 20, color: INK } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 23, bold: true, font: SERIF }, paragraph: { outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 21, bold: true, italics: true, font: SERIF }, paragraph: { outlineLevel: 1 } },
    ],
  },
  numbering: { config: [{ reference: "bul", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 460, hanging: 230 } } } }] }] },
  sections: sections.map((s, i) => ({
    properties: {
      ...(i > 0 ? { type: SectionType.CONTINUOUS } : {}),
      page: PAGE,
      column: { count: s.cols, space: COLSPACE, equalWidth: true },
    },
    footers: { default: footer() },
    children: s.children,
  })),
});
const out = process.argv[2] || "paper_usenix.docx";
Packer.toBuffer(doc).then((b) => { fs.writeFileSync(out, b); console.log("Wrote " + out + " (" + b.length + " bytes); sections=" + sections.length); });
