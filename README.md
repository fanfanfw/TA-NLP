# Tugas Besar NLP - Movie Review Website dengan Sentiment Analysis

Repository ini berisi implementasi tugas besar NLP berupa website review film yang dapat menganalisis sentimen review user secara realtime. User dapat melihat informasi film, menulis review, lalu sistem akan memberi label sentimen `positive` atau `negative` menggunakan model NLP yang disajikan melalui API.

Proyek ini menggabungkan tiga bagian utama:

- Notebook training model NLP dari dataset IMDB.
- FastAPI service untuk menjalankan model sentiment analysis.
- Aplikasi Nuxt/Vue untuk website review film, autentikasi user, review, dan admin dashboard.

## Ringkasan Fitur

- Menampilkan data film/TV dari TMDB API, termasuk poster, sinopsis, rating, trailer/video, dan cast.
- User dapat register dan login.
- Akun user perlu disetujui admin sebelum dapat menulis review.
- User yang sudah approved dapat membuat, mengedit, dan menghapus review sendiri.
- Setiap review dianalisis realtime oleh model NLP sebelum disimpan.
- Review menyimpan label sentimen, confidence, dan score tiap label.
- Admin dapat approve/reject user, menonaktifkan user, melihat statistik, dan moderasi review.
- Database menyimpan user, session, review, sentiment result, dan riwayat review.

## Kesesuaian dengan Tugas

| Requirement tugas | Implementasi di repo |
| --- | --- |
| Website review film sederhana | Aplikasi `movies-vue/` berbasis Nuxt 3 dan Vue 3 |
| Trailer/poster film | Data film dan media diambil dari TMDB API |
| Sinopsis film | Ditampilkan pada halaman detail film/TV |
| Casting/actor film | Halaman detail dan person/cast menggunakan data TMDB |
| Rating | Rating menggunakan data vote TMDB dan komponen rating |
| Teks review dan sentimen | Form review user dan label `positive` / `negative` dari model NLP |
| NLP realtime | Submit review memanggil FastAPI model service melalui Nuxt server API |
| Source code website | Ada di `movies-vue/` |
| Notebook | `imdb_sentiment_api_ready.ipynb` |
| Model | `model_api/models/imdb_sentiment_pipeline.joblib` dan `artifacts/` |
| PPT | `Nuxt_Movies_NLP_Sentiment_Classification.pptx` |

Catatan: model dilatih menggunakan dataset IMDB berbahasa Inggris. Hasil terbaik akan diperoleh jika review yang diuji menggunakan Bahasa Inggris.

## Arsitektur Sistem

![Nuxt API Model Interaction](./Nuxt%20API%20Model%20Interaction-2026-05-06-023524.png)

Alur utama submit review:

1. User login dan membuka halaman detail film/TV.
2. User menulis review pada form review.
3. Nuxt server memvalidasi session, approval status, origin, rate limit, dan isi review.
4. Nuxt server mengambil snapshot judul/poster dari TMDB.
5. Nuxt server mengirim teks review ke FastAPI `/predict`.
6. FastAPI menjalankan model NLP dan mengembalikan label, confidence, dan scores.
7. Review dan hasil sentimen disimpan ke PostgreSQL.
8. UI menampilkan review beserta label sentimen tanpa reload halaman.

## Struktur Repository

```text
TA/
|-- README.md
|-- IMDB Dataset.csv
|-- imdb_sentiment_api_ready.ipynb
|-- Nuxt_Movies_NLP_Sentiment_Classification.pptx
|-- prd.md
|-- artifacts/
|   |-- imdb_sentiment_metrics.json
|   `-- imdb_sentiment_pipeline.joblib
|-- model_api/
|   |-- app/main.py
|   |-- sentiment_utils.py
|   |-- requirements.txt
|   |-- pyproject.toml
|   `-- models/
|       |-- imdb_sentiment_metrics.json
|       `-- imdb_sentiment_pipeline.joblib
`-- movies-vue/
    |-- pages/
    |-- components/
    |-- server/api/
    |-- server/utils/
    |-- prisma/schema.prisma
    |-- proxy/
    `-- package.json
```

Penjelasan folder penting:

| Path | Fungsi |
| --- | --- |
| `imdb_sentiment_api_ready.ipynb` | Notebook training, evaluasi, dan export model sentiment analysis |
| `IMDB Dataset.csv` | Dataset review IMDB untuk training model |
| `artifacts/` | Output model dan metrik dari proses training |
| `model_api/` | FastAPI service untuk inference sentimen |
| `model_api/app/main.py` | Endpoint `/health`, `/predict`, dan `/predict-text` |
| `model_api/sentiment_utils.py` | Fungsi preprocessing yang dibutuhkan serialized sklearn pipeline |
| `movies-vue/` | Aplikasi website review film berbasis Nuxt 3 |
| `movies-vue/server/api/` | Backend API Nuxt untuk auth, review, admin, dan user |
| `movies-vue/server/utils/model-api.ts` | Wrapper pemanggilan FastAPI model service |
| `movies-vue/components/media/Reviews.vue` | UI form review dan daftar review pada detail film |
| `movies-vue/prisma/schema.prisma` | Schema database PostgreSQL |
| `movies-vue/proxy/` | Proxy TMDB dan image proxy untuk data film |

## Teknologi yang Digunakan

Frontend dan web backend:

- Nuxt 3
- Vue 3
- TypeScript
- UnoCSS
- Prisma ORM
- PostgreSQL
- Argon2 untuk password hashing
- Vitest dan Playwright untuk testing

Model NLP dan API:

- Python 3.11+
- FastAPI
- scikit-learn
- TF-IDF Vectorizer
- Logistic Regression
- joblib

External API:

- TMDB API untuk data film, poster, sinopsis, rating, trailer, dan cast.

## Model NLP

Model sentiment analysis dibuat dari `IMDB Dataset.csv`.

- Dataset: 50.000 review IMDB.
- Label: `positive` dan `negative`.
- Split data: 80 persen train dan 20 persen test.
- Preprocessing: HTML unescape, hapus tag HTML, normalisasi whitespace.
- Feature extraction: TF-IDF unigram dan bigram.
- Model final: `TfidfVectorizer` + `LogisticRegression`.
- File model: `imdb_sentiment_pipeline.joblib`.

Metrik model final:

| Metrik | Nilai |
| --- | ---: |
| Accuracy | 0.903 |
| Macro F1 | 0.902989 |
| Weighted F1 | 0.902989 |

Logistic Regression dipilih untuk deployment karena mendukung `predict_proba`, sehingga API dapat mengembalikan `confidence` dan score probabilitas untuk tiap label.

## Database

Database menggunakan PostgreSQL dengan Prisma ORM.

Entitas utama:

| Entity | Fungsi |
| --- | --- |
| `User` | Menyimpan akun, role `admin/user`, approval status, dan status aktif |
| `Session` | Menyimpan token session login berbasis HTTP-only cookie |
| `Review` | Menyimpan review, data snapshot film TMDB, sentimen, confidence, score JSON, dan status moderasi |
| `ReviewHistory` | Menyimpan riwayat perubahan review |

## Prasyarat Instalasi

Pastikan sudah tersedia:

- Node.js 20 atau versi LTS terbaru.
- pnpm 9.x.
- Python 3.11+.
- PostgreSQL.
- TMDB API key.
- uv untuk Python, opsional tetapi direkomendasikan.

## Cara Menjalankan Project Secara Lokal

Project dijalankan dengan tiga service lokal:

- `model_api` di `http://127.0.0.1:8000`.
- TMDB proxy di `http://localhost:3001`.
- Website Nuxt di `http://localhost:3000`.

### 1. Setup Model API

Masuk ke folder model API:

```bash
cd model_api
cp .env.example .env
```

Isi `.env`:

```env
API_KEY=isi-dengan-secret-yang-sama-dengan-MODEL_API_KEY
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

Install dan jalankan dengan `uv`:

```bash
uv venv
source .venv/bin/activate
uv sync
uv run uvicorn app.main:app --reload
```

Alternatif dengan `pip`:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Cek API:

```bash
curl -H "x-api-key: isi-dengan-secret-yang-sama-dengan-MODEL_API_KEY" http://127.0.0.1:8000/health
```

Contoh request prediksi:

```bash
curl -X POST http://127.0.0.1:8000/predict \
  -H "Content-Type: application/json" \
  -H "x-api-key: isi-dengan-secret-yang-sama-dengan-MODEL_API_KEY" \
  -d '{"text":"This movie was surprisingly heartfelt and beautifully acted."}'
```

Contoh response:

```json
{
  "label": "positive",
  "confidence": 0.9432,
  "scores": {
    "negative": 0.0568,
    "positive": 0.9432
  },
  "is_positive": true
}
```

### 2. Setup Website Nuxt dan Database

Masuk ke folder website:

```bash
cd movies-vue
corepack enable
pnpm install
cp .env.example .env
```

Isi `.env` sesuai environment lokal:

```env
APP_ORIGIN=http://localhost:3000
BASE_URL=http://localhost:3001
MODEL_API_BASE_URL=http://127.0.0.1:8000
MODEL_API_KEY=isi-dengan-secret-yang-sama-dengan-API_KEY-model-api
SESSION_SECRET=isi-dengan-random-secret-panjang
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=password_database
DB_NAME=db_movie_vue
DATABASE_URL=postgresql://postgres:password_database@localhost:5432/db_movie_vue
```

Buat database PostgreSQL sesuai `DB_NAME`, lalu jalankan Prisma:

```bash
pnpm db:generate
pnpm db:migrate
```

Buat akun admin awal:

```bash
pnpm db:seed -- --username=admin --email=admin@example.com --password=Admin12345
```

### 3. Setup TMDB Proxy

Masih dari folder `movies-vue`, buat file environment proxy:

```bash
cp proxy/.env.example proxy/.env
```

Isi `proxy/.env`:

```env
TMDB_API_KEY=isi_dengan_api_key_tmdb
```

Jalankan proxy di terminal terpisah:

```bash
pnpm dev:proxy
```

### 4. Jalankan Website

Di terminal lain, dari folder `movies-vue`:

```bash
pnpm dev
```

Buka website:

```text
http://localhost:3000
```

## Alur Demo yang Disarankan

1. Jalankan `model_api` di port 8000.
2. Jalankan TMDB proxy di port 3001.
3. Jalankan website Nuxt di port 3000.
4. Buka homepage dan pilih film.
5. Tunjukkan poster, sinopsis, cast, rating, dan trailer.
6. Register user baru.
7. Login sebagai admin dan approve user tersebut.
8. Login sebagai user approved.
9. Submit review positif dalam Bahasa Inggris dan tunjukkan label `positive`.
10. Edit review menjadi negatif dan tunjukkan label berubah menjadi `negative`.
11. Login sebagai admin untuk melihat confidence, scores, dan fitur moderasi review.

## Endpoint Penting

Model API:

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `GET` | `/health` | Mengecek status model dan metadata |
| `POST` | `/predict` | Prediksi sentimen dari JSON `{ "text": "..." }` |
| `POST` | `/predict-text` | Prediksi sentimen dari raw text |

Nuxt server API:

| Endpoint | Fungsi |
| --- | --- |
| `/api/auth/register` | Register user baru |
| `/api/auth/login` | Login user/admin |
| `/api/auth/logout` | Logout |
| `/api/auth/me` | Mengambil user session aktif |
| `/api/reviews` | List dan submit review |
| `/api/reviews/[id]` | Edit atau hapus review |
| `/api/admin/*` | Dashboard, approval user, user management, dan review moderation |

## Keamanan dan Validasi

- Password user di-hash menggunakan Argon2.
- Session disimpan dengan token cookie HTTP-only.
- User baru berstatus `pending` sampai disetujui admin.
- Hanya approved user yang dapat menulis review.
- Hanya admin yang dapat mengakses halaman dan API admin.
- API mutasi memvalidasi origin request.
- Submit review memakai rate limit.
- API key model tidak dikirim ke browser, hanya disimpan di server Nuxt.
- Review divalidasi dengan panjang 10 sampai 2000 karakter.

## Testing dan Quality Check

Website menyediakan script berikut di `movies-vue/package.json`:

```bash
pnpm test:unit
pnpm test:e2e
pnpm lint
pnpm typecheck
pnpm build
```

Gunakan `pnpm test:unit` untuk unit test, `pnpm lint` untuk linting, `pnpm typecheck` untuk validasi TypeScript/Vue, dan `pnpm build` untuk memastikan aplikasi siap build production.

## Troubleshooting

Jika website gagal mengambil film:

- Pastikan TMDB proxy berjalan di port 3001.
- Pastikan `BASE_URL=http://localhost:3001` di `movies-vue/.env`.
- Pastikan `TMDB_API_KEY` di `movies-vue/proxy/.env` valid.

Jika review gagal dianalisis:

- Pastikan FastAPI berjalan di port 8000.
- Pastikan `MODEL_API_BASE_URL=http://127.0.0.1:8000`.
- Pastikan `MODEL_API_KEY` di `movies-vue/.env` sama dengan `API_KEY` di `model_api/.env`.
- Cek endpoint `/health` pada model API.

Jika login atau review gagal karena database:

- Pastikan PostgreSQL aktif.
- Pastikan `DATABASE_URL` benar.
- Jalankan `pnpm db:generate` dan `pnpm db:migrate`.
- Pastikan admin awal sudah dibuat dengan `pnpm db:seed`.

Jika hasil review Bahasa Indonesia kurang akurat:

- Model saat ini dilatih dari dataset IMDB berbahasa Inggris.
- Untuk performa Bahasa Indonesia, model perlu dilatih ulang dengan dataset review Bahasa Indonesia atau menggunakan pendekatan multilingual.

## Catatan Pengembangan Lanjutan

- Menambahkan model sentiment Bahasa Indonesia atau multilingual.
- Menambahkan statistik sentimen per film.
- Menambahkan daftar bank 30 film yang eksplisit jika ingin mengikuti skenario tugas secara ketat.
- Menampilkan confidence score terbatas untuk admin saja.
- Deploy Nuxt, database, proxy TMDB, dan model API dengan model API tetap private.

## Credits

Data film disediakan oleh The Movie Database (TMDB). Project menggunakan TMDB API tetapi tidak di-endorse atau disertifikasi oleh TMDB.
