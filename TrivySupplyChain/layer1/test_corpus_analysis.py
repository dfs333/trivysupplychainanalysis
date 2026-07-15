#!/usr/bin/env python3
"""Unit tests for corpus_analysis.py against synthetic fixtures with hand-computed
expected values.  Run:  python test_corpus_analysis.py
"""
import os
import sys

import corpus_analysis as ca

HERE = os.path.dirname(os.path.abspath(__file__))
FIX = os.path.join(HERE, "fixtures")


def approx(a, b, eps=0.05):
    return abs(a - b) < eps


def main():
    per_file = ca.load_corpus(FIX)
    agg = ca.aggregate(per_file)

    checks = []
    def check(name, cond):
        checks.append((name, cond))

    # --- structural counts hand-computed from A/B/C fixtures ---
    check("3 workflows parsed, 0 errors",
          agg["n_workflows"] == 3 and agg["n_parse_errors"] == 0)
    check("pin counts {sha:2, floating:3, local:1, docker:1}",
          agg["uses_pin_counts"].get("sha_pinned") == 2 and
          agg["uses_pin_counts"].get("floating") == 3 and
          agg["uses_pin_counts"].get("local") == 1 and
          agg["uses_pin_counts"].get("docker") == 1)
    check("5 external (resolvable) action refs", agg["n_external_action_refs"] == 5)
    check("f_floating = 0.6 (3 of 5)", approx(agg["f_floating_tag_fraction"], 0.6))
    check("sha-pinned = 40%", approx(agg["pct_sha_pinned"], 40.0))
    check("permissions dist = {granular_read, write-all, unspecified}",
          agg["permissions_distribution"].get("granular_read") == 1 and
          agg["permissions_distribution"].get("write-all") == 1 and
          agg["permissions_distribution"].get("unspecified") == 1)
    check("pull_request_target = 33.3%", approx(agg["pct_pull_request_target"], 33.3))
    check("workflow_run = 33.3%", approx(agg["pct_workflow_run"], 33.3))
    check("self-hosted = 33.3%", approx(agg["pct_self_hosted_runner"], 33.3))
    check("using secrets = 66.7%", approx(agg["pct_using_secrets"], 66.7))
    check("matrix = 33.3%", approx(agg["pct_matrix"], 33.3))
    check("reusable call = 33.3%", approx(agg["pct_reusable_call"], 33.3))
    check("artifact flow = 33.3%", approx(agg["pct_artifact_flow"], 33.3))
    check("construct coverage = 14/17 = 0.824", approx(agg["construct_coverage"], 0.824, 0.01))

    failed = [n for n, c in checks if not c]
    for n, c in checks:
        print(f"  [{'PASS' if c else 'FAIL'}] {n}")
    if failed:
        print(f"\n{len(failed)} CHECK(S) FAILED")
        print("Aggregate was:")
        import json
        print(json.dumps(agg, indent=2))
        return 1
    print(f"\nAll {len(checks)} checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
