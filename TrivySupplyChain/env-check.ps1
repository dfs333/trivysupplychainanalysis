<#
  env-check.ps1 - one-shot environment doctor for the QQT / Trivy project.

  Verifies (read-only; changes nothing) that the toolchain the run scripts
  depend on is healthy, and reports the known-good workarounds for this host.

  Usage:  powershell -File .\env-check.ps1
#>
$ErrorActionPreference = "Continue"
$ok = $true
function Check($name, $cond, $detail) {
    if (-not $cond) { $script:ok = $false }
    Write-Host ("[{0}] {1,-20} {2}" -f ($(if ($cond) { "OK  " } else { "FAIL" })), $name, $detail) `
        -ForegroundColor $(if ($cond) { "Green" } else { "Red" })
}

# --- Java (scripts use JAVA_HOME; bare `java` is a broken Oracle stub here) ---
$java = @(
    $(if ($env:JAVA_HOME) { Join-Path $env:JAVA_HOME "bin\java.exe" }),
    "C:\Program Files\Java\jdk-20\bin\java.exe"
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
$jver = if ($java) { (& $java -version 2>&1 | Select-Object -First 1) } else { "" }
Check "Java (via JAVA_HOME)" ($java -and $jver -match "version") $java
$bare = (Get-Command java -ErrorAction SilentlyContinue).Source
if ($bare -like "*Common Files*javapath*") {
    Write-Host "     note: bare 'java' resolves to the broken Oracle javapath stub;" -ForegroundColor Yellow
    Write-Host "           the run scripts deliberately use JAVA_HOME instead (fixing" -ForegroundColor Yellow
    Write-Host "           the stub globally would need an admin system-PATH edit)." -ForegroundColor Yellow
}

# --- TLA+ / TLC ---
Check "TLA+ tools jar" (Test-Path "$PSScriptRoot\tools\tla2tools.jar") "tools\tla2tools.jar"

# --- PRISM + its native CUDD DLL dependencies ---
Check "PRISM jar" (Test-Path "$PSScriptRoot\layer3\prism\lib\prism.jar") "layer3\prism\lib\prism.jar"
$mingw = @("C:\Program Files\Git\mingw64\bin", "C:\Program Files (x86)\Git\mingw64\bin") |
    Where-Object { Test-Path (Join-Path $_ "libwinpthread-1.dll") } | Select-Object -First 1
Check "PRISM native DLLs" ([bool]$mingw) $(if ($mingw) { "MinGW runtime: $mingw" } else { "MISSING - install Git for Windows for the CUDD DLLs" })

# --- Python / Node (docx + analyzers) ---
$py = @("C:\Python313\python.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $py) { $py = (Get-Command python -ErrorAction SilentlyContinue).Source }
Check "Python" ([bool]$py) $py
$node = (Get-Command node -ErrorAction SilentlyContinue).Source
Check "Node.js" ([bool]$node) $node

# --- execution policy (Bypass is NOT needed here) ---
$cu = (Get-ExecutionPolicy -Scope CurrentUser)
Check "Execution policy" ($cu -in @("RemoteSigned", "Unrestricted", "Bypass")) "CurrentUser=$cu (scripts run without -ExecutionPolicy Bypass)"

Write-Host ""
if ($ok) {
    Write-Host "ENVIRONMENT OK - run-all.ps1 / run-layer1.ps1 / run-layer3.ps1 should all work." -ForegroundColor Green
    exit 0
} else {
    Write-Host "ENVIRONMENT HAS ISSUES - see FAIL lines above." -ForegroundColor Red
    exit 1
}
