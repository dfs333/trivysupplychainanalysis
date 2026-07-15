#!/usr/bin/env python3
"""
Layer 1 - structural faithfulness via corpus analysis.

Statically analyzes a corpus of real GitHub Actions workflow YAML files and
measures the frequency of exactly the features the Layer 2/3 formal model claims
to represent.  Its headline output is the floating-tag fraction f -- the empirical
basis for the model's pinningPolicy / UniversalSHAPin=FALSE worst-case assumption
and for the Layer 3 propagation parameter.

Usage:
    python corpus_analysis.py <corpus_dir> [--json out.json] [--md out.md]

A "corpus_dir" is any directory tree containing *.yml / *.yaml workflow files.
"""
import argparse
import json
import os
import re
import sys
from collections import Counter

import yaml

SHA_RE = re.compile(r"^[0-9a-fA-F]{40}$|^[0-9a-fA-F]{64}$")   # git SHA-1 / SHA-256
SECRET_RE = re.compile(r"\$\{\{\s*secrets\.([A-Za-z0-9_\-]+)", re.I)

# Constructs the formal model represents (the compromise-relevant ones) vs those it
# deliberately abstracts and argues are independent of the tag-mutation -> exfil property.
MODELED_CONSTRUCTS = {"external_action_use", "tag_vs_sha_pin", "secret_in_env",
                      "trigger_causes_run", "runner_execution"}
UNMODELED_CONSTRUCTS = {"matrix_strategy", "composite_action_local", "artifact_flow",
                        "reusable_workflow_call", "container_services"}


def classify_uses(ref_str):
    """Classify a `uses:` value into a pin category."""
    if not isinstance(ref_str, str):
        return "other"
    s = ref_str.strip()
    if s.startswith("./") or s.startswith(".\\") or s == ".":
        return "local"
    if s.startswith("docker://"):
        return "docker"
    if "@" not in s:
        # owner/repo with no ref -> implicit default branch == unpinned/floating
        return "floating"
    ref = s.rsplit("@", 1)[1]
    return "sha_pinned" if SHA_RE.match(ref) else "floating"


def normalize_triggers(wf):
    """Return the set of trigger event names, handling the YAML `on:` -> True quirk."""
    on = wf.get("on", wf.get(True))
    if on is None:
        return set()
    if isinstance(on, str):
        return {on}
    if isinstance(on, list):
        return {str(x) for x in on}
    if isinstance(on, dict):
        return {str(k) for k in on.keys()}
    return set()


def classify_permissions(perm):
    """Categorize a permissions block."""
    if perm is None:
        return "unspecified"          # inherits repo/runner default (often broad)
    if isinstance(perm, str):
        return perm                   # "read-all" | "write-all"
    if isinstance(perm, dict):
        if not perm:
            return "none"             # permissions: {}  -> least privilege
        if any(str(v).lower() == "write" for v in perm.values()):
            return "granular_write"
        return "granular_read"
    return "unspecified"


def analyze_workflow(text, name):
    """Extract the modeled feature set from one workflow file."""
    try:
        wf = yaml.safe_load(text)
    except Exception as e:
        return {"file": name, "error": f"yaml parse error: {e}"}
    if not isinstance(wf, dict):
        return {"file": name, "error": "not a mapping"}

    triggers = normalize_triggers(wf)
    jobs = wf.get("jobs", {}) or {}
    if not isinstance(jobs, dict):
        jobs = {}

    uses_by_cat = Counter()
    external_actions = []
    self_hosted = False
    runner_kinds = Counter()
    has_needs = False
    artifact_flow = False
    reusable_call = False
    matrix = False

    for jname, job in jobs.items():
        if not isinstance(job, dict):
            continue
        # job-level reusable workflow call
        if "uses" in job:
            reusable_call = True
            uses_by_cat[classify_uses(job.get("uses"))] += 1
            external_actions.append(job.get("uses"))
        if "needs" in job:
            has_needs = True
        if "strategy" in job and isinstance(job["strategy"], dict) and "matrix" in job["strategy"]:
            matrix = True
        runs_on = job.get("runs-on")
        labels = []
        if isinstance(runs_on, str):
            labels = [runs_on]
        elif isinstance(runs_on, list):
            labels = [str(x) for x in runs_on]
        elif isinstance(runs_on, dict):  # runs-on: {group:..., labels:[...]}
            lab = runs_on.get("labels", [])
            labels = [lab] if isinstance(lab, str) else [str(x) for x in (lab or [])]
        for lab in labels:
            low = lab.lower()
            gh_hosted = any(low.startswith(p) for p in
                            ("ubuntu", "windows", "macos", "macos-", "ubuntu-", "windows-"))
            if gh_hosted:
                runner_kinds["github_hosted"] += 1
            else:
                runner_kinds["self_hosted"] += 1
                self_hosted = True

        for step in (job.get("steps") or []):
            if not isinstance(step, dict):
                continue
            if "uses" in step:
                u = step.get("uses")
                cat = classify_uses(u)
                uses_by_cat[cat] += 1
                external_actions.append(u)
                base = str(u).split("@")[0].lower()
                if "upload-artifact" in base or "download-artifact" in base:
                    artifact_flow = True

    secrets = set(SECRET_RE.findall(text))

    # per-workflow construct presence (for coverage accounting)
    constructs = set()
    if uses_by_cat:
        constructs.add("external_action_use")
        constructs.add("tag_vs_sha_pin")
    if secrets:
        constructs.add("secret_in_env")
    if triggers:
        constructs.add("trigger_causes_run")
    if jobs:
        constructs.add("runner_execution")
    if matrix:
        constructs.add("matrix_strategy")
    if artifact_flow:
        constructs.add("artifact_flow")
    if reusable_call:
        constructs.add("reusable_workflow_call")

    return {
        "file": name,
        "triggers": sorted(triggers),
        "uses_by_category": dict(uses_by_cat),
        "permissions_top": classify_permissions(wf.get("permissions")),
        "n_secret_refs": len(secrets),
        "self_hosted": self_hosted,
        "runner_kinds": dict(runner_kinds),
        "has_needs": has_needs,
        "artifact_flow": artifact_flow,
        "reusable_call": reusable_call,
        "matrix": matrix,
        "uses_pull_request_target": "pull_request_target" in triggers,
        "uses_workflow_run": "workflow_run" in triggers,
        "constructs": sorted(constructs),
        "external_actions": external_actions,
    }


def aggregate(per_file):
    ok = [r for r in per_file if "error" not in r]
    n = len(ok)
    pins = Counter()
    for r in ok:
        pins.update(r["uses_by_category"])
    external = pins["floating"] + pins["sha_pinned"]   # only resolvable external actions
    f_floating = (pins["floating"] / external) if external else 0.0

    perm_dist = Counter(r["permissions_top"] for r in ok)
    n_prt = sum(1 for r in ok if r["uses_pull_request_target"])
    n_wfr = sum(1 for r in ok if r["uses_workflow_run"])
    n_self = sum(1 for r in ok if r["self_hosted"])
    n_secrets = sum(1 for r in ok if r["n_secret_refs"] > 0)
    n_matrix = sum(1 for r in ok if r["matrix"])
    n_reuse = sum(1 for r in ok if r["reusable_call"])
    n_artifact = sum(1 for r in ok if r["artifact_flow"])

    # construct coverage: of all construct-instances observed, what fraction are modeled
    all_constructs = Counter()
    for r in ok:
        all_constructs.update(r["constructs"])
    modeled = sum(v for k, v in all_constructs.items() if k in MODELED_CONSTRUCTS)
    unmodeled = sum(v for k, v in all_constructs.items() if k in UNMODELED_CONSTRUCTS)
    total_constructs = modeled + unmodeled
    coverage = (modeled / total_constructs) if total_constructs else 0.0

    def pct(x):
        return round(100.0 * x / n, 1) if n else 0.0

    return {
        "n_workflows": n,
        "n_parse_errors": len(per_file) - n,
        "uses_pin_counts": dict(pins),
        "n_external_action_refs": external,
        "f_floating_tag_fraction": round(f_floating, 4),
        "pct_sha_pinned": round(100.0 * pins["sha_pinned"] / external, 1) if external else 0.0,
        "permissions_distribution": dict(perm_dist),
        "pct_pull_request_target": pct(n_prt),
        "pct_workflow_run": pct(n_wfr),
        "pct_self_hosted_runner": pct(n_self),
        "pct_using_secrets": pct(n_secrets),
        "pct_matrix": pct(n_matrix),
        "pct_reusable_call": pct(n_reuse),
        "pct_artifact_flow": pct(n_artifact),
        "construct_coverage": round(coverage, 4),
        "construct_instances": dict(all_constructs),
    }


def load_corpus(corpus_dir):
    per_file = []
    for root, _, files in os.walk(corpus_dir):
        for fn in files:
            if fn.lower().endswith((".yml", ".yaml")):
                path = os.path.join(root, fn)
                try:
                    with open(path, encoding="utf-8") as fh:
                        text = fh.read()
                except Exception as e:
                    per_file.append({"file": fn, "error": f"read error: {e}"})
                    continue
                rel = os.path.relpath(path, corpus_dir)
                per_file.append(analyze_workflow(text, rel))
    return per_file


def to_markdown(agg):
    L = []
    L.append("# Layer 1 corpus analysis - results\n")
    L.append(f"- Workflows analyzed: **{agg['n_workflows']}** "
             f"(parse errors: {agg['n_parse_errors']})")
    L.append(f"- External action references: **{agg['n_external_action_refs']}**")
    L.append("")
    L.append("## Headline calibration parameter\n")
    L.append(f"- **Floating-tag fraction f = {agg['f_floating_tag_fraction']} "
             f"({100*agg['f_floating_tag_fraction']:.1f}% of action refs are unpinned tags)**")
    L.append(f"- SHA-pinned fraction = {agg['pct_sha_pinned']}%")
    L.append(f"- pin counts: {agg['uses_pin_counts']}")
    L.append("")
    L.append("## Compromise-relevant frequencies\n")
    L.append("| Property | Value |")
    L.append("|---|---|")
    L.append(f"| pull_request_target used | {agg['pct_pull_request_target']}% of workflows |")
    L.append(f"| workflow_run used | {agg['pct_workflow_run']}% |")
    L.append(f"| self-hosted runner | {agg['pct_self_hosted_runner']}% |")
    L.append(f"| references secrets | {agg['pct_using_secrets']}% |")
    L.append(f"| permissions distribution | {agg['permissions_distribution']} |")
    L.append("")
    L.append("## Construct coverage\n")
    L.append(f"- **Coverage = {100*agg['construct_coverage']:.1f}%** of compromise-relevant "
             "construct-instances are within the modeled set.")
    L.append(f"- matrix strategies: {agg['pct_matrix']}% | reusable calls: "
             f"{agg['pct_reusable_call']}% | artifact flows: {agg['pct_artifact_flow']}% "
             "(unmodeled; argued independent of the tag-mutation -> exfil property).")
    L.append(f"- construct instances: {agg['construct_instances']}")
    return "\n".join(L) + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("corpus_dir")
    ap.add_argument("--json")
    ap.add_argument("--md")
    args = ap.parse_args()

    per_file = load_corpus(args.corpus_dir)
    agg = aggregate(per_file)
    report = {"summary": agg, "per_file": per_file}

    if args.json:
        os.makedirs(os.path.dirname(os.path.abspath(args.json)), exist_ok=True)
        with open(args.json, "w", encoding="utf-8") as fh:
            json.dump(report, fh, indent=2)
    if args.md:
        os.makedirs(os.path.dirname(os.path.abspath(args.md)), exist_ok=True)
        with open(args.md, "w", encoding="utf-8") as fh:
            fh.write(to_markdown(agg))

    print(json.dumps(agg, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
