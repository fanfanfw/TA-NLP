from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path

import joblib
from dotenv import load_dotenv
from fastapi import Body, Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict, Field


BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "models" / "imdb_sentiment_pipeline.joblib"
METRICS_PATH = BASE_DIR / "models" / "imdb_sentiment_metrics.json"

load_dotenv(BASE_DIR / ".env")


class PredictionRequest(BaseModel):
    text: str = Field(..., min_length=1, description="User review text to classify.")


class PredictionResponse(BaseModel):
    label: str
    confidence: float
    scores: dict[str, float]
    is_positive: bool


class HealthResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    status: str
    model_loaded: bool
    model_name: str | None = None
    accuracy: float | None = None


@lru_cache(maxsize=1)
def load_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")
    return joblib.load(MODEL_PATH)


@lru_cache(maxsize=1)
def load_metrics() -> dict:
    if not METRICS_PATH.exists():
        return {}
    return json.loads(METRICS_PATH.read_text())


@lru_cache(maxsize=1)
def get_api_key() -> str:
    api_key = os.getenv("API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("API_KEY is not configured. Set it in the .env file.")
    return api_key


@lru_cache(maxsize=1)
def get_allowed_origins() -> list[str]:
    origins = os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    return [origin.strip() for origin in origins.split(",") if origin.strip()]


def verify_api_key(x_api_key: str | None = Header(default=None)) -> None:
    expected_key = get_api_key()
    if x_api_key != expected_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key.",
        )


def predict_sentiment(text: str) -> PredictionResponse:
    text = text.strip()
    if not text:
        raise ValueError("Text must not be empty.")

    model = load_model()
    probabilities = model.predict_proba([text])[0]
    labels = model.classes_.tolist()
    scores = {label: float(score) for label, score in zip(labels, probabilities)}
    predicted_label = max(scores, key=scores.get)

    return PredictionResponse(
        label=predicted_label,
        confidence=round(scores[predicted_label], 4),
        scores={label: round(score, 4) for label, score in scores.items()},
        is_positive=predicted_label == "positive",
    )


app = FastAPI(
    title="IMDB Sentiment Model API",
    version="1.0.0",
    description="Serve a binary sentiment analysis model for English movie reviews.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", dependencies=[Depends(verify_api_key)])
def root():
    metrics = load_metrics()
    return {
        "message": "IMDB sentiment model API is running.",
        "model_name": metrics.get("model_name"),
        "accuracy": metrics.get("accuracy"),
        "docs_url": "/docs",
    }


@app.get("/health", response_model=HealthResponse, dependencies=[Depends(verify_api_key)])
def health_check():
    try:
        load_model()
        metrics = load_metrics()
        return HealthResponse(
            status="ok",
            model_loaded=True,
            model_name=metrics.get("model_name"),
            accuracy=metrics.get("accuracy"),
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/predict", response_model=PredictionResponse, dependencies=[Depends(verify_api_key)])
def predict(request: PredictionRequest):
    try:
        return predict_sentiment(request.text)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post(
    "/predict-text",
    response_model=PredictionResponse,
    dependencies=[Depends(verify_api_key)],
)
def predict_text(text: str = Body(..., media_type="text/plain")):
    try:
        return predict_sentiment(text)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
