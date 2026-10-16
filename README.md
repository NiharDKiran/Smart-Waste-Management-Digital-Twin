# EcoTwin: Universal Smart Waste Management Digital Twin
> Universal digital twin platform combining **Computer Vision**, a **Digital Twin Engine**, and **Generative AI** for facility waste optimization.

---

## The Three Pillars

1. **Computer Vision (YOLOv8 on CPU)**
   - Identifies objects in waste imagery and maps raw classes into four canonical segregation categories: **Wet, Dry, Recyclable, Hazardous**.
   - Configurable classification mappings defined in `backend/config/label_map.yaml`.
   - **Closed-Loop Integration:** Image detections immediately update specific receptacle node states in the digital twin.

2. **Digital Twin Engine (Continuous Temporal Simulation)**
   - High-fidelity twin of a universal 20-receptacle network across 5 functional zones (*Main Building, Residential Wing, Food Court, Medical Center, Outdoor Area*).
   - Tracks real-time fill percentages, cross-stream contamination scores, hourly accumulation rates, and collection timestamps.
   - Computes nearest-neighbour collection routes, projected hours until overflow, and carbon footprints using emission factors from `backend/config/emission_factors.yaml`.
   - Forward scenario simulation allows facility directors to forecast interventions (*+Bins, Frequency shifts, Segregation awareness*).

3. **Generative AI Advisory (Google Gemini Flash / gemini-2.5-flash / gemini-2.0-flash / gemini-1.5-flash)**
   - Synthesizes live telemetry matrices into structured operational vulnerabilities and prioritized interventions.
   - Outputs structured schemas with self-healing retry mechanisms and session fallback cache.
   - One-click **"Apply as Twin Scenario"** button immediately injects AI recommendations into the simulation sandbox.

---

## Quickstart & How to Run

### Option A: One-Click Launch (Recommended)

Simply run the launcher script from the project root. It starts both the Backend and Frontend in separate windows automatically:

```powershell
# Using PowerShell:
.\start.ps1

# Or double-click / run the batch file:
start.bat
```

- **Frontend Dashboard:** `http://localhost:5173`
- **Backend API Docs (Swagger):** `http://localhost:8000/docs`
- **Health Check:** `http://localhost:8000/api/health`

---

### Option B: Manual Terminal Execution

#### Prerequisites
- **Python**: 3.10 or higher
- **Node.js**: v18 or higher (with `npm`)

#### Step 1: Environment Setup (.env)

1. Copy the example environment template:
   ```powershell
   Copy-Item .env.example .env
   Copy-Item .env.example backend/.env
   ```

2. Open `.env` and configure:
   - **`GEMINI_API_KEY`**: Insert your Google Gemini API key from [Google AI Studio](https://aistudio.google.com/).
   - **`SECRET_KEY`**: Set a static secret key for token signing:
     ```powershell
     python -c "import secrets; print(secrets.token_urlsafe(32))"
     ```

---

### Step 2: Run the Backend (Terminal 1)

Open PowerShell:
```powershell
# 1. Navigate to backend
cd backend

# 2. Install dependencies (first time only)
python -m pip install .
# Or install using requirements.txt:
# python -m pip install -r requirements.txt
# For testing dependencies:
# python -m pip install ".[dev]"

# 3. Start the FastAPI development server
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- **Backend API Base:** `http://localhost:8000`
- **Interactive Swagger Docs:** `http://localhost:8000/docs`
- **Health Check:** `http://localhost:8000/api/health`

> **Note on `[WinError 10013]` (Port in use):**  
> If port 8000 is occupied by a previously running process, free it with:
> ```powershell
> Stop-Process -Id (Get-NetTCPConnection -LocalPort 8000).OwningProcess -Force
> ```

---

### Step 3: Run the Frontend (Terminal 2)

Open a second PowerShell window:
```powershell
# 1. Navigate to frontend
cd frontend

# 2. Install dependencies (first time only)
npm install

# 3. Start Vite dev server
npm run dev
```

- **Application Dashboard:** `http://localhost:5173`

---

## Testing & Verification

- **Run backend test suite (45 unit & integration tests):**
  ```powershell
  python -m pytest backend/tests
  ```

- **Verify frontend production build:**
  ```powershell
  cd frontend
  npm run build
  ```

---

## Methodology & Emission Factors

| Factor | Value | Unit | Description | Source |
|---|---|---|---|---|
| `truck_per_km` | 0.27 | kg_co2_per_km | CO2 emissions per kilometer for a diesel waste collection truck | TODO: cite EPA or local transport authority data |
| `overflow_cleanup` | 2.5 | kg_co2_per_incident | CO2 cost of an emergency overflow cleanup (extra truck dispatch, cleaning) | TODO: cite waste management operational study |
| `landfill_per_kg` | 0.58 | kg_co2_per_kg | CO2 emissions per kg of waste sent to landfill | TODO: cite IPCC or EPA landfill emission factors |
| `recycling_offset_per_kg` | -0.31 | kg_co2_per_kg | CO2 offset per kg of waste successfully recycled (negative means savings) | TODO: cite recycling lifecycle analysis |
| `contamination_penalty` | 0.15 | kg_co2_per_contaminated_kg | Additional CO2 cost when contaminated waste cannot be recycled and goes to landfill | TODO: cite waste contamination impact study |
| `segregation_intervention_factor` | 0.3 | reduction_fraction | Fraction by which contamination is reduced after a segregation awareness intervention | TODO: cite behavioral intervention study |

---

## Author & Contact

- **Lead Engineer:** Nihar D Kiran
- **Email:** [nihardkiran@gmail.com](mailto:nihardkiran@gmail.com)
- **Telephone:** +91 9538196152
