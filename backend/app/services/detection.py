import json
import base64
import httpx
from pathlib import Path
from ultralytics import YOLO
from app.config import get_label_map, get_settings
from app.schemas import DetectionResult

_model: YOLO | None = None

# Background and non-waste classes to ignore so they aren't labeled as waste
IGNORE_CLASSES = {
    "person", "chair", "couch", "bed", "dining table", "tv", "bench", 
    "car", "truck", "bus", "motorcycle", "bicycle", "traffic light", 
    "stop sign", "potted plant", "wall", "floor", "door", "window"
}

MIN_CONFIDENCE = 0.25


def get_detector() -> YOLO:
    global _model
    if _model is None:
        _model = YOLO("yolov8n.pt")
    return _model


def detect_waste(image_path: str | Path) -> list[DetectionResult]:
    """
    Run YOLOv8 inference on an image, filtering out irrelevant background objects,
    and mapping raw labels to the four canonical waste classes.
    """
    model = get_detector()
    results = model(str(image_path), verbose=False, conf=MIN_CONFIDENCE)
    label_config = get_label_map()
    label_map = label_config["label_map"]
    default_class = label_config["default_class"]
    default_desc = label_config["default_description"]

    detections = []
    for result in results:
        for box in result.boxes:
            raw_label = result.names[int(box.cls[0])].lower()
            confidence = float(box.conf[0])

            # Filter out non-waste background objects (humans, furniture, vehicles)
            if raw_label in IGNORE_CLASSES:
                continue

            mapped = label_map.get(raw_label)
            if not mapped:
                # If unmapped, only include if confidence is higher
                if confidence < 0.35:
                    continue
                mapped = {
                    "class": default_class,
                    "description": default_desc,
                }

            bbox_coords = [round(float(coord), 1) for coord in box.xyxy[0].tolist()]

            detections.append(DetectionResult(
                waste_class=mapped["class"],
                confidence=round(confidence, 4),
                raw_label=raw_label,
                description=mapped["description"],
                bbox=bbox_coords,
                data_source="yolo_detected",
            ))

    return detections


async def detect_waste_gemini(image_bytes: bytes, mime_type: str = "image/jpeg") -> list[DetectionResult]:
    """
    Multi-modal zero-shot waste detection using Google Gemini Vision.
    Provides high accuracy for complex waste items (e.g. foil, packaging, blister packs, organic scraps).
    """
    settings = get_settings()
    if not settings.gemini_api_key:
        return []

    b64_img = base64.b64encode(image_bytes).decode("utf-8")
    models = ["gemini-3.5-flash", "gemini-flash-lite-latest", "gemini-flash-latest"]

    prompt = (
        "Identify and classify all visible waste or discarded items in this image. "
        "Assign each item to one of the four categories: 'wet' (organic, food, garden waste), "
        "'dry' (paper, cardboard, textiles, general trash), "
        "'recyclable' (clean plastics, glass, metals, bottles, cans), "
        "or 'hazardous' (batteries, electronics, chemicals, medical waste, sharp objects). "
        "Return ONLY a JSON list of objects: "
        "[{\"waste_class\": \"wet|dry|recyclable|hazardous\", \"confidence\": 0.95, \"raw_label\": \"item name\", \"description\": \"brief reason\"}]. "
        "If no waste or relevant objects are visible, return an empty JSON list []."
    )

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": mime_type if mime_type in ["image/jpeg", "image/png", "image/webp"] else "image/jpeg",
                            "data": b64_img,
                        }
                    }
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        },
    }

    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": settings.gemini_api_key,
    }

    for model in models:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                resp = await client.post(url, headers=headers, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    parsed = json.loads(text)
                    if isinstance(parsed, list):
                        results = []
                        for item in parsed:
                            w_class = item.get("waste_class", "dry").lower()
                            if w_class not in ["wet", "dry", "recyclable", "hazardous"]:
                                w_class = "dry"
                            results.append(DetectionResult(
                                waste_class=w_class,
                                confidence=float(item.get("confidence", 0.90)),
                                raw_label=item.get("raw_label", "waste item"),
                                description=item.get("description", "AI detected waste item"),
                                bbox=None,
                                data_source="gemini_vision",
                            ))
                        return results
        except Exception:
            continue

    return []
