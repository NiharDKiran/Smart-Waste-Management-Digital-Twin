const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:8000' : '');

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

class ApiClient {
  private base: string;

  private token: string | null = null;

  constructor(baseUrl: string) {
    this.base = baseUrl;
    this.token = typeof window !== 'undefined' ? localStorage.getItem('ecotwin_token') : null;
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('ecotwin_token', token);
    } else {
      localStorage.removeItem('ecotwin_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.base}${path}`;
    const headers: Record<string, string> = {
      ...(options?.headers as Record<string, string>),
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorData: ApiError;
      try {
        errorData = await response.json();
      } catch {
        errorData = {
          error: `Request failed with status ${response.status}`,
          detail: response.statusText,
          retry: response.status >= 500,
        };
      }
      throw errorData;
    }

    return response.json();
  }

  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/api/health');
  }

  async getBins(): Promise<Bin[]> {
    return this.request<Bin[]>('/api/bins');
  }

  async getBin(id: number): Promise<Bin> {
    return this.request<Bin>(`/api/bins/${id}`);
  }

  async detect(file: File, binId?: number, useGemini: boolean = false): Promise<DetectionResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (binId !== undefined) {
      formData.append('bin_id', binId.toString());
    }
    if (useGemini) {
      formData.append('use_gemini', 'true');
    }
    return this.request<DetectionResponse>('/api/detect', {
      method: 'POST',
      body: formData,
    });
  }

  async simulate(hours: number, scenario?: ScenarioRequest): Promise<SimulationResponse> {
    return this.request<SimulationResponse>('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hours, scenario }),
    });
  }

  async getScenarios(): Promise<Scenario[]> {
    return this.request<Scenario[]>('/api/scenarios');
  }

  async saveScenario(scenario: ScenarioRequest): Promise<Scenario> {
    return this.request<Scenario>('/api/scenarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(scenario),
    });
  }

  async getRecommendations(): Promise<RecommendationResponse> {
    return this.request<RecommendationResponse>('/api/recommend', {
      method: 'POST',
    });
  }

  async login(username: string, password: string): Promise<{ access_token: string }> {
    const res = await this.request<{ access_token: string }>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    this.setToken(res.access_token);
    return res;
  }

  async authMe(): Promise<{ authenticated: boolean; username?: string }> {
    return this.request<{ authenticated: boolean; username?: string }>('/api/auth/me');
  }

  async adminResetTwin(): Promise<{ message: string; admin: string }> {
    return this.request<{ message: string; admin: string }>('/api/admin/reset-twin', {
      method: 'POST',
    });
  }

  logout() {
    this.setToken(null);
  }

  getReportUrl(): string {
    return `${this.base}/api/report`;
  }
}

export const api = new ApiClient(API_BASE);
