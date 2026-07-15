<#
  run-layer3.ps1 - Layer 3 quantitative analysis (PRISM MDP).

  Reproduces, for the Trivy / TeamPCP supply-chain model:
    1. the per-configuration quantitative table (compromise probability,
       expected days-to-compromise, P(compromise within T days));
    2. the propagation curve (compromised population fraction vs corpus
       tag-pinning fraction f);
    3. the sensitivity analysis (expected time + bounded probability vs the
       build-cadence parameter p over a 10x range) and the mitigation-ranking
       stability check.

  Usage:  powershell -File .\run-layer3.ps1
  (No -ExecutionPolicy flag needed; CurrentUser policy is RemoteSigned.)
#>

$ErrorActionPreference = "Continue"   # native tools write to stderr; don't make that terminating
Set-Location -Path $PSScriptRoot

# --- locate a working java (system javapath stub segfaults on this host) ---
$java = @(
    $(if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME "bin\java.exe" }),
    "C:\Program Files\Java\jdk-20\bin\java.exe",
    "C:\Program Files\Java\latest\bin\java.exe",
    "C:\Program Files\Java\jre1.8.0_431\bin\java.exe"
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $java) { $java = "java" }

$P  = Join-Path $PSScriptRoot "prism"
$cp = "$P\lib\prism.jar;$P\classes;$P;$P\lib\*"
if (-not (Test-Path "$P\lib\prism.jar")) { throw "PRISM not found at $P. See README (extract the installer with 7-Zip)." }

# prism.dll (CUDD) needs the MinGW runtime DLLs; Git for Windows ships them.
$mingw = @("C:\Program Files\Git\mingw64\bin","C:\Program Files (x86)\Git\mingw64\bin") |
            Where-Object { Test-Path $_ } | Select-Object -First 1
if ($mingw) { $env:PATH = "$mingw;$P\lib;$env:PATH" } else { $env:PATH = "$P\lib;$env:PATH" }

$results = Join-Path $PSScriptRoot "results"
New-Item -ItemType Directory -Force -Path $results | Out-Null

function Invoke-Prism([string[]]$prismArgs) {
    return (& $java -Xss4M "-Djava.library.path=$P\lib" -classpath $cp prism.PrismCL @prismArgs 2>&1 | Out-String)
}
function Get-Results([string]$out) {
    # pull the numeric/Infinity token from each "Result: <x> (...)" line, in order
    return ([regex]::Matches($out, 'Result:\s+(\S+)') | ForEach-Object { $_.Groups[1].Value })
}

Write-Host "Using Java:  $java"
Write-Host "Using PRISM: $P  (MinGW runtime: $(if($mingw){$mingw}else{'<system>'}))`n"

# ---------- 1. per-configuration quantitative table ----------
$cfgs = @(
    @{ label="Tag refs + valid stolen cred (pre-March actual)"; r=0; s=0 },
    @{ label="Tag refs + complete rotation";                    r=1; s=0 },
    @{ label="SHA pins + valid stolen cred";                    r=0; s=1 },
    @{ label="SHA pins + complete rotation";                    r=1; s=1 }
)
$rows = @()
foreach ($c in $cfgs) {
    Write-Host ("Checking {0,-48} ... " -f $c.label) -NoNewline
    $out = Invoke-Prism @("trivy_mdp.prism","trivy.props","-const","rotated=$($c.r),shaPin=$($c.s),p=0.2,T=30")
    $res = Get-Results $out
    if ($res.Count -ge 3) {
        $rows += [pscustomobject]@{
            Configuration       = $c.label
            "Pmax(compromise)"  = $res[0]
            "E[days] (min)"     = $(if ($res[1] -eq "Infinity") { "infinity (never)" } else { "{0:N2}" -f [double]$res[1] })
            "P(<=30 days)"      = "{0:N4}" -f [double]$res[2]
        }
        Write-Host "OK" -ForegroundColor Green
    } else { Write-Host "FAILED (see output)" -ForegroundColor Red; Write-Host $out }
}

Write-Host "`n================ Layer 3 quantitative mitigation table (p=0.2/day, T=30) ================`n"
$rows | Format-Table -AutoSize | Out-String | Write-Host

# ---------- 2. propagation curve ----------
Write-Host "Propagation: compromised population fraction vs corpus tag-fraction f (p=0.2, rotated=0)"
Invoke-Prism @("trivy_propagation.prism","propagation.props","-const","p=0.2,rotated=0,f=0.1:0.1:0.9",
               "-exportresults","$results\propagation.csv:csv") | Out-Null
if (Test-Path "$results\propagation.csv") { Get-Content "$results\propagation.csv" | Write-Host }

# ---------- 3. sensitivity + ranking stability ----------
Write-Host "`nSensitivity: fastest-adversary expected days-to-compromise vs build cadence p (10x range)"
Invoke-Prism @("trivy_mdp.prism","trivy.props","-prop","2","-const","rotated=0,shaPin=0,T=30,p=0.05:0.05:0.5",
               "-exportresults","$results\sensitivity_days.csv:csv") | Out-Null
if (Test-Path "$results\sensitivity_days.csv") { Get-Content "$results\sensitivity_days.csv" | Write-Host }

Write-Host "`nRanking stability: SHA-pinned Pmax(compromise) across the same 10x p range (must stay 0)"
Invoke-Prism @("trivy_mdp.prism","trivy.props","-prop","1","-const","rotated=0,shaPin=1,T=30,p=0.05:0.05:0.5",
               "-exportresults","$results\sensitivity_shapin.csv:csv") | Out-Null
if (Test-Path "$results\sensitivity_shapin.csv") { Get-Content "$results\sensitivity_shapin.csv" | Write-Host }

# ---------- 4. multi-stage propagation ----------
Write-Host "`nMulti-stage cascade (p=0.2, q=0.5, r=0.1, N2=5): stage-1 Trivy -> stage-2 npm worm"
foreach ($pr in @(@{n=1;d="P(reach stage 2)"}, @{n=2;d="P(stage 2 within 30d)"}, @{n=3;d="P(full downstream propagation)"}, @{n=4;d="E[hosts compromised at day 30]"})) {
    $o = Invoke-Prism @("trivy_multistage.prism","multistage.props","-prop","$($pr.n)","-const","rotated=0,p=0.2,q=0.5,r=0.1,N2=5,T=30")
    $v = ([regex]::Match($o,'Result:\s+(\S+)')).Groups[1].Value
    Write-Host ("  {0,-34} = {1}" -f $pr.d, $v)
}
$o = Invoke-Prism @("trivy_multistage.prism","multistage.props","-prop","5","-const","rotated=0,p=0.2,q=1,r=0.1,N2=5,T=30")
Write-Host ("  {0,-34} = {1}" -f "E[days to stage 2] (q=1)", ([regex]::Match($o,'Result:\s+(\S+)')).Groups[1].Value)
$o = Invoke-Prism @("trivy_multistage.prism","multistage.props","-prop","1","-const","rotated=1,p=0.2,q=0.5,r=0.1,N2=5,T=30")
Write-Host ("  {0,-34} = {1}" -f "P(reach stage 2) | rotated", ([regex]::Match($o,'Result:\s+(\S+)')).Groups[1].Value)

# ---------- 5. parametric model checking ----------
Write-Host "`nParametric (closed-form functions, not sweeps):"
$o = Invoke-Prism @("trivy_param.prism","param.props","-prop","1","-param","p=0:1","-const","rotated=0,shaPin=0,T=10")
Write-Host ("  E[days-to-compromise](p)    = " + ([regex]::Match($o,'Result:[^\r\n]*')).Value.Replace('Result:','').Trim())
$o = Invoke-Prism @("trivy_multistage.prism","multistage.props","-prop","1","-param","q=0:1","-const","rotated=0,p=0.2,r=0.1,N2=5,T=30")
Write-Host ("  P(reach stage 2)(q)         = " + ([regex]::Match($o,'Result:[^\r\n]*')).Value.Replace('Result:','').Trim())

# ---------- 6. calibration against OSV / Backstabber's data ----------
Write-Host "`nCalibration against OpenSSF malicious-packages (OSV):"
$py = @("C:\Python313\python.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $py) { $py = "python" }
if (Test-Path (Join-Path $PSScriptRoot "_osv_stats.csv")) {
    & $py (Join-Path $PSScriptRoot "calibrate.py") | Select-String "npm_total_reports|mar_2026|feb_to_mar|share_of_all|rate_per_day" | ForEach-Object { Write-Host ("  " + $_.Line.Trim()) }
} else { Write-Host "  (_osv_stats.csv not present; skipping)" }

# persist the main table as markdown
$md = "| Configuration | Pmax(compromise) | E[days] (fastest adversary) | P(compromise <= 30 days) |`n|---|---|---|---|`n"
foreach ($row in $rows) { $md += "| $($row.Configuration) | $($row.'Pmax(compromise)') | $($row.'E[days] (min)') | $($row.'P(<=30 days)') |`n" }
$md | Set-Content -Encoding utf8 (Join-Path $results "layer3_table.md")
Write-Host "`nWrote results\layer3_table.md and results\*.csv" -ForegroundColor Green
