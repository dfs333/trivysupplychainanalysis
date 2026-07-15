#!/usr/bin/env python3
"""
ASI-Evolve evaluation oracle for the Trivy / TeamPCP supply-chain model.

ASI-Evolve (https://github.com/GAIR-NLP/ASI-Evolve) is an autonomous-research /
optimization loop -- it proposes candidate solutions and learns from a score. It does
NOT do formal verification itself. Here it is wired to the FORMALLY VERIFIED Layer 3
PRISM model as its ground-truth evaluator: ASI-Evolve proposes a defender mitigation
*policy*, and this script scores it by model-checking the policy with PRISM and adding
an operational-cost penalty. Maximizing the score = discovering the cheapest policy
that the model proves drives downstream compromise to zero.

Candidate policy (JSON, passed as argv[1], or baseline_config.json by default):
    {
      "fraction_sha_pinned": 0.0,   # in [0,1] -- share of victims migrated to SHA pins
      "rotation_complete":   false  # was the residual Aqua credential fully rotated?
    }

Output (stdout): a JSON object with the metric ASI-Evolve maximizes:
    {"score": ..., "compromise_fraction": ..., "cost": ..., ...}
The final stdout line is the bare score, for simple metric scrapers.
"""
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
LAYER3 = os.path.join(HERE, "..", "layer3")
PRISM_DIR = os.path.join(LAYER3, "prism")

# Threat-environment constant (from Layer 1 corpus measurement); fixed, not a lever.
BUILD_CADENCE_P = 0.2

# Operational cost weights: pinning every action across an org is ongoing toil;
# rotating one leaked credential is a cheap one-off. The optimum is therefore
# expected to be "rotate the credential" -- the paper's central finding.
W_PIN = 0.30
W_ROT = 0.05


def find_java():
    cands = [
        os.path.join(os.environ["JAVA_HOME"], "bin", "java.exe") if os.environ.get("JAVA_HOME") else None,
        r"C:\Program Files\Java\jdk-20\bin\java.exe",
        r"C:\Program Files\Java\latest\bin\java.exe",
        r"C:\Program Files\Java\jre1.8.0_431\bin\java.exe",
    ]
    for c in cands:
        if c and os.path.exists(c):
            return c
    return "java"


def prism_env():
    env = dict(os.environ)
    mingw = r"C:\Program Files\Git\mingw64\bin"
    libdir = os.path.join(PRISM_DIR, "lib")
    parts = [p for p in (mingw, libdir) if os.path.isdir(p)]
    env["PATH"] = os.pathsep.join(parts + [env.get("PATH", "")])
    return env


def compromise_fraction(fraction_sha_pinned, rotation_complete):
    """Model-check the policy with the Layer 3 PRISM propagation model and return
    the expected compromised population fraction (Pmax[F compromise])."""
    f_tag = max(0.0, min(1.0, 1.0 - fraction_sha_pinned))   # vulnerable (tag-pinned) share
    rotated = 1 if rotation_complete else 0
    java = find_java()
    cp = os.pathsep.join([
        os.path.join(PRISM_DIR, "lib", "prism.jar"),
        PRISM_DIR,
        os.path.join(PRISM_DIR, "lib", "*"),
    ])
    cmd = [
        java, "-Xss4M", f"-Djava.library.path={os.path.join(PRISM_DIR, 'lib')}",
        "-classpath", cp, "prism.PrismCL",
        os.path.join(LAYER3, "trivy_propagation.prism"),
        os.path.join(LAYER3, "propagation.props"),
        "-const", f"f={f_tag},p={BUILD_CADENCE_P},rotated={rotated}",
    ]
    out = subprocess.run(cmd, capture_output=True, text=True, env=prism_env()).stdout
    m = re.search(r"Result:\s+(\S+)", out)
    if not m:
        raise RuntimeError("PRISM produced no Result. Output tail:\n" + out[-800:])
    tok = m.group(1)
    return float("inf") if tok == "Infinity" else float(tok)


def evaluate(policy):
    s = max(0.0, min(1.0, float(policy.get("fraction_sha_pinned", 0.0))))
    rot = bool(policy.get("rotation_complete", False))
    comp = compromise_fraction(s, rot)
    cost = W_PIN * s + W_ROT * (1.0 if rot else 0.0)
    # ASI-Evolve maximizes; safe + cheap -> closer to 0 (best), unsafe -> very negative.
    score = -(comp + cost)
    return {
        "score": round(score, 6),
        "compromise_fraction": round(comp, 6),
        "cost": round(cost, 6),
        "fraction_sha_pinned": s,
        "rotation_complete": rot,
        "safe": comp == 0.0,
    }


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "baseline_config.json")
    with open(path) as fh:
        policy = json.load(fh)
    metrics = evaluate(policy)
    print(json.dumps(metrics, indent=2))
    print(metrics["score"])  # bare score on the final line for simple scrapers


if __name__ == "__main__":
    main()
