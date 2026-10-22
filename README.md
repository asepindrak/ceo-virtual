# 👑 CEO Virtual - Autonomous Multi-Agent Virtual Workplace

<p align="center">
  <b>Autonomous Multi-Agent Virtual Workplace Simulation with Peer-to-Peer Node Architecture, Web3 Cryptographic Identity, Telegram Bot Orchestration, & Real On-Disk Code Generation</b><br>
  <i>CEO Virtual — Autonomous Multi-Agent Workplace & Decentralized Virtual Company Management</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-green.svg" alt="Node" />
  <img src="https://img.shields.io/badge/Next.js-16+-black.svg" alt="Next.js" />
  <img src="https://img.shields.io/badge/Architecture-P2P%20Node--to--Node-purple.svg" alt="P2P" />
  <img src="https://img.shields.io/badge/Identity-BIP--39%20Mnemonic-blue.svg" alt="BIP-39" />
  <img src="https://img.shields.io/badge/Three.js-3D%20%26%202.5D-orange.svg" alt="Three.js" />
  <img src="https://img.shields.io/badge/Telegram-Bot%20War%20Room-blue.svg" alt="Telegram" />
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License" />
</p>

---

## ⚡ 1-Click Quick Installation

Install and launch CEO Virtual in a single command directly from GitHub:

### **Windows (PowerShell)**
```powershell
irm https://raw.githubusercontent.com/asepindrak/ceo-virtual/main/install.ps1 | iex
```

### **Linux / macOS / WSL**
```bash
curl -fsSL https://raw.githubusercontent.com/asepindrak/ceo-virtual/main/install.sh | bash
```

> 💡 **Interactive Autorun Prompt**: During installation, the script will ask if you want to enable *Autorun at Startup* `[Y/n]` automatically.

---

## 🚀 First-Time Setup (Web-First Interactive Onboarding)

Once installation finishes, the server starts on dedicated port **`:28483`** and **automatically opens your browser** to `http://localhost:28483`.

```text
+---------------------------------------------------------------------------------+
|                         👑 CEO VIRTUAL INITIALIZATION                           |
|               Autonomous Multi-Agent Workplace on Decentralized P2P             |
+---------------------------------------------------------------------------------+
|   [ 🚀 Create New Company ]                    [ 🔄 Restore Company ]           |
|   (Create New Company & Wallet)                (Restore from Backup File)       |
+---------------------------------------------------------------------------------+
```

### 1. 🔑 Cryptographic Identity & Backup Codes
* **BIP-39 Mnemonic Seed Phrase (12 Secret Words)**: Deterministically generated with a public owner address (`0x...`).
* **📋 Copy to Clipboard**: Copy all 12 words with 1-click notification feedback.
* **📥 Download Backup File (`.txt`)**: Downloads `ceo-virtual-backup-<company-name>.txt` containing node address, 12 secret recovery words, and security guidelines.
* **🔄 Restore Company**: When moving PCs or reinstalling, simply **Drag & Drop / Upload your `.txt` backup file** or paste your 12 recovery words.

### 2. 🌐 Regional Shard Selection & Dynamic Auto-Sharding
* **📍 Automatic GPS Location Detection**: Uses browser Geolocation API (`navigator.geolocation`) and IP fallback to calculate physical distance (Haversine formula in km) to each shard region. The closest shard (e.g., *Jakarta ~14 km*) is recommended and selected by default.
* Select the lowest-latency regional cluster for real-time P2P sync:
  * 🇮🇩 `apac-jakarta-1` (12ms ping - Optimal)
  * 🇸🇬 `apac-singapore-1` (28ms ping - High Load)
  * 🇯🇵 `apac-tokyo-1` (74ms ping)
  * 🇩🇪 `eu-frankfurt-1` (165ms ping)
  * 🇺🇸 `us-east-1` (188ms ping)
* **Dynamic Auto-Sharding Protocol**: When a region reaches $\ge 90\%$ capacity, the consensus protocol auto-spawns a new shard (e.g., **`APAC Jakarta Shard-2 (Auto-Spawned)`**) to maintain network performance.

### 3. 🤖 AI Company Generator, Global LLM Provider & Genesis Block
* **✨ AI Company Generator (Auto Team & Initial Backlog)**:
  * Describe your business idea (e.g., *B2B SaaS Culinary POS System*). The AI automatically creates the company profile, office layout, departments, initial employee roster (roles, skills, and diverse MBTI personalities), plus initial sprint backlog tickets at desks.
* **🌐 Global Enterprise LLM Setup (Universal Auto-Inherit)**:
  * The LLM provider configured during onboarding (**Groq, Google Gemini, DeepSeek, OpenAI, Anthropic, or Local Ollama**) becomes the company's **Global LLM Provider**. All agents automatically inherit this configuration for ticket execution, office dialogue, and live coding.
* **🛠️ Clean Start / Marketplace Option (No API Key Required)**:
  * If you do not have an LLM API key yet, choose the clean start option. The office begins completely free of dummy data (**vacant lot**). You can add team members manually or hire agents from the **P2P Marketplace** at any time.
* **⚡ Startup Autorun & Nearby Office**:
  * Checkbox option to enable background autorun on system boot. GPS coordinates are saved for the *Nearby Office* mesh feature.
* Signs the cryptographic **Genesis Block** and saves credentials locally to `~/.ceo-virtual/keystore.json`.

---

## 💻 CEO Virtual CLI (`ceo-virtual`)

Manage your virtual workplace directly from your terminal:

```bash
# Start CEO Virtual on port 28483 & auto-open browser
ceo-virtual start

# Check server status, PID, port, and autorun state
ceo-virtual status

# Stop running server
ceo-virtual stop

# Open workspaces folder in File Explorer / Finder
ceo-virtual workspace

# Enable auto-start on computer boot
ceo-virtual autorun enable

# Disable auto-start
ceo-virtual autorun disable

# Uninstall CEO Virtual (interactive prompt to keep or wipe memories)
ceo-virtual uninstall

# Scaffold a new project directory in workspaces
ceo-virtual create <project-name>

# Clone a GitHub repository directly into workspace
ceo-virtual clone <github-url> [folder-name]
```

*(Note: `vigent` remains supported as an alias command for backward compatibility)*

---

## 🌟 Core Features

### 1. 🛡️ Node-to-Node P2P Blockchain & Proof-of-Ownership
- Cryptographic proof of ownership via asymmetric key signatures.
- Zero dependency on centralized cloud databases (*zero single point of failure*).
- Crucial actions are signed by the *Owner Address* and logged in a local append-only hashed event ledger (`prevHash -> hash`).

### 2. 🏢 Multi-Company & Autonomous Leader System
- Manage multiple virtual companies and startup offices.
- **Dynamic Leader Detection & Manual Override**:
  - Automatically identifies team leads based on title hierarchy (*Founder, Lead Architect, CEO, Director, Project Manager*).
  - The Boss can reassign the Primary Leader at any time via 1-click **"👑 Set as Leader"** in the agent inspector.

### 3. 📱 Isolated Telegram Bot War Room (Bi-Directional Sync)
- Each company can connect an isolated Telegram Bot token and Chat ID.
- **Specific Agent Mentions**: Tag team members with `@Kenji`, `@Rei`, `@Damian`, `@Yuki`, or `@all`.
- **Autonomous Sprint Delegation**: When the Boss issues project directives, the Leader breaks them into sub-tasks for team members (Frontend, Backend, QA).
- **Milestone Progress Reports**: Agents report progress (50% and 100% completion) directly to the Telegram group or War Room chat.

### 4. ☕ Autonomous Daily Standup Conference
- Agents gather around the Conference Room table for scheduled daily standups.
- Each member presents what they achieved yesterday, today's sprint goal, and blockers.
- Meeting minutes are summarized and forwarded to the War Room & Telegram.

### 5. 🎨 Dual Engine Viewport (2.5D Isometric & 3D Three.js)
- **2.5D Isometric Engine**: Instant 60 FPS rendering, ultra-lightweight, and battery-friendly.
- **3D WebGL Three.js Canvas**: Full 3D workplace visualization with orbital camera controls, dynamic lighting, and interactive stations.

### 6. 📁 Real On-Disk Code Generation (`~/.ceo-virtual/workspaces`)
- Coding tasks generate tangible, working source code files in isolated directories:
  - `package.json`
  - `src/index.js`
  - `TASK_SUMMARY.md`
  - Ready-to-deploy setups with live preview support.

### 7. 🤖 Flexible Multi-LLM Support (Global & BYOK)
- Apply models globally across all agents or customize individually per role.
- Compatible with all major AI providers:
  - **OpenAI** (`gpt-4o`, `gpt-4o-mini`, etc.)
  - **Anthropic Claude** (`claude-3-5-sonnet`, etc.)
  - **Google Gemini** (`gemini-1.5-pro`, `gemini-2.0-flash`)
  - **Groq & DeepSeek** (Ultra-fast inference)
  - **Local Ollama / Custom Endpoints**

### 8. 🎵 Retro Winamp Player & Office Audio
- Classic Winamp-style floating audio player integrated with YouTube Music API.
- Ambient office music controllable via the UI or remote bot commands.

### 9. 📍 Spatial P2P & "Nearby Office" Ecosystem
- **Automatic Geolocation Detection**: Determines GPS or IP location to route your office node to the lowest-latency regional shard.
- **Nearby Business Clusters**: Nodes in the same metropolitan area can discover one another for inter-company B2B visits, collaboration, and task sharing.
- **Privacy Preserving**: Coordinates are rounded (*coarse geohash*) to city/district level to keep user locations 100% private.

---

## 🛠️ Manual Development Setup

To run from source or contribute:

```bash
# 1. Clone repository
git clone https://github.com/asepindrak/ceo-virtual.git
cd ceo-virtual

# 2. Install dependencies
npm install

# 3. Start development server on port 28483
npm run dev

# Or launch via CLI
node ./bin/ceo-virtual.js start
```

Open your browser at: **http://localhost:28483**

---

## 📁 Directory & Workspace Structure

```text
~/.ceo-virtual/
├── keystore.json        # P2P node identity, owner address, & Genesis signature
├── regions.json         # Regional shard configuration & auto-spawned clusters
├── config.json          # Port configuration, autorun, and server preferences
├── server.pid           # Active background process PID
├── workspaces/          # Real project files generated by agents
│   ├── my-first-project/
│   └── ...
├── telegram_<id>.json   # Per-company Telegram bot configuration
└── chat_<id>.json       # War Room chat history
```

---

## 🗑️ Uninstallation

To remove CEO Virtual from your system, use the 1-click uninstaller. It automatically terminates active processes, removes startup autorun entries, removes CLI executables, and **offers an interactive choice to keep or wipe memories and workspace files**:

### **Windows (PowerShell)**
```powershell
irm https://raw.githubusercontent.com/asepindrak/ceo-virtual/main/uninstall.ps1 | iex
```

### **Linux / macOS / WSL**
```bash
curl -fsSL https://raw.githubusercontent.com/asepindrak/ceo-virtual/main/uninstall.sh | bash
```

### **Via CLI**
If the `ceo-virtual` CLI is installed on your computer:
```bash
ceo-virtual uninstall
```

#### 🛡️ Data Retention Options:
During uninstall, you will be prompted:
> `Do you want to REMOVE all memories, cache & workspace files? [y/N]:`

* **Choose `N` (or press Enter):** *(Recommended)* Removes the application and autorun, but **preserves** your P2P keystore, AI memories, team chat logs, and project files in `~/.ceo-virtual/workspaces`. If you reinstall later, your company identity and projects will be recognized immediately.
* **Choose `y`:** Completely and permanently deletes the `~/.ceo-virtual` directory and all cached data.

---

## 📄 License
Distributed under the **MIT License**. Free to use, modify, and distribute for personal and commercial purposes.
