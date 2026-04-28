# model_api

FastAPI service untuk model sentiment analysis IMDB (`positive` / `negative`) yang diekspor dari notebook training.

## Struktur

```text
model_api/
├── app/
│   └── main.py
├── models/
│   ├── imdb_sentiment_metrics.json
│   └── imdb_sentiment_pipeline.joblib
├── sentiment_utils.py
└── requirements.txt
```

## Setup dengan uv

```bash
uv venv
source .venv/bin/activate
uv sync
uv run uvicorn app.main:app --reload
```

API akan berjalan di `http://127.0.0.1:8000`.

Sebelum menjalankan API, isi `.env` dengan API key:

```bash
cp .env.example .env
```

Untuk frontend lokal, origin yang diizinkan diatur lewat `CORS_ALLOWED_ORIGINS` di `.env`.
Default-nya:

```text
http://localhost:5173,http://127.0.0.1:5173
```

Kalau frontend Anda jalan di domain atau port lain, ubah nilai itu sesuai origin frontend.

## Setup dengan pip

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Endpoint

### `GET /health`

Cek status service dan metadata model.

### `POST /predict`

Semua endpoint membutuhkan header:

```text
x-api-key: <API_KEY dari file .env>
```

Request:

```json
{
  "text": "This movie was surprisingly heartfelt, funny, and beautifully acted."
}
```

Response:

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

### `POST /predict-text`

Alternatif untuk frontend yang ingin mengirim raw text tanpa JSON escaping manual.

Request header:

```text
Content-Type: text/plain
x-api-key: <API_KEY dari file .env>
```

Contoh `fetch` dari frontend:

```js
const review = `My daughter liked it but I was aghast, that a character in this movie smokes.
As if it isn't awful enough to see "product placement" actors like Bruce Willis who smoke in their movies.`;

const response = await fetch("http://127.0.0.1:8000/predict-text", {
  method: "POST",
  headers: {
    "Content-Type": "text/plain",
    "x-api-key": import.meta.env.VITE_MODEL_API_KEY,
  },
  body: review,
});

const data = await response.json();
```

Kalau tetap memakai endpoint JSON `/predict`, cukup kirim object JavaScript biasa dan biarkan `JSON.stringify()` yang menangani escaping.
