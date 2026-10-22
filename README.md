# 👑 CEO Virtual - Autonomous Multi-Agent Virtual Workplace

<p align="center">
  <b>Simulasi Kantor Virtual Multi-Agent Otonom dengan Arsitektur Node-to-Node P2P, Identitas Kriptografis Web3, Orkestrasi Telegram Bot, & Generator Kode Nyata di Disk</b><br>
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

Install dan jalankan CEO Virtual dalam 1 baris perintah langsung dari GitHub:

### **Windows (PowerShell)**
```powershell
irm https://raw.githubusercontent.com/asepindrak/ceo-virtual/main/install.ps1 | iex
```

### **Linux / macOS / WSL**
```bash
curl -fsSL https://raw.githubusercontent.com/asepindrak/ceo-virtual/main/install.sh | bash
```

> 💡 **Pilihan Autorun Interaktif**: Saat instalasi berjalan, script installer akan menanyakan apakah Anda ingin mengaktifkan *Autorun at Startup* `[Y/n]` secara otomatis.

---

## 🚀 Alur Setup Pertama Kali (Web-First Interactive Onboarding)

Setelah instalasi selesai, server otomatis aktif pada port dedicated **`:28483`** dan **langsung membuka browser** ke `http://localhost:28483`.

```text
+---------------------------------------------------------------------------------+
|                         👑 CEO VIRTUAL INITIALIZATION                           |
|               Autonomous Multi-Agent Workplace on Decentralized P2P             |
+---------------------------------------------------------------------------------+
|   [ 🚀 Buat Kantor Baru ]                      [ 🔄 Pulihkan Kantor ]           |
|   (Create New Company & Wallet)                (Restore from Backup File)       |
+---------------------------------------------------------------------------------+
```

### 1. 🔑 Identitas Kriptografis & Kode Cadangan
* **BIP-39 Mnemonic Seed Phrase (12 Kata Rahasia)**: Dibangkitkan secara deterministik dengan alamat owner publik (`0x...`).
* **📋 Tombol Salin (Copy to Clipboard)**: Salin 12 kata dalam 1 klik dengan feedback notifikasi.
* **📥 Tombol Unduh File Cadangan (`.txt`)**: Mengunduh file `ceo-virtual-backup-<nama-kantor>.txt` yang berisi alamat node, 12 kata pemulihan, dan panduan keamanan.
* **🔄 Pulihkan Kantor (Restore)**: Jika install ulang PC atau pindah laptop, cukup **Drag & Drop / Upload file `.txt` cadangan** atau paste 12 kata pemulihan.

### 2. 🌐 Pemilihan Regional Shards & Dynamic Auto-Sharding
* **📍 Deteksi Lokasi GPS Otomatis**: Sistem menggunakan Geolocation API browser (`navigator.geolocation`) dan fallback IP untuk menghitung jarak fisik (rumus Haversine dalam kilometer) ke setiap shard region. Shard terdekat (misal: *Jakarta ~14 km*) otomatis direkomendasikan dan dipilih.
* Pilih klaster region terdekat untuk latensi real-time P2P:
  * 🇮🇩 `apac-jakarta-1` (12ms ping - Optimal)
  * 🇸🇬 `apac-singapore-1` (28ms ping - High Load)
  * 🇯🇵 `apac-tokyo-1` (74ms ping)
  * 🇩🇪 `eu-frankfurt-1` (165ms ping)
  * 🇺🇸 `us-east-1` (188ms ping)
* **Dynamic Auto-Sharding Protocol**: Jika region mencapai utilisasi $\ge 90\%$, protokol konsensus node otomatis men-spawn shard baru (misal: **`APAC Jakarta Shard-2 (Auto-Spawned)`**) untuk menjaga performa jaringan.

### 3. 🏢 Profil Perusahaan, Nearby Office, & Genesis Block
* Tentukan nama kantor, bidang industri, dan opsi **⚡ Autorun at Startup** (ON/OFF).
* **📍 Fondasi Fitur "Nearby Office" (Kantor Tetangga)**: Koordinat kota disimpan di `keystore.json` secara aman (dibulatkan untuk melindungi privasi) sehingga kantor-kantor di kota/distrik yang sama dapat saling terhubung di peta spasial P2P.
* Sistem menandatangani **Genesis Block** dengan kunci privat lokal dan menyimpannya di `~/.ceo-virtual/keystore.json`.

---

## 💻 CEO Virtual CLI (`ceo-virtual`)

Setelah diinstall, Anda dapat mengontrol kantor virtual langsung dari terminal favorit Anda:

```bash
# Menjalankan CEO Virtual pada port 28483 & otomatis membuka browser
ceo-virtual start

# Cek status server, PID, port, dan status autorun
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

*(Catatan: Perintah `vigent` tetap didukung sebagai alias perintah CLI untuk kompatibilitas mundur)*

---

## 🌟 Fitur Unggulan

### 1. 🛡️ Node-to-Node P2P Blockchain & Proof-of-Ownership
- Kepemilikan perusahaan dibuktikan secara matematis dengan tanda tangan digital kriptografis (Asymmetric Cryptography).
- Bebas dari ketergantungan database terpusat tunggal (*zero single point of failure*).
- Setiap instruksi penting ditandatangani oleh *Owner Address*, tersimpan dalam append-only event log lokal ber-hash (`prevHash -> hash`).

### 2. 🏢 Multi-Company & Autonomous Leader System
- Kelola berbagai perusahaan (preset startup seperti *ShadowMove*, agensi studio, atau perusahaan kustom AI).
- **Penentuan Leader Otomatis & Manual**:
  - Deteksi otomatis leader tim berdasarkan hierarki jabatan (*Founder, Lead Architect, CEO, Director, Project Manager*).
  - Pimpinan (Boss) dapat mengubah Leader Utama kapan saja cukup dengan 1 klik tombol **"👑 Set Jadi Leader"** di profil agen.

### 3. 📱 Telegram Bot War Room Terisolasi (Bi-Directional Sync)
- Setiap perusahaan dapat memiliki token Telegram Bot dan Chat ID terisolasi.
- **Tagging Karyawan Spesifik**: Panggil karyawan dengan `@Kenji`, `@Rei`, `@Damian`, `@Yuki`, atau `@all`.
- **Delegasi Sprint Otomatis**: Saat Boss memberikan instruksi proyek, Leader akan otomatis memecah arahan menjadi sub-task spesifik bagi tiap anggota tim (Frontend, Backend, QA).
- **Laporan Berkala Otonom**: Tim melaporkan progres pengerjaan (50% & 100% milestone) langsung ke grup Telegram Boss atau ruang War Room kantor.

### 4. ☕ Rapat Harian Standup Conference Otonom
- Agen-agen berkumpul di meja ruang rapat (Conference Room) untuk standup meeting pagi harian.
- Masing-masing memaparkan apa yang dikerjakan kemarin, rencana hari ini, dan blocker.
- Hasil rapat otomatis dirangkum dan diteruskan ke Telegram War Room.

### 5. 🎨 Dual Engine Viewport (2.5D Isometric & 3D Three.js)
- **2.5D Isometric Engine**: Rendering instan 60 FPS, ultra-ringan, stabil, dan ramah baterai laptop.
- **3D WebGL Three.js Canvas**: Visualisasi 3D kantor penuh dengan kontrol kamera orbital, pencahayaan dinamis, stasiun kereta, dan visual interaktif.

### 6. 📁 Real Disk Code Generation (`~/.ceo-virtual/workspaces`)
- Setiap task koding yang diselesaikan agen benar-benar menghasilkan file kode sumber nyata di direktori terisolasi:
  - `package.json`
  - `src/index.js`
  - `TASK_SUMMARY.md`
  - Konfigurasi siap deploy dan live preview.

### 7. 🤖 Dukungan Multi-LLM Fleksibel (Global & BYOK)
- Terapkan LLM secara global untuk seluruh agen dalam satu kantor atau atur konfigurasi individual per agen.
- Kompatibel dengan berbagai provider AI:
  - **OpenAI** (`gpt-4o`, `gpt-4o-mini`, dll.)
  - **Anthropic Claude** (`claude-3-5-sonnet`, dll.)
  - **Google Gemini** (`gemini-1.5-pro`, `gemini-2.0-flash`)
  - **Groq & DeepSeek** (Ultra-fast inference)
  - **Local Ollama / Custom Endpoint**

### 8. 🎵 Retro Winamp Player & Office Audio System
- Pemutar musik floating bergaya retro Winamp klasik yang terintegrasi dengan YouTube Music API.
- Musik latar kantor virtual yang dapat dikontrol dari UI maupun via remote bot.

### 9. 📍 Spatial P2P & Ekosistem "Nearby Office" (Kantor Tetangga)
- **Deteksi Geolocation Otomatis**: Mendeteksi lokasi GPS atau IP perangkat untuk menghubungkan kantor Anda ke shard region berlatensi terendah.
- **Klaster Bisnis Tetangga**: Node-node di kota/distrik yang sama dapat saling terhubung untuk kolaborasi antar kantor virtual, kunjungan agen B2B, dan pembagian tugas.
- **Privasi Terjaga**: Koordinat dibulatkan (*coarse geohash*) setingkat kota/area sehingga privasi rumah/lokasi presisi pengguna tetap aman 100%.

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
├── keystore.json        # Identitas node P2P, owner address, & Genesis signature
├── regions.json         # Konfigurasi regional shard & auto-spawned cluster
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

* **Pilih `N` (atau langsung tekan Enter):** *(Direkomendasikan)* Menghapus aplikasi dan autorun, namun **tetap menyimpan** data keystore P2P, memori AI, riwayat percakapan tim kantor, dan file proyek di `~/.ceo-virtual/workspaces`. Jika Anda menginstall kembali di masa mendatang, seluruh identitas dan perusahaan Anda akan langsung terbaca kembali secara utuh.
* **Pilih `y`:** Menghapus seluruh folder `~/.ceo-virtual` dan cache secara bersih dan permanen dari komputer.

---

## 📄 Lisensi
Didistribusikan di bawah lisensi **MIT**. Bebas digunakan, dimodifikasi, dan dikembangkan untuk keperluan personal maupun komersial.
