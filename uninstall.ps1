# ==============================================================================
# CEO VIRTUAL - Uninstaller (Windows PowerShell)
# Repository: https://github.com/asepindrak/ceo-virtual
# Usage:
#   irm https://raw.githubusercontent.com/asepindrak/ceo-virtual/main/uninstall.ps1 | iex
# ==============================================================================

Write-Host "========================================================" -ForegroundColor Yellow
Write-Host "             [!] CEO VIRTUAL UNINSTALLER                " -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Yellow
Write-Host "`nMemulai proses uninstall CEO Virtual...`n" -ForegroundColor Cyan

$Port = 28483
$CeoHome = Join-Path $HOME ".ceo-virtual"
$LegacyHome = Join-Path $HOME ".vigent"

# 1. Stop any running server process
Write-Host "> Menghentikan server CEO Virtual jika sedang aktif..." -ForegroundColor Cyan
try {
    $conns = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($conn in $conns) {
            Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
        }
        Write-Host "  [OK] Proses server pada port $Port berhasil dihentikan." -ForegroundColor Green
    } else {
        Write-Host "  [OK] Tidak ada server yang sedang berjalan pada port $Port." -ForegroundColor Gray
    }
} catch {
    Write-Host "  [OK] Pemeriksaan proses selesai." -ForegroundColor Gray
}

# 2. Remove Windows Startup Autorun Shortcuts
Write-Host "> Menghapus konfigurasi autorun Windows Startup..." -ForegroundColor Cyan
$StartupFolder = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup"
$BatPath = Join-Path $StartupFolder "CEOVirtual.bat"
$LegacyBat = Join-Path $StartupFolder "Vigent.bat"

if (Test-Path $BatPath) {
    Remove-Item -Path $BatPath -Force -ErrorAction SilentlyContinue
    Write-Host "  [OK] $BatPath dihapus." -ForegroundColor Green
}
if (Test-Path $LegacyBat) {
    Remove-Item -Path $LegacyBat -Force -ErrorAction SilentlyContinue
    Write-Host "  [OK] $LegacyBat dihapus." -ForegroundColor Green
}

# 3. Remove CLI Executables from ~/.local/bin
Write-Host "> Menghapus perintah CLI (ceo-virtual & vigent)..." -ForegroundColor Cyan
$UserBin = Join-Path $HOME ".local\bin"
$CeoCmd = Join-Path $UserBin "ceo-virtual.cmd"
$VigentCmd = Join-Path $UserBin "vigent.cmd"

if (Test-Path $CeoCmd) {
    Remove-Item -Path $CeoCmd -Force -ErrorAction SilentlyContinue
    Write-Host "  [OK] $CeoCmd dihapus." -ForegroundColor Green
}
if (Test-Path $VigentCmd) {
    Remove-Item -Path $VigentCmd -Force -ErrorAction SilentlyContinue
    Write-Host "  [OK] $VigentCmd dihapus." -ForegroundColor Green
}

# 4. Interactive choice: Delete or Keep Memories & Workspace Cache
Write-Host "`n--------------------------------------------------------" -ForegroundColor Gray
Write-Host "PILIHAN PEMBERSIHAN DATA & MEMORI" -ForegroundColor Yellow
Write-Host "Folder: $CeoHome" -ForegroundColor White
Write-Host "Folder ini berisi: memori AI perusahaan, obrolan chat, dan file proyek di workspaces/." -ForegroundColor Gray
Write-Host "--------------------------------------------------------`n" -ForegroundColor Gray

$deleteData = Read-Host "Apakah Anda ingin MENGHAPUS seluruh memori, cache & file workspace? [y/N]"

if ($deleteData -match '^(y|ya|yes)$') {
    Write-Host "> Menghapus folder memori & workspace ($CeoHome)..." -ForegroundColor Red
    if (Test-Path $CeoHome) {
        Remove-Item -Path $CeoHome -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  [OK] Folder $CeoHome berhasil dihapus bersih." -ForegroundColor Green
    }
    if (Test-Path $LegacyHome) {
        Remove-Item -Path $LegacyHome -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  [OK] Folder $LegacyHome berhasil dihapus." -ForegroundColor Green
    }
} else {
    Write-Host "> [AMBIL OPSI AMAN] Memori & folder workspace TETAP DISIMPAN di:" -ForegroundColor Green
    Write-Host "  $CeoHome" -ForegroundColor Cyan
    Write-Host "  (Jika Anda menginstall kembali di kemudian hari, data perusahaan Anda akan langsung terbaca)." -ForegroundColor Gray
}

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "[OK] CEO VIRTUAL BERHASIL DI-UNINSTALL DARI SISTEM!" -ForegroundColor Green
Write-Host "========================================================`n" -ForegroundColor Green
