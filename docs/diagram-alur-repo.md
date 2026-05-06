# Diagram Alur Repo Movies Vue

Dokumen ini merangkum alur utama aplikasi berdasarkan struktur kode saat ini. Repo ini adalah aplikasi Nuxt 3/Vue yang mengambil data film dari TMDB melalui proxy, menyimpan akun dan review ke PostgreSQL lewat Prisma, lalu memakai service model eksternal untuk klasifikasi sentimen review.

## 1. Arsitektur Umum

```mermaid
flowchart LR
  U["User / Browser"] -->|"Akses halaman Nuxt"| FE["Nuxt Vue Pages & Components"]

  FE -->|"Data film: fetchTMDB()"| TMDBC["composables/tmdb.ts"]
  TMDBC -->|"GET /tmdb/*"| PROXY["Nitro Proxy App<br/>proxy/routes/tmdb/[...path].ts"]
  PROXY -->|"API key dari TMDB_API_KEY"| TMDB["TMDB API<br/>https://api.themoviedb.org/3"]
  TMDB --> PROXY --> TMDBC --> FE

  FE -->|"Auth, review, admin"| API["Nuxt Server API<br/>server/api/*"]
  API -->|"Prisma Client"| DB["PostgreSQL Database"]
  API -->|"POST /predict<br/>x-api-key"| MODEL["Model API Service<br/>MODEL_API_BASE_URL"]

  API -->|"Validasi media snapshot"| TMDBU["server/utils/tmdb.ts"]
  TMDBU -->|"GET /tmdb/{type}/{id}"| PROXY

  subgraph "Runtime Config"
    CFG["nuxt.config.ts<br/>BASE_URL<br/>MODEL_API_BASE_URL<br/>MODEL_API_KEY<br/>DATABASE_URL / DB_*"]
  end

  CFG -.-> FE
  CFG -.-> API
  CFG -.-> PROXY
```

## 2. Sumber Data Film dari TMDB

Data film, TV, genre, person, trending, rekomendasi, dan search tidak disimpan di database aplikasi. Data ini diambil langsung dari TMDB melalui proxy.

```mermaid
sequenceDiagram
  actor User
  participant Page as Nuxt Page<br/>pages/*
  participant TmdbComposable as composables/tmdb.ts
  participant Proxy as Proxy Nitro<br/>proxy/routes/tmdb/[...path].ts
  participant TMDB as TMDB API

  User->>Page: Buka homepage, search, detail movie/tv
  Page->>TmdbComposable: getMedia(), listMedia(), searchShows(), getRecommendations()
  TmdbComposable->>TmdbComposable: Tambah language dari i18n<br/>pakai LRU cache/useState
  TmdbComposable->>Proxy: GET {BASE_URL}/tmdb/{path}
  Proxy->>TMDB: GET https://api.themoviedb.org/3/{path}<br/>api_key=TMDB_API_KEY
  TMDB-->>Proxy: JSON data film
  Proxy-->>TmdbComposable: JSON data film
  TmdbComposable-->>Page: Media/PageResult
  Page-->>User: Render list/detail/search result
```

Contoh pemanggilan di kode:

- `pages/[type]/[id].vue` memanggil `getMedia(type, id)` dan `getRecommendations(type, id)`.
- `pages/search.vue` memanggil `searchShows(query, page)`.
- `composables/tmdb.ts` mengarah ke `${public.apiBaseUrl}/tmdb`.
- `proxy/routes/tmdb/[...path].ts` meneruskan request ke `https://api.themoviedb.org/3`.

## 3. Database dan Prisma

Database berada di PostgreSQL. Koneksi dibuat oleh Prisma melalui `DATABASE_URL`; jika `DATABASE_URL` tidak ada, `server/utils/prisma.ts` menyusun URL dari `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, dan `DB_NAME`.

```mermaid
flowchart TD
  ENV[".env / runtime env<br/>DATABASE_URL atau DB_*"] --> PRISMA_UTIL["server/utils/prisma.ts"]
  PRISMA_UTIL --> CLIENT["PrismaClient"]
  CLIENT --> PG["PostgreSQL"]

  PG --> USER["User<br/>akun, role, approval status"]
  PG --> SESSION["Session<br/>tokenHash, expiresAt"]
  PG --> REVIEW["Review<br/>review + hasil sentimen model"]
  PG --> HISTORY["ReviewHistory<br/>riwayat perubahan review"]

  USER -->|"1 user punya banyak"| SESSION
  USER -->|"1 user punya banyak"| REVIEW
  REVIEW -->|"1 review punya banyak"| HISTORY
  USER -->|"moderasi/admin approval"| USER
  USER -->|"moderator review"| REVIEW
```

```mermaid
erDiagram
  User ||--o{ Session : has
  User ||--o{ Review : writes
  User ||--o{ ReviewHistory : creates
  Review ||--o{ ReviewHistory : records
  User ||--o{ User : approves
  User ||--o{ Review : moderates

  User {
    string id PK
    string username UK
    string email UK
    string passwordHash
    UserRole role
    ApprovalStatus approvalStatus
    boolean isActive
    datetime approvedAt
    string approvedById FK
    datetime createdAt
    datetime updatedAt
  }

  Session {
    string id PK
    string userId FK
    string tokenHash UK
    datetime expiresAt
    datetime createdAt
  }

  Review {
    string id PK
    string userId FK
    string tmdbMediaType
    string tmdbMediaId
    string tmdbTitleSnapshot
    string tmdbPosterPathSnapshot
    string content
    string sentimentLabel
    float sentimentConfidence
    json sentimentScoresJson
    string modelVersion
    ReviewStatus status
    string moderationMessage
    datetime moderatedAt
    string moderatedById FK
    datetime createdAt
    datetime updatedAt
  }

  ReviewHistory {
    string id PK
    string reviewId FK
    string userId FK
    string action
    string content
    string sentimentLabel
    float sentimentConfidence
    ReviewStatus status
    datetime createdAt
  }
```

Catatan penting:

- Database tidak menyimpan detail lengkap film dari TMDB.
- Review menyimpan snapshot minimal film: `tmdbMediaType`, `tmdbMediaId`, `tmdbTitleSnapshot`, dan `tmdbPosterPathSnapshot`.
- Hasil model disimpan di `Review`: `sentimentLabel`, `sentimentConfidence`, `sentimentScoresJson`, dan `modelVersion`.
- Satu user hanya boleh punya satu review per media karena ada unique constraint `userId + tmdbMediaType + tmdbMediaId`.

## 4. Alur Register, Login, Session, dan Akses Database

User tidak pernah berkomunikasi langsung ke database. Browser hanya memanggil endpoint Nuxt server API. Endpoint tersebut membaca/menulis PostgreSQL lewat Prisma.

```mermaid
sequenceDiagram
  actor User
  participant UI as Vue UI<br/>pages/login.vue / pages/register.vue
  participant AuthAPI as Auth API<br/>server/api/auth/*
  participant AuthUtil as Auth & Session Utils
  participant Prisma as Prisma Client
  participant DB as PostgreSQL

  User->>UI: Register akun
  UI->>AuthAPI: POST /api/auth/register
  AuthAPI->>AuthAPI: Validasi zod + origin + rate limit
  AuthAPI->>Prisma: Cek username/email
  Prisma->>DB: SELECT User
  AuthAPI->>AuthAPI: Hash password dengan argon2
  AuthAPI->>Prisma: Create User approvalStatus=pending
  Prisma->>DB: INSERT User
  AuthAPI-->>UI: Menunggu approval admin

  User->>UI: Login
  UI->>AuthAPI: POST /api/auth/login
  AuthAPI->>Prisma: Cari user by username/email
  Prisma->>DB: SELECT User
  AuthAPI->>AuthAPI: Verify password + cek isActive + approvalStatus
  AuthAPI->>AuthUtil: createUserSession()
  AuthUtil->>Prisma: Simpan hash token session
  Prisma->>DB: INSERT Session
  AuthUtil-->>UI: Set cookie httpOnly movies_session
  AuthAPI-->>UI: Return user profile
```

Endpoint yang butuh user memakai helper:

- `requireUser(event)` untuk user login aktif.
- `requireApprovedUser(event)` untuk user yang sudah disetujui admin.
- `requireAdminUser(event)` untuk endpoint admin.

## 5. Alur User Membuat Review dan Mendapat Klasifikasi Model

Inilah flow utama integrasi user, database, TMDB, dan model.

```mermaid
sequenceDiagram
  actor User
  participant UI as MediaReviews<br/>components/media/Reviews.vue
  participant API as Review API<br/>server/api/reviews/index.post.ts
  participant Auth as Auth Utils
  participant TMDBUtil as server/utils/tmdb.ts
  participant Proxy as TMDB Proxy
  participant Model as Model API<br/>/predict
  participant Prisma as Prisma Client
  participant DB as PostgreSQL

  User->>UI: Tulis review di halaman movie/tv
  UI->>API: POST /api/reviews<br/>{tmdbMediaType, tmdbMediaId, content}
  API->>API: assertValidOrigin() + rate limit
  API->>Auth: requireApprovedUser()
  Auth->>Prisma: resolve session dari cookie movies_session
  Prisma->>DB: SELECT Session + User
  DB-->>Prisma: user approved/active
  Auth-->>API: user

  API->>API: Validasi body dengan reviewSubmissionSchema
  API->>Prisma: Cek review existing by user + media
  Prisma->>DB: SELECT Review

  par Ambil snapshot media
    API->>TMDBUtil: fetchTmdbMediaSnapshot(type, id)
    TMDBUtil->>Proxy: GET /tmdb/{type}/{id}
    Proxy-->>TMDBUtil: title/name + poster_path
  and Klasifikasi sentimen
    API->>Model: POST {MODEL_API_BASE_URL}/predict<br/>Header x-api-key<br/>Body {text: content}
    Model-->>API: label, confidence, scores, is_positive, version
    API->>API: validatePrediction()
  end

  alt Review sudah ada
    API->>Prisma: UPDATE Review + CREATE ReviewHistory
    Prisma->>DB: UPDATE Review, INSERT ReviewHistory
  else Review baru
    API->>Prisma: CREATE Review + CREATE ReviewHistory
    Prisma->>DB: INSERT Review, INSERT ReviewHistory
  end

  API-->>UI: review + classification label
  UI->>UI: refresh list review + tampilkan feedback positive/negative
  UI-->>User: Sentimen review terlihat di UI
```

Payload model yang diharapkan oleh `server/utils/model-api.ts`:

```json
{
  "label": "positive",
  "confidence": 0.9432,
  "scores": {
    "negative": 0.0568,
    "positive": 0.9432
  },
  "is_positive": true,
  "version": "v1"
}
```

Jika model gagal, response tidak valid, atau API key model belum dikonfigurasi, server mengembalikan error dan review tidak disimpan.

## 6. Alur Membaca Review pada Halaman Film

```mermaid
sequenceDiagram
  actor User
  participant Page as Movie/TV Detail Page
  participant ReviewsUI as components/media/Reviews.vue
  participant API as GET /api/reviews
  participant Prisma as Prisma Client
  participant DB as PostgreSQL

  User->>Page: Buka /movie/{id} atau /tv/{id}
  Page->>ReviewsUI: Render MediaReviews
  ReviewsUI->>API: GET /api/reviews?type={movie|tv}&tmdbId={id}
  API->>Prisma: findMany Review by tmdbMediaType + tmdbMediaId
  Prisma->>DB: SELECT Review + User
  DB-->>Prisma: daftar review
  API->>API: serializePublicReview()
  API-->>ReviewsUI: reviews + currentUserReview
  ReviewsUI-->>User: Tampilkan review public-safe
```

Public-safe berarti:

- Review `visible` menampilkan isi review dan `sentimentLabel`.
- Review `hidden_by_admin` atau `deleted_by_admin` memakai placeholder, tidak membocorkan isi review asli.
- Endpoint public tidak mengirim `sentimentConfidence` dan `sentimentScoresJson`.

## 7. Alur Admin Approval dan Moderasi Review

```mermaid
flowchart TD
  ADMIN["Admin User"] -->|"GET /api/admin/approvals"| APPROVAL_LIST["Daftar user pending"]
  APPROVAL_LIST -->|"POST approve"| APPROVE["/api/admin/approvals/{userId}/approve"]
  APPROVAL_LIST -->|"POST reject"| REJECT["/api/admin/approvals/{userId}/reject"]

  APPROVE -->|"Update approvalStatus=approved"| DB1["PostgreSQL User"]
  REJECT -->|"Update approvalStatus=rejected"| DB1

  ADMIN -->|"GET /api/admin/reviews"| REVIEW_LIST["Review Management"]
  REVIEW_LIST -->|"Filter status/sentiment/search"| DB2["PostgreSQL Review"]
  REVIEW_LIST -->|"PATCH status hidden_by_admin/deleted_by_admin"| MODERATE["/api/admin/reviews/{id}/status"]
  MODERATE -->|"Update status, moderationMessage, moderatedById"| DB2

  REVIEW_LIST -->|"Admin bisa lihat"| MODEL_META["sentimentConfidence<br/>sentimentScoresJson<br/>modelVersion"]
```

Admin bisa melihat confidence, skor mentah model, dan versi model. Public/user biasa hanya melihat label sentimen yang sudah diserialisasi aman.

## 8. Ringkasan Endpoint Utama

```mermaid
flowchart LR
  subgraph "Frontend"
    F1["pages/index.vue<br/>pages/search.vue<br/>pages/[type]/[id].vue"]
    F2["components/media/Reviews.vue"]
    F3["pages/profile.vue"]
    F4["pages/admin/*"]
  end

  subgraph "Nuxt Server API"
    A1["/api/auth/register<br/>/api/auth/login<br/>/api/auth/me<br/>/api/auth/logout"]
    A2["GET /api/reviews"]
    A3["POST /api/reviews<br/>PATCH /api/reviews/:id<br/>DELETE /api/reviews/:id"]
    A4["GET /api/user/reviews"]
    A5["/api/admin/*"]
  end

  subgraph "External/Internal Services"
    S1["PostgreSQL via Prisma"]
    S2["TMDB Proxy via BASE_URL"]
    S3["Model API via MODEL_API_BASE_URL"]
  end

  F1 --> S2
  F2 --> A2
  F2 --> A3
  F3 --> A4
  F4 --> A5
  A1 --> S1
  A2 --> S1
  A3 --> S1
  A3 --> S2
  A3 --> S3
  A4 --> S1
  A5 --> S1
```

## 9. File Kode yang Menentukan Flow

- `nuxt.config.ts`: runtime config untuk `BASE_URL`, `MODEL_API_BASE_URL`, `MODEL_API_KEY`.
- `.env.example`: contoh konfigurasi PostgreSQL, proxy, dan model API.
- `proxy/routes/tmdb/[...path].ts`: proxy ke TMDB API.
- `composables/tmdb.ts`: client-side/server-side helper untuk ambil data film.
- `server/utils/prisma.ts`: konstruksi koneksi Prisma ke PostgreSQL.
- `prisma/schema.prisma`: schema `User`, `Session`, `Review`, `ReviewHistory`.
- `server/utils/session.ts`: cookie `movies_session`, hash token, session database.
- `server/utils/auth.ts`: guard user, approved user, dan admin.
- `server/utils/model-api.ts`: integrasi model klasifikasi sentimen.
- `server/utils/tmdb.ts`: validasi snapshot media saat review disimpan.
- `server/api/reviews/*`: create/read/update/delete review dan pemanggilan model.
- `components/media/Reviews.vue`: UI form review dan feedback hasil klasifikasi.
