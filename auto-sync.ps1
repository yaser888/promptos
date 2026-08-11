# Auto-sync watcher: commits and pushes any project change to GitHub automatically.
# Started in background: Start-Process powershell -WindowStyle Hidden -ArgumentList "-File", "auto-sync.ps1"
# Stop it anytime (e.g. to commit manually): Get-Process powershell | Where-Object { $_.StartTime -gt (Get-Date).AddDays(1) } — or use taskkill /FI "WINDOWTITLE eq auto-sync*"
# Note: .env* and *.log files are gitignored, so real secrets are never pushed.

$ErrorActionPreference = "SilentlyContinue"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

while ($true) {
    Start-Sleep -Seconds 20
    git add -A 2>$null
    $staged = git diff --cached --name-only 2>$null
    if (-not $staged) { continue }

    $summary = ($staged | Select-Object -First 5) -join ", "
    $message = "Auto-sync: $summary"
    if ($staged.Count -gt 5) { $message += " (+$($staged.Count - 5) more)" }

    git commit -q -m $message 2>$null
    if ($LASTEXITCODE -eq 0) {
        git push -q origin HEAD 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[auto-sync] pushed at $(Get-Date -Format 'HH:mm:ss') — $summary"
        } else {
            Write-Host "[auto-sync] commit done, PUSH FAILED (offline?) — will retry internally on next change"
        }
    }
}