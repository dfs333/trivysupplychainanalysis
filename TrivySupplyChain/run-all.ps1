<#
  run-all.ps1 - Reproduce the Layer-2 incident-reconstruction validation table.

  Runs TLC on every configuration of the Trivy / TeamPCP supply-chain model and
  prints the combined mitigation table from the paper.  Each row is a TLC run
  with a different Init; "the table is the validation."

  Usage:   powershell -ExecutionPolicy Bypass -File .\run-all.ps1
#>

# NOTE: deliberately NOT "Stop" - native tools (java/TLC) write to stderr, and
# under -ErrorActionPreference Stop that becomes a terminating NativeCommandError
# in Windows PowerShell 5.1 even on exit code 0.
$ErrorActionPreference = "Continue"
Set-Location -Path $PSScriptRoot

# --- locate a working java (the system javapath stub is broken on this host) ---
# Prefer a real JDK directory over the Common Files "javapath" launcher stub.
$javaCandidates = @(
    $(if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME "bin\java.exe" }),
    "C:\Program Files\Java\jdk-20\bin\java.exe",
    "C:\Program Files\Java\latest\bin\java.exe",
    "C:\Program Files\Java\jre1.8.0_431\bin\java.exe"
) | Where-Object { $_ }
$java = $javaCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $java) { $java = "java" }  # fall back to PATH
Write-Host "Using Java: $java`n"

$jar = ".\tools\tla2tools.jar"
$results = Join-Path $PSScriptRoot "results"
New-Item -ItemType Directory -Force -Path $results | Out-Null

function Invoke-TLC($module, $cfg) {
    $log = Join-Path $results ("{0}.out" -f ($cfg -replace '\.cfg$',''))
    & $java -XX:+UseParallelGC -cp $jar tlc2.TLC -deadlock -config $cfg $module *> $log
    return (Get-Content $log -Raw)
}

# config, module, human label, mitigation knobs, expected NoExfiltration result
$runs = @(
    @{ cfg="cfg_vuln.cfg";   mod="TrivySupplyChain.tla"; label="Tag refs + valid stolen cred (pre-March actual)"; residual=$true;  expect="FAILS" },
    @{ cfg="cfg_rotate.cfg"; mod="TrivySupplyChain.tla"; label="Tag refs + complete rotation";                    residual=$false; expect="HOLDS" },
    @{ cfg="cfg_shapin.cfg"; mod="TrivySupplyChain.tla"; label="SHA pins + valid stolen cred";                    residual=$true;  expect="HOLDS" },
    @{ cfg="cfg_full.cfg";   mod="TrivySupplyChain.tla"; label="SHA pins + complete rotation";                    residual=$false; expect="HOLDS" }
)

$rows = @()
$allOk = $true
foreach ($r in $runs) {
    Write-Host ("Checking {0,-48} ... " -f $r.label) -NoNewline
    $out = Invoke-TLC $r.mod $r.cfg
    if ($out -match "Invariant NoExfiltration is violated") { $actual = "FAILS" }
    elseif ($out -match "No error has been found")          { $actual = "HOLDS" }
    else                                                    { $actual = "UNKNOWN" }

    # ResidualAccessVulnerability is "triggered" iff a residual valid credential
    # exists AND that residual access yields a reachable compromise (NoExfiltration FAILS).
    $triggered = if ($r.residual -and $actual -eq "FAILS") { "triggered" } else { "not triggered" }
    $reality = switch ($r.cfg) {
        "cfg_vuln.cfg"   { "Yes, attack occurred" }
        "cfg_rotate.cfg" { "No attack" }
        "cfg_shapin.cfg" { "Protects even with residual cred" }
        "cfg_full.cfg"   { "Full defense" }
    }
    $ok = ($actual -eq $r.expect)
    if (-not $ok) { $allOk = $false }
    Write-Host ($(if ($ok) { "OK ($actual)" } else { "MISMATCH (got $actual, expected $($r.expect))" })) -ForegroundColor $(if ($ok) {"Green"} else {"Red"})

    $rows += [pscustomobject]@{
        Configuration               = $r.label
        NoExfiltration              = $actual
        ResidualAccessVulnerability = $triggered
        MatchesReality              = $reality
    }
}

# --- trace-based sanity check (Step 4) ---
Write-Host ("Checking {0,-48} ... " -f "Trace-based sanity check (documented path)") -NoNewline
$tout = Invoke-TLC "MCTrace.tla" "cfg_trace.cfg"
$traceOk = ($tout -match "No error has been found") -and ($tout -match "The depth of the complete state graph search is 3")
if (-not $traceOk) { $allOk = $false }
Write-Host ($(if ($traceOk) { "OK (documented trace reachable, depth 3)" } else { "FAILED" })) -ForegroundColor $(if ($traceOk) {"Green"} else {"Red"})

# --- isolation, refinement, residual-surface checks ---
# Each entry: label, module, cfg, whether the invariant/property is EXPECTED to hold.
$extra = @(
    @{ label="Isolation holds (mixed population)";          mod="TrivySupplyChain.tla"; cfg="cfg_mixed.cfg";          hold=$true  },
    @{ label="Breach contained to unpinned subset";          mod="TrivySupplyChain.tla"; cfg="cfg_mixed_breach.cfg";   hold=$false },
    @{ label="Hardened workflow refines SecureWorkflow";     mod="MCRefine.tla";         cfg="cfg_refine_hardened.cfg"; hold=$true  },
    @{ label="Vulnerable workflow does NOT refine";          mod="MCRefine.tla";         cfg="cfg_refine_vuln.cfg";     hold=$false },
    @{ label="Residual surface = unpinned subset reachable"; mod="MCRefine.tla";         cfg="cfg_surface.cfg";         hold=$false }
)
foreach ($e in $extra) {
    Write-Host ("Checking {0,-48} ... " -f $e.label) -NoNewline
    $o = Invoke-TLC $e.mod $e.cfg
    $held = ($o -match "No error has been found")
    $ok = ($held -eq $e.hold)
    if (-not $ok) { $allOk = $false }
    $verdict = if ($e.hold) { if ($held) {"OK (holds)"} else {"FAILED (expected holds)"} }
               else { if (-not $held) {"OK (violated as expected)"} else {"FAILED (expected violation)"} }
    Write-Host $verdict -ForegroundColor $(if ($ok) {"Green"} else {"Red"})
}

Write-Host "`n================ Combined mitigation / validation table ================`n"
$rows | Format-Table -AutoSize -Wrap | Out-String | Write-Host

# persist a markdown copy of the table
$md = "| Configuration | NoExfiltration | ResidualAccessVulnerability | Matches Reality |`n"
$md += "|---|---|---|---|`n"
foreach ($row in $rows) {
    $md += "| $($row.Configuration) | $($row.NoExfiltration) | $($row.ResidualAccessVulnerability) | $($row.MatchesReality) |`n"
}
$md | Set-Content -Encoding utf8 (Join-Path $results "validation_table.md")

# tidy TLC scratch (state-graph metadata dirs) so the project stays clean
Get-ChildItem $PSScriptRoot -Directory -Filter "states" -ErrorAction SilentlyContinue |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

if ($allOk) {
    Write-Host "ALL CHECKS PASSED - model reproduces the documented incident and mitigation outcomes." -ForegroundColor Green
    exit 0
} else {
    Write-Host "SOME CHECKS DID NOT MATCH EXPECTATIONS - see results\*.out" -ForegroundColor Red
    exit 1
}
