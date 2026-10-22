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

# Unlink npm global package if present
try {
    npm unlink -g ceo-virtual vigent --silent 2>$null | Out-Null
    Write-Host "  [OK] Global npm link dilepas." -ForegroundColor Green
} catch {}

# 4. Interactive choice: Delete or Keep Memories & Workspace Cache
Write-Host "`n--------------------------------------------------------" -ForegroundColor Gray
Write-Host "PILIHAN PEMBERSIHAN DATA & KEBERLANJUTAN:" -ForegroundColor Yellow
Write-Host "Folder Data: $CeoHome" -ForegroundColor White
Write-Host "--------------------------------------------------------" -ForegroundColor Gray
Write-Host " [1] 🧹 HAPUS SEMUA DATA (Clean Reset / Fresh Install)" -ForegroundColor Red
Write-Host "     Menghapus identitas wallet/keystore, memori AI, region, dan file proyek."
Write-Host "     PILIH INI jika Anda ingin reset total & mencoba FRESH INSTALL dari nol." -ForegroundColor Gray
Write-Host "`n [2] 🛡️ SIMPAN DATA (Keep Memories & Workspaces - Default)" -ForegroundColor Green
Write-Host "     Hanya mencopot executable CLI & autorun. Identitas dan proyek tetap aman." -ForegroundColor Gray
Write-Host "--------------------------------------------------------`n" -ForegroundColor Gray

$choice = $null
try {
    $choice = Read-Host "Pilihan Anda [1 = Hapus Semua / 2 = Simpan Data] (Default: 2)"
} catch {
    $choice = "2"
}

if ($choice -eq '1' -or $choice -match '^(1|y|ya|yes|clean|all|hapus)$') {
    Write-Host "`n> [CLEAN UNINSTALL] Menghapus folder identitas, memori & workspace ($CeoHome)..." -ForegroundColor Red
    if (Test-Path $CeoHome) {
        Remove-Item -Path $CeoHome -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  [OK] Folder $CeoHome berhasil dihapus bersih." -ForegroundColor Green
    }
    if (Test-Path $LegacyHome) {
        Remove-Item -Path $LegacyHome -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "  [OK] Folder $LegacyHome berhasil dihapus bersih." -ForegroundColor Green
    }
    Write-Host "  [OK] Semua identitas dan memori dibersihkan. Sistem siap untuk Fresh Install!" -ForegroundColor Green
} else {
    Write-Host "`n> [AMBIL OPSI AMAN] Identitas wallet, memori, & workspace TETAP DISIMPAN di:" -ForegroundColor Green
    Write-Host "  $CeoHome" -ForegroundColor Cyan
    Write-Host "  (Jika Anda menginstall kembali, identitas dan data kantor Anda akan langsung terbaca)." -ForegroundColor Gray
}

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "[OK] CEO VIRTUAL BERHASIL DI-UNINSTALL DARI SISTEM!" -ForegroundColor Green
Write-Host "========================================================`n" -ForegroundColor Green
