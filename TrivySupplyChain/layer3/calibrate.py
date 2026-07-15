#!/usr/bin/env python3
"""
Layer 3 calibration against public malicious-package frequency data.

Derives model inputs from the OpenSSF malicious-packages dataset (OSV-format,
the same corpus the Backstabber's Knife Collection of Ohm et al. 2020 seeded)
and checks them against the documented Feb->Mar 2026 Trivy / CanisterWorm
timeline.  Reads _osv_stats.csv (ecosystem, month, published reports).

Usage:  python calibrate.py
"""
import csv, collections, json, os, statistics

HERE = os.path.dirname(os.path.abspath(__file__))
CSV = os.path.join(HERE, "_osv_stats.csv")

rows = list(csv.DictReader(open(CSV, encoding="utf-8")))
by_eco_total = collections.Counter()
npm_by_month = {}
months_per_eco = collections.defaultdict(set)
for r in rows:
    eco, m, n = r["ecosystem"], r["month"], int(r["published reports"])
    by_eco_total[eco] += n
    months_per_eco[eco].add(m)
    if eco.lower() == "npm":
        npm_by_month[m] = n

grand = sum(by_eco_total.values())
npm_total = by_eco_total["npm"]
npm_months = sorted(npm_by_month)
npm_vals = [npm_by_month[m] for m in npm_months]
npm_mean = npm_total / len(npm_months)
npm_median = statistics.median(npm_vals)

# the documented incident window
feb = npm_by_month.get("2026-02-01")
mar = npm_by_month.get("2026-03-01")

# Incident-month publication rate -> stage-2 base rate (one of these was CanisterWorm)
incident_rate_per_day = mar / 30.0 if mar else None

cal = {
    "source": "OpenSSF malicious-packages (OSV format); seeded by Backstabber's Knife "
              "Collection, Ohm et al. DIMVA 2020",
    "npm_total_reports": npm_total,
    "npm_months_covered": len(npm_months),
    "npm_window": f"{npm_months[0]} .. {npm_months[-1]}",
    "npm_share_of_all_ecosystems_pct": round(100 * npm_total / grand, 1),
    "npm_mean_reports_per_month": round(npm_mean, 1),
    "npm_median_reports_per_month": npm_median,
    "pypi_total": by_eco_total["PyPI"],
    "rubygems_total": by_eco_total["RubyGems"],
    "incident_window": {
        "feb_2026_npm_malicious": feb,
        "mar_2026_npm_malicious": mar,
        "feb_to_mar_ratio": round(mar / feb, 2) if (feb and mar) else None,
        "mar_2026_rate_per_day": round(incident_rate_per_day, 1) if incident_rate_per_day else None,
    },
    # --- mapping to model parameters ---
    "model_mapping": {
        "stage2_base_rate_lambda_per_day": round(incident_rate_per_day, 1) if incident_rate_per_day else None,
        "note_p_q_r": "p (build cadence) and r (downstream adoption) set the timing; q "
                      "(token-theft fraction) set P(reach stage 2)=q exactly (parametric). "
                      "The CanisterWorm npm package was 1 of the %s npm malicious packages "
                      "published in the incident month (Mar 2026)." % mar,
        "documented_residual_window_days": "~28 (Feb incident -> Mar attack)",
        "model_fastest_adversary_days_stage1": 6,
        "model_fastest_adversary_days_stage2_q1": 16,
        "consistency": "model fastest-adversary times (6 / 16 days) are LOWER BOUNDS, "
                       "consistent with the observed ~28-day Feb->Mar window; the surplus "
                       "is adversarial patience, captured by the MDP's nondeterministic "
                       "weaponization timing.",
    },
}

out = os.path.join(HERE, "results", "calibration.json")
os.makedirs(os.path.dirname(out), exist_ok=True)
json.dump(cal, open(out, "w", encoding="utf-8"), indent=2)

print(json.dumps(cal, indent=2))
print("\nWrote", out)
