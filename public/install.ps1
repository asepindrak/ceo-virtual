# ==============================================================================
# CEO VIRTUAL - Autonomous Workplace (Windows PowerShell 1-Click Installer)
# Repository: https://github.com/asepindrak/ceo-virtual
# Usage:
#   irm https://raw.githubusercontent.com/asepindrak/ceo-virtual/main/install.ps1 | iex
# ==============================================================================

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "              👑 CEO VIRTUAL AUTONOMOUS WORKPLACE        " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "`n* Installing CEO Virtual CLI and Dashboard...`n" -ForegroundColor Green

# 1. Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js tidak ditemukan! Silakan install Node.js (v18+) dari: https://nodejs.org" -ForegroundColor Red
    exit 1
}

# 2. Setup Dedicated Directories in User Home
$CeoHome = Join-Path $HOME ".ceo-virtual"
$LegacyHome = Join-Path $HOME ".vigent"

# Auto-migrate from ~/.vigent if present
if ((Test-Path $LegacyHome) -and -not (Test-Path $CeoHome)) {
    Write-Host "> Migrasi data dari ~/.vigent ke ~/.ceo-virtual..." -ForegroundColor Cyan
    Copy-Item -Path $LegacyHome -Destination $CeoHome -Recurse -Force
}

$WorkspacesDir = Join-Path $CeoHome "workspaces"
$LogsDir = Join-Path $CeoHome "logs"
$RepoUrl = "https://github.com/asepindrak/ceo-virtual.git"
$Port = 28483

Write-Host "> Menyiapkan folder kerja di: $CeoHome" -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $CeoHome | Out-Null
New-Item -ItemType Directory -Force -Path $WorkspacesDir | Out-Null
New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null

# 3. Detect existing project folder or clone
$PossibleRoots = @(
    (Get-Location).Path,
    (Join-Path $HOME "ceo-virtual"),
    (Join-Path $HOME "vigent"),
    (Join-Path $CeoHome "app")
)

$ProjectRoot = $null
foreach ($cand in $PossibleRoots) {
    if ((Test-Path (Join-Path $cand "package.json")) -and ((Get-Content (Join-Path $cand "package.json") -Raw) -match 'ceo-virtual|vigent')) {
        $ProjectRoot = $cand
        break
    }
}

if (-not $ProjectRoot) {
    $TargetApp = Join-Path $CeoHome "app"
    if (-not (Test-Path $TargetApp)) {
        Write-Host "> Mengunduh CEO Virtual dari GitHub: $RepoUrl..." -ForegroundColor Cyan
        git clone $RepoUrl $TargetApp
    }
    $ProjectRoot = $TargetApp
}

Write-Host "> Mengaitkan project root: $ProjectRoot" -ForegroundColor Yellow

# Ensure node_modules exists
if (-not (Test-Path (Join-Path $ProjectRoot "node_modules"))) {
    Write-Host "> Menginstall dependensi proyek (npm install)..." -ForegroundColor Cyan
    Push-Location $ProjectRoot
    npm install
    Pop-Location
}

# 4. Create Windows CLI Command ceo-virtual.cmd and vigent.cmd in user PATH
$UserBin = Join-Path $HOME ".local\bin"
New-Item -ItemType Directory -Force -Path $UserBin | Out-Null

$CmdContent = "@echo off`r`nnode `"$ProjectRoot\bin\ceo-virtual.js`" %*"
$CeoCmdFile = Join-Path $UserBin "ceo-virtual.cmd"
$CmdFile = Join-Path $UserBin "vigent.cmd"
Set-Content -Path $CeoCmdFile -Value $CmdContent -Force
Set-Content -Path $CmdFile -Value $CmdContent -Force

# Add UserBin to PATH if not present
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$UserBin*") {
    [Environment]::SetEnvironmentVariable("Path", "$UserPath;$UserBin", "User")
    $env:Path = "$env:Path;$UserBin"
    Write-Host "> Menambahkan $UserBin ke System PATH pengguna." -ForegroundColor Green
}

# 5. Setup Windows Startup Autorun Shortcut
$StartupFolder = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Startup"
$StartupBat = Join-Path $StartupFolder "CEOVirtual.bat"
$StartupContent = "@echo off`r`ncd /d `"$ProjectRoot`"`r`nstart /b npm run dev -- -p $Port"
Set-Content -Path $StartupBat -Value $StartupContent -Force
Write-Host "> Autorun saat Windows boot AKTIF di: $StartupBat" -ForegroundColor Green

# 6. Global npm link
Push-Location $ProjectRoot
try {
    npm link --silent
} catch {}
Pop-Location

# 7. Initialize Company Memory Engine & Vector DB
Write-Host "> Inisialisasi Company Memory Engine & Zero-Setup Vector DB..." -ForegroundColor Cyan
node "$ProjectRoot\bin\ceo-virtual.js" memory init

Write-Host "`n[OK] CEO VIRTUAL Berhasil Terinstall!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Gray
Write-Host "  Dedicated Port:   http://localhost:$Port" -ForegroundColor Cyan
Write-Host "  Workspaces Home:  $WorkspacesDir" -ForegroundColor Cyan
Write-Host "  Vector Memory:    Zero-Setup Dual Mode (Local + Custom LLM)" -ForegroundColor Green
Write-Host "  Perintah CLI:     ceo-virtual start (atau vigent start)" -ForegroundColor Cyan
Write-Host "  Autorun Boot:     AKTIF" -ForegroundColor Green
Write-Host "  GitHub Repo:      $RepoUrl" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Gray

# 8. Start server now
Write-Host "Menjalankan CEO Virtual sekarang..." -ForegroundColor Yellow
node "$ProjectRoot\bin\ceo-virtual.js" start
