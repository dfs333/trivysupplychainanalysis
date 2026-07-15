<#
  run-layer1.ps1 - Layer 1 structural-faithfulness corpus analysis.

  1. Runs the analyzer unit tests against the synthetic fixtures (known answers).
  2. If ./corpus is empty, fetches a real sample corpus from public repos.
  3. Runs the analyzer over the corpus and writes results/corpus_report.{json,md}.

  Usage:  powershell -ExecutionPolicy Bypass -File .\run-layer1.ps1 [-Fetch]
#>
param([switch]$Fetch)

$ErrorActionPreference = "Continue"
Set-Location -Path $PSScriptRoot

$py = @("C:\Python313\python.exe", "C:\Program Files\Python313\python.exe") |
        Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $py) { $py = "python" }
Write-Host "Using Python: $py`n"

Write-Host "== 1. Unit tests (extractor correctness on synthetic fixtures) =="
& $py test_corpus_analysis.py
if ($LASTEXITCODE -ne 0) { Write-Host "UNIT TESTS FAILED" -ForegroundColor Red; exit 1 }

$corpus = Join-Path $PSScriptRoot "corpus"
$empty = -not (Test-Path $corpus) -or ((Get-ChildItem $corpus -Filter *.y*ml -ErrorAction SilentlyContinue).Count -eq 0)
if ($Fetch -or $empty) {
    Write-Host "`n== 2. Fetching real corpus from public repos =="
    & $py fetch_corpus.py --cap-per-repo 12
} else {
    $cnt = (Get-ChildItem $corpus -Filter *.y*ml).Count
    Write-Host "`n== 2. Using existing corpus ($cnt files) =="
}

Write-Host "`n== 3. Analyzing corpus =="
& $py corpus_analysis.py corpus --json results/corpus_report.json --md results/corpus_report.md
Write-Host "`nWrote results/corpus_report.json and results/corpus_report.md" -ForegroundColor Green
