# 👑 CEO Virtual - Autonomous Multi-Agent Virtual Workplace

<p align="center">
  <b>Simulasi Kantor Virtual Multi-Agent Otonom dengan CLI, Orkestrasi Telegram Bot, & Generator Kode Nyata di Disk</b><br>
  <i>CEO Virtual — Autonomous Multi-Agent Workplace & Virtual Company Management</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-green.svg" alt="Node" />
  <img src="https://img.shields.io/badge/Next.js-16+-black.svg" alt="Next.js" />
  <img src="https://img.shields.io/badge/Three.js-3D%20%26%202.5D-orange.svg" alt="Three.js" />
  <img src="https://img.shields.io/badge/Telegram-Bot%20War%20Room-blue.svg" alt="Telegram" />
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License" />
</p>

---

## ⚡ 1-Click Quick Installation

Install dan jalankan CEO Virtual dalam 1 baris perintah langsung dari GitHub:

### **Windows (PowerShell)**
```powershell
irm https://raw.githubusercontent.com/asepindrak/ceo-virtual/main/install.ps1 | iex
```

### **Linux / macOS / WSL**
```bash
curl -fsSL https://raw.githubusercontent.com/asepindrak/ceo-virtual/main/install.sh | bash
```

---

## 💻 CEO Virtual CLI (`ceo-virtual`)

Setelah diinstall, Anda dapat mengontrol kantor virtual langsung dari terminal favorit Anda:

```bash
# Menjalankan CEO Virtual pada port 28483 & otomatis membuka browser
ceo-virtual start

# Cek status server, PID, port, dan jumlah project di disk
ceo-virtual status

# Hentikan server yang sedang berjalan
ceo-virtual stop

# Langsung buka folder workspace di File Explorer / Finder
ceo-virtual workspace

# Aktifkan autorun otomatis saat komputer dinyalakan (boot)
ceo-virtual autorun enable

# Non-aktifkan autorun
ceo-virtual autorun disable

# Uninstall CEO Virtual (lengkap dengan pilihan hapus/simpan memori)
ceo-virtual uninstall

# Buat folder proyek baru langsung via CLI
ceo-virtual create <nama-proyek>

# Clone repository GitHub langsung ke workspace kantor
ceo-virtual clone <url-github> [nama-folder]
```

*(Catatan: Perintah `vigent` tetap didukung sebagai alias perintah CLI untuk kompatibilitas)*

---

## 🌟 Fitur Unggulan

### 1. 🏢 Multi-Company & Autonomous Leader System
- Kelola berbagai perusahaan (preset startup seperti *ShadowMove*, studio agensi, atau perusahaan baru yang di-generate menggunakan AI).
- **Penentuan Leader Otomatis & Manual**:
  - Secara otomatis mendeteksi leader tim berdasarkan hierarki jabatan (*Founder, Lead Architect, CEO, Director, Project Manager*).
  - Pimpinan (Boss) dapat mengubah Leader Utama kapan saja cukup dengan 1 klik tombol **"👑 Set Jadi Leader"** di profil agen.

### 2. 📱 Telegram Bot War Room Terisolasi (Bi-Directional Sync)
- Setiap perusahaan dapat memiliki token Telegram Bot dan Chat ID terisolasi.
- **Tagging Karyawan Spesifik**: Panggil karyawan dengan `@Kenji`, `@Rei`, `@Damian`, `@Yuki`, atau `@all`.
- **Delegasi Sprint Otomatis**: Saat Boss memberikan instruksi proyek, Leader akan otomatis memecah arahan menjadi sub-task spesifik bagi tiap anggota tim (Frontend, Backend, Arsitektur).
- **Laporan Berkala Otonom**: Tim melaporkan progres pengerjaan (50% & 100% milestone) langsung ke grup Telegram Boss atau ruang War Room kantor.

### 3. 🎨 Dual Engine Viewport (2.5D Isometric & 3D Three.js)
- **2.5D Isometric Engine**: Rendering instan 60 FPS, ultra-ringan, stabil, dan ramah baterai laptop.
- **3D WebGL Three.js Canvas**: Visualisasi 3D kantor penuh dengan kontrol kamera orbital, pencahayaan dinamis, stasiun kereta, dan visual interaktif.

### 4. 📁 Real Disk Code Generation (`~/.ceo-virtual/workspaces`)
- Setiap task koding yang diselesaikan agen benar-benar menghasilkan file kode sumber nyata di direktori terisolasi:
  - `package.json`
  - `src/index.js`
  - `TASK_SUMMARY.md`
  - Konfigurasi siap deploy dan live preview.

### 5. 🤖 Dukungan Multi-LLM Fleksibel (Global & BYOK)
- Terapkan LLM secara global untuk seluruh agen dalam satu kantor atau atur konfigurasi individual per agen.
- Kompatibel dengan berbagai provider AI:
  - **OpenAI** (`gpt-4o`, `gpt-4o-mini`, dll.)
  - **Anthropic Claude** (`claude-3-5-sonnet`, dll.)
  - **Google Gemini** (`gemini-1.5-pro`, `gemini-2.0-flash`)
  - **Groq & DeepSeek** (Ultra-fast inference)
  - **Local Ollama / Custom Endpoint**

### 6. 🌐 P2P Mesh Network & MCP Skills Hub
- Hubungkan kantor virtual Anda dengan rekan kerja lintas jaringan lokal (LAN UDP) maupun global (Dokploy Signaling Relay).
- Integrasi keahlian khusus melalui **Model Context Protocol (MCP)** dan Role-based SOP Skills.

---

## 🛠️ Menjalankan Secara Manual (Development)

Jika ingin berkontribusi atau menjalankan dari source code:

```bash
# 1. Clone repository
git clone https://github.com/asepindrak/ceo-virtual.git
cd ceo-virtual

# 2. Install dependensi
npm install

# 3. Jalankan development server pada port 28483
npm run dev

# Atau jalankan via CLI
node ./bin/ceo-virtual.js start
```

Buka browser di: **http://localhost:28483**

---

## 📁 Struktur Direktori & Workspaces

```text
~/.ceo-virtual/
├── config.json          # Konfigurasi port, autorun, dan server
├── server.pid           # PID background process
├── workspaces/          # Direktori proyek nyata yang di-generate agen
│   ├── shadowmove/
│   └── ...
├── telegram_<id>.json   # Pengaturan bot telegram per perusahaan
└── chat_<id>.json       # Riwayat obrolan War Room
```

---

## 🗑️ Cara Uninstall (Uninstallation)

Jika Anda ingin mencopot pemasangan CEO Virtual dari sistem Anda, gunakan script uninstaller 1-klik di bawah ini. Script akan secara otomatis menghentikan server, menghapus konfigurasi autorun saat startup, mencopot executable CLI, dan **memberikan pilihan interaktif apakah ingin menghapus data memori/cache atau tetap menyimpannya**:

### **Windows (PowerShell)**
```powershell
irm https://raw.githubusercontent.com/asepindrak/ceo-virtual/main/uninstall.ps1 | iex
```

### **Linux / macOS / WSL**
```bash
curl -fsSL https://raw.githubusercontent.com/asepindrak/ceo-virtual/main/uninstall.sh | bash
```

### **Via Perintah CLI**
Jika CLI `ceo-virtual` aktif di komputer Anda:
```bash
ceo-virtual uninstall
```

#### 🛡️ Pilihan Pembersihan Data & Memori:
Saat proses uninstall dijalankan, Anda akan diminta konfirmasi:
> `Apakah Anda ingin MENGHAPUS seluruh memori, cache & file workspace? [y/N]:`

* **Pilih `N` (atau langsung tekan Enter):** *(Direkomendasikan)* Menghapus aplikasi dan autorun, namun **tetap menyimpan** data memori AI, riwayat percakapan tim kantor, dan file proyek di `~/.ceo-virtual/workspaces`. Jika Anda menginstall kembali di masa mendatang, seluruh riwayat dan level perusahaan Anda akan langsung terbaca kembali secara utuh.
* **Pilih `y`:** Menghapus seluruh folder `~/.ceo-virtual` dan cache secara bersih dan permanen dari komputer.

---

## 📄 Lisensi
Didistribusikan di bawah lisensi **MIT**. Bebas digunakan, dimodifikasi, dan dikembangkan untuk keperluan personal maupun komersial.
