#!/usr/bin/env python3
"""
Fetch a real sample corpus of GitHub Actions workflows from popular public repos,
using the unauthenticated GitHub REST API (60 req/hr; we use ~1 listing request per
repo, raw downloads are not API-rate-limited).  Saves *.yml into ./corpus/.

Usage:  python fetch_corpus.py [--out corpus] [--cap-per-repo 15]
"""
import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.error

REPOS = [
    "actions/runner", "pytorch/pytorch", "microsoft/vscode", "facebook/react",
    "vercel/next.js", "denoland/deno", "prometheus/prometheus", "grafana/grafana",
    "home-assistant/core", "django/django", "pallets/flask", "numpy/numpy",
    "elastic/elasticsearch", "hashicorp/terraform", "nodejs/node",
    "kubernetes/kubernetes", "ansible/ansible", "tokio-rs/tokio",
    "fastapi/fastapi", "sveltejs/svelte",
]

UA = {"User-Agent": "trivy-layer1-corpus/1.0", "Accept": "application/vnd.github+json"}


def get(url, headers=UA, binary=False):
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read()
        return data if binary else data.decode("utf-8", "replace")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(os.path.dirname(os.path.abspath(__file__)), "corpus"))
    ap.add_argument("--cap-per-repo", type=int, default=15)
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    saved, repos_ok = 0, 0
    for repo in REPOS:
        api = f"https://api.github.com/repos/{repo}/contents/.github/workflows"
        try:
            listing = json.loads(get(api))
        except urllib.error.HTTPError as e:
            if e.code == 403:
                print(f"[rate-limited] stopping after {repos_ok} repos / {saved} files")
                break
            print(f"[skip] {repo}: HTTP {e.code}")
            continue
        except Exception as e:
            print(f"[skip] {repo}: {e}")
            continue
        if not isinstance(listing, list):
            print(f"[skip] {repo}: no workflows dir")
            continue
        n = 0
        for item in listing:
            if n >= args.cap_per_repo:
                break
            name = item.get("name", "")
            if not name.lower().endswith((".yml", ".yaml")):
                continue
            durl = item.get("download_url")
            if not durl:
                continue
            try:
                text = get(durl, headers={"User-Agent": UA["User-Agent"]})
            except Exception as e:
                print(f"   [fail] {repo}/{name}: {e}")
                continue
            safe = repo.replace("/", "__") + "__" + name
            with open(os.path.join(args.out, safe), "w", encoding="utf-8") as fh:
                fh.write(text)
            saved += 1
            n += 1
        if n:
            repos_ok += 1
            print(f"[ok] {repo}: {n} workflows")
        time.sleep(0.3)

    print(f"\nDONE: {saved} workflow files from {repos_ok} repos -> {args.out}")
    return 0 if saved else 1


if __name__ == "__main__":
    sys.exit(main())
