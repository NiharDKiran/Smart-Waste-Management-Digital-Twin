import axios, { AxiosInstance, AxiosError } from "axios";

// ── Base URL resolution ──
// In production, set VITE_API_URL to your backend (e.g. https://ecotwin-api.onrender.com)
// In dev, Vite's proxy in vite.config.ts forwards /api/* to localhost:8000
const API_BASE: string =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:8000" : "");

// ── Interfaces ──

export interface WasteTypeMix {
  wet: number;
  dry: number;
  recyclable: number;
  hazardous: number;
}

export interface Bin {
  id: number;
  name: string;
  zone_id: number;
  zone_name: string;
  zone_type: string;
  latitude: number;
  longitude: number;
  capacity_liters: number;
  fill_level: number;
  per_hour_fill_rate: number;
  waste_type_mix: WasteTypeMix;
  contamination_score: number;
  last_collected: string;
  hours_until_overflow: number | null;
  overflow_risk: boolean;
  data_source: string;
}

export interface DetectionResult {
  waste_class: string;
  confidence: number;
  raw_label: string;
  description: string;
  bbox?: number[];
  data_source: string;
}

export interface DetectionResponse {
  detections: DetectionResult[];
  bin_updated: boolean;
  bin_id: number | null;
  message: string;
}

export interface MetricsSnapshot {
  overflow_incidents: number;
  total_truck_distance_km: number;
  avg_contamination_rate: number;
  estimated_co2_kg: number;
  bins_at_risk: number;
  avg_fill_level: number;
  data_source: string;
}

export interface SimulationResponse {
  baseline: MetricsSnapshot;
  scenario: MetricsSnapshot | null;
  diff: Record<string, number> | null;
  hours_simulated: number;
  data_source: string;
}

export interface ScenarioRequest {
  name: string;
  description?: string;
  scenario_type: string;
  parameters: Record<string, unknown>;
  simulation_hours?: number;
}

export interface Scenario {
  id: number;
  name: string;
  description: string;
  scenario_type: string;
  parameters: Record<string, unknown>;
  baseline_metrics: MetricsSnapshot | null;
  scenario_metrics: MetricsSnapshot | null;
  diff_metrics: Record<string, number> | null;
  created_at: string;
  data_source: string;
}

export interface RecommendationIssue {
  title: string;
  severity: string;
  description: string;
  affected_zones: string[];
  affected_bins: number[];
}

export interface RecommendationAction {
  title: string;
  description: string;
  priority: string;
  scenario_type: string | null;
  scenario_parameters: Record<string, unknown> | null;
  estimated_impact: string;
}

export interface RecommendationExpectedImpact {
  overflow_reduction_pct: number;
  contamination_reduction_pct: number;
  co2_reduction_pct: number;
  efficiency_improvement_pct: number;
}

export interface RecommendationResponse {
  issues: RecommendationIssue[];
  actions: RecommendationAction[];
  expected_impact: RecommendationExpectedImpact;
  assumptions: string[];
  is_cached: boolean;
  data_source: string;
  timestamp?: string | null;
}

export interface HealthResponse {
  status: string;
  version: string;
  database: string;
  detector: string;
}

export interface ApiError {
  error: string;
  detail: string;
  retry: boolean;
}

// ── Axios-based API Client ──

class ApiClient {
  private http: AxiosInstance;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.token =
      typeof window !== "undefined"
        ? localStorage.getItem("ecotwin_token")
        : null;

    this.http = axios.create({
      baseURL: baseUrl,
      timeout: 60_000, // 60s for long inference calls
    });

    // ── Request interceptor: attach JWT when present ──
    this.http.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // ── Response interceptor: normalise errors into ApiError shape ──
    this.http.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        let apiError: ApiError;

        if (error.response) {
          // Server responded with a non-2xx status
          const data = error.response.data as Record<string, unknown> | undefined;
          apiError = {
            error:
              (data?.error as string) ??
              `Request failed with status ${error.response.status}`,
            detail: (data?.detail as string) ?? error.response.statusText ?? "",
            retry: error.response.status >= 500,
          };
        } else if (error.request) {
          // Request was sent but no response received (network / CORS)
          apiError = {
            error: "Network error",
            detail:
              "Could not reach the API server. Check your connection or VITE_API_URL.",
            retry: true,
          };
        } else {
          apiError = {
            error: "Request setup error",
            detail: error.message,
            retry: false,
          };
        }

        return Promise.reject(apiError);
      },
    );
  }

  // ── Token helpers ──

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem("ecotwin_token", token);
    } else {
      localStorage.removeItem("ecotwin_token");
    }
  }

  getToken(): string | null {
    return this.token;
  }

  // ── Public endpoints ──

  async health(): Promise<HealthResponse> {
    const { data } = await this.http.get<HealthResponse>("/api/health");
    return data;
  }

  async getBins(): Promise<Bin[]> {
    const { data } = await this.http.get<Bin[]>("/api/bins");
    return data;
  }

  async getBin(id: number): Promise<Bin> {
    const { data } = await this.http.get<Bin>(`/api/bins/${id}`);
    return data;
  }

  async detect(
    file: File,
    binId?: number,
    useGemini: boolean = false,
  ): Promise<DetectionResponse> {
    const formData = new FormData();
    formData.append("file", file);
    if (binId !== undefined) {
      formData.append("bin_id", binId.toString());
    }
    if (useGemini) {
      formData.append("use_gemini", "true");
    }

    const { data } = await this.http.post<DetectionResponse>(
      "/api/detect",
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120_000, // image uploads may be slow
      },
    );
    return data;
  }

  async simulate(
    hours: number,
    scenario?: ScenarioRequest,
  ): Promise<SimulationResponse> {
    const { data } = await this.http.post<SimulationResponse>(
      "/api/simulate",
      { hours, scenario },
    );
    return data;
  }

  async getScenarios(): Promise<Scenario[]> {
    const { data } = await this.http.get<Scenario[]>("/api/scenarios");
    return data;
  }

  async saveScenario(scenario: ScenarioRequest): Promise<Scenario> {
    const { data } = await this.http.post<Scenario>(
      "/api/scenarios",
      scenario,
    );
    return data;
  }

  async getRecommendations(): Promise<RecommendationResponse> {
    const { data } = await this.http.post<RecommendationResponse>(
      "/api/recommend",
    );
    return data;
  }

  async authMe(): Promise<{ authenticated: boolean; username?: string }> {
    const { data } = await this.http.get<{
      authenticated: boolean;
      username?: string;
    }>("/api/auth/me");
    return data;
  }

  async adminResetTwin(): Promise<{ message: string; admin: string }> {
    const { data } = await this.http.post<{
      message: string;
      admin: string;
    }>("/api/admin/reset-twin");
    return data;
  }

  logout() {
    this.setToken(null);
  }

  getReportUrl(): string {
    return `${this.http.defaults.baseURL}/api/report`;
  }
}

export const api = new ApiClient(API_BASE);
