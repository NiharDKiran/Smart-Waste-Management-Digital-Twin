# EcoTwin: Specification

**Last updated:** 2026-10-15

## Overview

EcoTwin is a universal smart waste management digital twin. It serves facilities teams at campuses, hospitals, apartments, and similar venues. The system uses computer vision to classify waste, maintains a digital twin of the waste management ecosystem, simulates future states, and uses generative AI to produce actionable recommendations.

## Problem Statement

Develop a system that uses Computer Vision to identify and classify waste, creates a Digital Twin of the waste management ecosystem, and uses Generative AI to provide recommendations for improving waste segregation, recycling, and collection efficiency.

Required pillars: Computer Vision, Digital Twin, Generative AI.

## Closed-Loop Flow

1. Camera or image upload detects waste via YOLOv8.
2. Detection result updates the state of a specific bin in the digital twin.
3. Simulator predicts overflow timing and contamination levels.
4. Gemini produces structured recommendations from the current twin state.
5. User applies a recommendation as a scenario in the twin.
6. Dashboard shows before-and-after impact computed by the simulator.

## Stack

### Backend
- Python 3.11
- FastAPI
- SQLite via SQLAlchemy
- Pydantic models
- ultralytics YOLOv8 (CPU, pretrained)
- httpx for Gemini API calls
- reportlab for PDF report generation

### Frontend
- React 18 with Vite and TypeScript (strict mode)
- React Router v6
- Recharts for data visualization
- Leaflet for maps
- lucide-react for icons
- Plain CSS with design tokens as custom properties

### Infrastructure
- Vercel: frontend deployment
- Render: backend deployment

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/bins | List all bins with current twin state |
| GET | /api/bins/{id} | Single bin details |
| POST | /api/detect | Accept image, return waste class and confidence, optionally update a bin |
| POST | /api/simulate | Step the twin N hours forward, accept scenario object |
| GET | /api/scenarios | List saved scenarios |
| POST | /api/recommend | Send twin state to Gemini, return structured JSON |
| GET | /api/report | Generate and return a PDF report |
| GET | /api/health | Health check |

## Waste Classes

Four canonical classes: wet, dry, recyclable, hazardous.

Raw YOLO labels are mapped to these four classes via a configuration file (`backend/config/label_map.yaml`).

## Twin Engine

Entities:
- **Bin**: capacity (liters), fill_level (0-100%), per_hour_fill_rate, waste_type_mix (dict of class to proportion), contamination_score (0-1), last_collected (datetime), location (lat, lng), zone_id.
- **Zone**: name, type (academic, residential, medical, cafeteria, admin, outdoor), bins (list).
- **Truck**: capacity, current_load, speed_kmh, base_location.

Simulation:
- Advances fill levels based on per_hour_fill_rate.
- Flags overflow risk with predicted hours until overflow.
- Runs collection route optimizer using nearest-neighbour (stated in UI).
- Computes: overflow incidents, total truck distance (km), contamination rate, estimated CO2 (kg).

Scenarios:
- Add bins at a location.
- Change pickup frequency per zone.
- Add a segregation awareness intervention (lowers contamination by a configurable factor).

Impact is computed by running simulation on baseline and scenario, then diffing the outputs.

## Seed Data

20 bins across 5 zones, generated with a seeded random generator (seed: 42).

Sample zones (universal facility):
1. Main Building (zone_type: admin)
2. Residential Wing (zone_type: residential)
3. Food Court (zone_type: cafeteria)
4. Medical Center (zone_type: medical)
5. Outdoor Area (zone_type: outdoor)

All coordinates are approximate and labeled as such in the UI and API (data_source: "simulated").

## LLM Integration

- Provider: Google Gemini (gemini-2.0-flash)
- API key: environment variable GEMINI_API_KEY
- System prompt forces JSON output matching a Pydantic schema
- Response schema: { issues: [], actions: [], expected_impact: {}, assumptions: [] }
- Validation: parse response, retry once on invalid JSON, return error object on second failure
- Cache: last successful response stored, served with "cached" label if API is unavailable

## Emission Factors

Stored in `backend/config/emission_factors.yaml` with a source field for each factor. Values are placeholders until real sources are provided.

## Security

- CORS: limited to frontend origin
- Upload validation: jpeg, png, webp only, max 5 MB
- No image persistence by default
- Rate limiting on /detect and /recommend
- Secrets from environment variables only

## Design System

- Neumorphism + spatial UI
- Palette: warm neutral base (#E8E0D8 light stone), deep green primary (#2D6A4F), amber accent (#E07B39)
- No purple, no decorative gradients
- WCAG AA contrast on all text
- Buttons: rectangular, max 10px radius, no pill shapes
- Typography: one sans-serif + one monospace, tabular numbers for metrics
- Icons: lucide-react only, no emoji anywhere
- Motion: 120-200ms transitions only, respect prefers-reduced-motion
- Custom cursor: dot + ring, disabled on touch and reduced-motion

## Legal

- Contact: Nihar D Kiran, nihardkiran@gmail.com, 9538196152
- Hackathon prototype disclaimer
- Images processed for classification, not stored
- Aggregated twin data sent to Gemini, no personal data
- No accounts, no tracking cookies

## Team

TODO: add team members

## Known Limitations

- Sensor data is simulated, not from real IoT devices.
- Detector accuracy depends on the pretrained YOLOv8 model and input image quality.
- Coordinates are approximate, not surveyed.
- Recommendations are advisory, generated by an LLM.
- Route optimization uses nearest-neighbour heuristic, not an optimal solver.
