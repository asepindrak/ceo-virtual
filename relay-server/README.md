# 🚀 Panduan Deploy CEO Virtual P2P Relay Hub di Dokploy (VPS)

Server ini berfungsi sebagai **Public Rendezvous & Signaling Relay** untuk menghubungkan instalasi CEO Virtual di seluruh dunia secara otomatis tanpa terhalang firewall/NAT router.

---

## 📋 Spesifikasi Server
- **Runtime**: Pure Node.js 20 Alpine (Zero Dependency, ~15MB RAM).
- **Port Internal**: `3000`
- **Healthcheck**: `/health`

---

## 🛠️ Langkah Deploy di Dokploy (2 Menit):

### Opsi 1: Deploy dari Git Repository (Direkomendasikan)
1. Buka dashboard **Dokploy** Anda.
2. Klik **Projects** ➔ Pilih/buat project baru ➔ Klik **Create Service** (Pilih **Application**).
3. Di tab **Source**:
   - Pilih **GitHub / Git**.
   - Masukkan URL repository Vigent Anda (atau sub-repo jika dipisah).
   - **Branch**: `main`
4. Di tab **Build**:
   - **Build Type**: Pilih `Dockerfile`.
   - **Context Path**: `./relay-server`
   - **Dockerfile Path**: `./relay-server/Dockerfile`
5. Di tab **General / Environment**:
   - **Port**: Isi `3000`.
6. Di tab **Domains**:
   - Tambahkan domain/subdomain Anda (misal: `relay.domainanda.com` atau `vigent-hub.vps.com`).
   - Centang **HTTPS / SSL (Let's Encrypt)**.
7. Klik **Deploy**! 🚀

---

### Opsi 2: Deploy via Docker Compose di Dokploy
1. Di Dokploy, pilih **Create Service** ➔ Pilih **Compose**.
2. Salin isi file `docker-compose.yml` ke editor Dokploy.
3. Atur domain dan klik **Deploy**.

---

## 🧪 Verifikasi Setelah Deploy:
1. Buka URL domain Anda di browser: `https://relay.domainanda.com`
   - Anda akan melihat **CEO Virtual P2P Dashboard** dengan status `Healthy 🟢` dan daftar node yang terhubung.
2. Endpoint `/health` akan menampilkan JSON status server.

---

## 🔗 Hubungkan CEO Virtual Desktop ke Relay Ini:
1. Di aplikasi CEO Virtual desktop/laptop Anda:
2. Buka **Peta Kota** ➔ Klik tab **"📡 Node P2P Mesh"**.
3. Di bagian **"Public Community Relay Hub"**, masukkan URL VPS Anda:
   ```text
   https://relay.domainanda.com
   ```
4. Klik **"Simpan & Sinkronkan"**.
5. Seketika PC Anda (dan PC siapa pun yang memakai URL relay tersebut) akan saling terdeteksi di Peta Dunia secara global!
