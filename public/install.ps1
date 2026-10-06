# ==============================================================================
# 🤖 REAL AGENT 3D - Windows PowerShell 1-Click Installer
# Usage:
#   irm https://antigravity.google/cli/install.ps1 | iex
# ==============================================================================

Write-Host @"
  ██████╗ ███████╗ █████╗ ██╗         █████╗  ██████╗ ███████╗███╗   ██╗████████╗
  ██╔══██╗██╔════╝██╔══██╗██║        ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝
  ██████╔╝█████╗  ███████║██║  █████╗███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║   
  ██╔══██╗██╔══╝  ██╔══██║██║  ╚════╝██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║   
  ██║  ██║███████╗██║  ██║███████╗   ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║   
  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝   ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   
"@ -ForegroundColor Cyan

Write-Host "`n★ Installing Real Agent 3D CLI & Autonomous Workplace for Windows...`n" -ForegroundColor Green

# 1. Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "Node.js tidak ditemukan! Silakan install Node.js (v18+) dari: https://nodejs.org" -ForegroundColor Red
    exit 1
}

# 2. Setup Dedicated Directories in User Home
$RealAgentHome = Join-Path $HOME ".realagent"
$WorkspacesDir = Join-Path $RealAgentHome "workspaces"
$LogsDir = Join-Path $RealAgentHome "logs"
$Port = 28483

Write-Host "► Membuat folder kerja khusus di: $RealAgentHome" -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path $RealAgentHome | Out-Null
New-Item -ItemType Directory -Force -Path $WorkspacesDir | Out-Null
New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null

# 3. Detect current project folder
$CurrentDir = Get-Location
$ProjectRoot = $CurrentDir
if (-not (Test-Path (Join-Path $ProjectRoot "package.json"))) {
    $ProjectRoot = "C:\Users\sangp\real-agent-3d"
}

Write-Host "► Mengaitkan project root: $ProjectRoot" -ForegroundColor Yellow

# 4. Create Windows CLI Command 'realagent.cmd' in user PATH
$UserBin = Join-Path $HOME ".local\bin"
New-Item -ItemType Directory -Force -Path $UserBin | Out-Null

$CmdContent = @"
@echo off
node "$ProjectRoot\bin\realagent.js" %*
"@
$CmdFile = Join-Path $UserBin "realagent.cmd"
Set-Content -Path $CmdFile -Value $CmdContent -Force

# Add UserBin to PATH if not present
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$UserBin*") {
    [Environment]::SetEnvironmentVariable("Path", "$UserPath;$UserBin", "User")
    $env:Path = "$env:Path;$UserBin"
    Write-Host "► Menambahkan $UserBin ke System PATH pengguna." -ForegroundColor Green
}

# 5. Setup Windows Startup Autorun Shortcut
$StartupFolder = [System.IO.Path]::Combine($env:APPDATA, 'Microsoft\Windows\Start Menu\Programs\Startup')
$StartupBat = Join-Path $StartupFolder "RealAgent3D.bat"
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

Write-Host "`n✓ REAL AGENT 3D Berhasil Terinstall!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Gray
Write-Host "  Dedicated Port:   http://localhost:$Port" -ForegroundColor Cyan
Write-Host "  Workspaces Home:  $WorkspacesDir" -ForegroundColor Cyan
Write-Host "  Perintah CLI:     realagent start / status / workspace" -ForegroundColor Cyan
Write-Host "  Autorun Boot:     AKTIF" -ForegroundColor Green
Write-Host "========================================================`n" -ForegroundColor Gray

# 7. Start server now
Write-Host "Menjalankan Real Agent 3D sekarang..." -ForegroundColor Yellow
node "$ProjectRoot\bin\realagent.js" start
