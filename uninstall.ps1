# ==============================================================================
# CEO VIRTUAL - Uninstaller (Windows PowerShell)
# Repository: https://github.com/asepindrak/ceo-virtual
# Usage:
#   irm https://raw.githubusercontent.com/asepindrak/ceo-virtual/main/uninstall.ps1 | iex
# ==============================================================================

Write-Host "========================================================" -ForegroundColor Yellow
Write-Host "             [!] CEO VIRTUAL UNINSTALLER                " -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Yellow
Write-Host "`nStarting CEO Virtual uninstallation process...`n" -ForegroundColor Cyan

$Port = 28483
$CeoHome = Join-Path $HOME ".ceo-virtual"
$LegacyHome = Join-Path $HOME ".vigent"

# 1. Stop any running server process
Write-Host "> Stopping CEO Virtual server if currently running..." -ForegroundColor Cyan
try {
    $conns = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($conn in $conns) {
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        }
        Write-Host "  [OK] Server process on port $Port stopped successfully." -ForegroundColor Green
    } else {
        Write-Host "  [OK] No active server process found on port $Port." -ForegroundColor Gray
    }
} catch {
    Write-Host "  [OK] Process inspection completed." -ForegroundColor Gray
}

# 2. Remove Windows Startup Autorun Shortcuts
Write-Host "> Removing Windows Startup autorun configuration..." -ForegroundColor Cyan
$StartupFolder = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup"
$BatPath = Join-Path $StartupFolder "CEOVirtual.bat"
$LegacyBat = Join-Path $StartupFolder "Vigent.bat"

if (Test-Path $BatPath) {
    Remove-Item -Path $BatPath -Force -ErrorAction SilentlyContinue
    Write-Host "  [OK] $BatPath removed." -ForegroundColor Green
}
if (Test-Path $LegacyBat) {
    Remove-Item -Path $LegacyBat -Force -ErrorAction SilentlyContinue
    Write-Host "  [OK] $LegacyBat removed." -ForegroundColor Green
}

# 3. Remove CLI Executables from ~/.local/bin (Delayed background delete so CMD wrapper doesn't report 'The batch file cannot be found')
Write-Host "> Scheduling cleanup of CLI wrappers (ceo-virtual & vigent)..." -ForegroundColor Cyan
$UserBin = Join-Path $HOME ".local\bin"
$CeoCmd = Join-Path $UserBin "ceo-virtual.cmd"
$VigentCmd = Join-Path $UserBin "vigent.cmd"

try {
    Start-Process powershell -WindowStyle Hidden -ArgumentList "-NoProfile -Command Start-Sleep -Seconds 3; if (Test-Path '$CeoCmd') { Remove-Item -Path '$CeoCmd' -Force -ErrorAction SilentlyContinue }; if (Test-Path '$VigentCmd') { Remove-Item -Path '$VigentCmd' -Force -ErrorAction SilentlyContinue }"
    Write-Host "  [OK] CLI wrapper (.cmd) scheduled for deletion after execution finishes." -ForegroundColor Green
} catch {
    Write-Host "  [!] Removing wrapper files directly..." -ForegroundColor Gray
    if (Test-Path $CeoCmd) { Remove-Item -Path $CeoCmd -Force -ErrorAction SilentlyContinue }
    if (Test-Path $VigentCmd) { Remove-Item -Path $VigentCmd -Force -ErrorAction SilentlyContinue }
}

# Unlink npm global package if present
try {
    npm unlink -g ceo-virtual vigent --silent 2>$null | Out-Null
    Write-Host "  [OK] Global npm links unlinked." -ForegroundColor Green
} catch {}

# 4. Interactive choice: Delete or Keep Memories & Workspace Cache
Write-Host "`n--------------------------------------------------------" -ForegroundColor Gray
Write-Host "DATA RETENTION & PERSISTENCE CHOICES:" -ForegroundColor Yellow
Write-Host "Data Directory: $CeoHome" -ForegroundColor White
Write-Host "--------------------------------------------------------" -ForegroundColor Gray
Write-Host " [1] 🧹 REMOVE ALL DATA (Clean Reset / Fresh Install)" -ForegroundColor Red
Write-Host "     Deletes wallet/keystore identity, AI memories, regional cache, and project files."
Write-Host "     SELECT THIS if you want a complete reset for a FRESH INSTALL from scratch." -ForegroundColor Gray
Write-Host "`n [2] 🛡️ KEEP DATA (Preserve Memories & Workspaces - Default)" -ForegroundColor Green
Write-Host "     Only removes CLI executables and autorun. Your identities and projects stay safe." -ForegroundColor Gray
Write-Host "--------------------------------------------------------`n" -ForegroundColor Gray

$choice = $null
try {
    $choice = Read-Host "Your choice [1 = Remove All / 2 = Keep Data] (Default: 2)"
} catch {
    $choice = "2"
}

if ($choice -eq '1' -or $choice -match '^(1|y|yes|clean|all|remove|delete)$') {
    Write-Host "`n> [CLEAN UNINSTALL] Removing identity, memories & workspace directories ($CeoHome)..." -ForegroundColor Red
    if (Test-Path $CeoHome) {
        Remove-Item -Path $CeoHome -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  [OK] Directory $CeoHome removed cleanly." -ForegroundColor Green
    }
    if (Test-Path $LegacyHome) {
        Remove-Item -Path $LegacyHome -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  [OK] Directory $LegacyHome removed cleanly." -ForegroundColor Green
    }
    Write-Host "  [OK] All identities and memories wiped. System is ready for a Fresh Install!" -ForegroundColor Green
} else {
    Write-Host "`n> [SAFE OPTION] Wallet identities, memories, & workspaces KEPT at:" -ForegroundColor Green
    Write-Host "  $CeoHome" -ForegroundColor Cyan
    Write-Host "  (If you reinstall in the future, your company identity and projects will be restored automatically)." -ForegroundColor Gray
}

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "[OK] CEO VIRTUAL SUCCESSFULLY UNINSTALLED FROM SYSTEM!" -ForegroundColor Green
Write-Host "========================================================`n" -ForegroundColor Green
