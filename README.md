# 🤖 Vigent - Virtual Office Agent

<p align="center">
  <b>Simulasi Kantor Virtual Multi-Agent Otonom dengan CLI & Generator Kode Nyata di Disk</b><br>
  <i>Virtual Office Agent (Vigent) — Autonomous Multi-Agent Workplace</i>
</p>

---

## ⚡ 1-Click Installation (Seperti AGY CLI / Hermes)

Install dan jalankan Vigent dalam 1 baris perintah langsung dari GitHub:

### **Windows (PowerShell)**
```powershell
irm https://raw.githubusercontent.com/asepindrak/vigent/main/install.ps1 | iex
```

### **Linux / macOS / WSL**
```bash
curl -fsSL https://raw.githubusercontent.com/asepindrak/vigent/main/install.sh | bash
```

---

## 💻 Vigent CLI (`vigent`)

Setelah diinstall, Anda dapat mengontrol Vigent langsung dari terminal Anda:

```bash
# Menjalankan Vigent pada port 28483 & otomatis buka browser
vigent start

# Cek status server, PID, port, dan jumlah project di disk
vigent status

# Hentikan server Vigent yang sedang aktif
vigent stop

# Langsung buka folder workspace (~/.vigent/workspaces) di File Explorer
vigent workspace

# Aktifkan autorun otomatis saat komputer dinyalakan (boot)
vigent autorun enable

# Non-aktifkan autorun
vigent autorun disable

# Buat folder proyek baru langsung via CLI
vigent create <nama-proyek>
```

---

## 📁 Dedicated Home Directory (`~/.vigent`)

Semua file dan proyek yang dikerjakan oleh agent disimpan di folder terisolasi pada direktori home pengguna:

- **Home Folder**: `~/.vigent` (`C:\Users\<user>\.vigent`)
- **Workspaces**: `~/.vigent/workspaces`
  - Setiap task coding akan otomatis men-generate file kode nyata di disk:
    - `package.json`
    - `README.md`
    - `src/index.js`
    - `src/config.js`
- **Konfigurasi**: `~/.vigent/config.json`
- **Dedicated Port**: `28483` (Uncommon dedicated port agar tidak bentrok dengan dev server lain)

---

## 🛠️ Menjalankan Secara Manual (Development)

```bash
# Clone repository
git clone https://github.com/asepindrak/vigent.git
cd vigent

# Install dependencies
npm install

# Jalankan dev server pada port 28483
npm run dev

# Atau jalankan via CLI
node ./bin/vigent.js start
```

Buka browser di: **http://localhost:28483**

---

## ✨ Fitur Utama

1. **Dual Engine Viewport**:
   - **2.5D Isometric Mode (Default)**: Rendering instan 60 FPS, ultra-ringan, stabil, dan ramah resource.
   - **3D WebGL Three.js Mode**: Tampilan 3D full canvas interaktif.
2. **Autonomous Multi-Agent Simulation**:
   - Agent berjalan secara fisik ke meja rekan kerja untuk berkolaborasi.
   - Indikator dialog visual 3-titik gelombang suara yang tenang dan terfokus.
3. **Human-in-the-Loop Decision**:
   - Agent berjalan ke meja pimpinan (Owner) ketika butuh persetujuan keputusan penting (arsitektur, deployment, budget).
4. **Marketplace AI Worker (Hire & Fire)**:
   - Rekrut atau pecat agent karyawan kantor virtual.
   - Kustomisasi LLM provider per agent (OpenAI, Anthropic, Gemini, Groq, DeepSeek, Custom BYOK).
5. **Real Disk Code Generation**:
   - AI agent benar-benar membuat folder proyek dan menulis kode di `~/.vigent/workspaces/` yang dapat dibuka langsung di Windows Explorer.
