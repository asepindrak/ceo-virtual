# ==============================================================================
# 🤖 VIGENT - Virtual Office Agent (Windows PowerShell 1-Click Installer)
# Repository: https://github.com/asepindrak/vigent
# Usage:
#   irm https://raw.githubusercontent.com/asepindrak/vigent/main/install.ps1 | iex
# ==============================================================================

Write-Host @"
  ██╗   ██╗██╗ ██████╗ ███████╗███╗   ██╗████████╗
  ██║   ██║██║██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝
  ██║   ██║██║██║  ███╗█████╗  ██╔██╗ ██║   ██║   
  ╚██╗ ██╔╝██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   
   ╚████╔╝ ██║╚██████╔╝███████╗██║ ╚████║   ██║   
    ╚═══╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   
"@ -ForegroundColor Cyan

Write-Host "`n★ Installing Vigent (Virtual Office Agent) CLI & Autonomous Workplace...`n" -ForegroundColor Green

# 1. Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js tidak ditemukan! Silakan install Node.js (v18+) dari: https://nodejs.org" -ForegroundColor Red
    exit 1
}

# 2. Setup Dedicated Directories in User Home
$VigentHome = Join-Path $HOME ".vigent"
$WorkspacesDir = Join-Path $VigentHome "workspaces"
$LogsDir = Join-Path $VigentHome "logs"
$RepoUrl = "https://github.com/asepindrak/vigent.git"
$Port = 28483

Write-Host "► Membuat folder kerja khusus Vigent di: $VigentHome" -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $VigentHome | Out-Null
New-Item -ItemType Directory -Force -Path $WorkspacesDir | Out-Null
New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null

# 3. Detect project folder or clone
$CurrentDir = Get-Location
$ProjectRoot = $CurrentDir
if (-not (Test-Path (Join-Path $ProjectRoot "package.json"))) {
    $TargetApp = Join-Path $VigentHome "app"
    if (-not (Test-Path $TargetApp)) {
        Write-Host "► Mengunduh Vigent dari GitHub: $RepoUrl..." -ForegroundColor Cyan
        git clone $RepoUrl $TargetApp
    }
    $ProjectRoot = $TargetApp
}

Write-Host "► Mengaitkan project root: $ProjectRoot" -ForegroundColor Yellow

# 4. Create Windows CLI Command 'vigent.cmd' and 'realagent.cmd' in user PATH
$UserBin = Join-Path $HOME ".local\bin"
New-Item -ItemType Directory -Force -Path $UserBin | Out-Null

$CmdContent = @"
@echo off
node "$ProjectRoot\bin\vigent.js" %*
"@
$CmdFile = Join-Path $UserBin "vigent.cmd"
$OldCmdFile = Join-Path $UserBin "realagent.cmd"
Set-Content -Path $CmdFile -Value $CmdContent -Force
Set-Content -Path $OldCmdFile -Value $CmdContent -Force

# Add UserBin to PATH if not present
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$UserBin*") {
    [Environment]::SetEnvironmentVariable("Path", "$UserPath;$UserBin", "User")
    $env:Path = "$env:Path;$UserBin"
    Write-Host "► Menambahkan $UserBin ke System PATH pengguna." -ForegroundColor Green
}

# 5. Setup Windows Startup Autorun Shortcut
$StartupFolder = [System.IO.Path]::Combine($env:APPDATA, 'Microsoft\Windows\Start Menu\Programs\Startup')
$StartupBat = Join-Path $StartupFolder "Vigent.bat"
$StartupContent = @"
@echo off
cd /d "$ProjectRoot"
start /b npm run dev -- -p $Port
"@
Set-Content -Path $StartupBat -Value $StartupContent -Force
Write-Host "► Autorun saat Windows boot AKTIF di: $StartupBat" -ForegroundColor Green

# 6. Global npm link
Set-Location $ProjectRoot
try {
    npm link --silent
} catch {}

Write-Host "`n✓ VIGENT (Virtual Office Agent) Berhasil Terinstall!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Gray
Write-Host "  Dedicated Port:   http://localhost:$Port" -ForegroundColor Cyan
Write-Host "  Workspaces Home:  $WorkspacesDir" -ForegroundColor Cyan
Write-Host "  Perintah CLI:     vigent start / status / workspace" -ForegroundColor Cyan
Write-Host "  Autorun Boot:     AKTIF" -ForegroundColor Green
Write-Host "  GitHub Repo:      $RepoUrl" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Gray

# 7. Start server now
Write-Host "Menjalankan Vigent sekarang..." -ForegroundColor Yellow
node "$ProjectRoot\bin\vigent.js" start
