import { API_URL, getAuthHeaders } from './documents';

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...getAuthHeaders(),
      ...(init?.headers as Record<string, string> | undefined),
    },
  });
}

export interface CostTotals {
  pagesIngested: number;
  visionCalls: number;
  embeddingBatches: number;
  chatCalls: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  rateLimitHits: number;
  estimatedCostUsd: number;
}

export interface DailyUsage {
  date: string;
  pagesIngested: number;
  visionCalls: number;
  embeddingBatches: number;
  chatCalls: number;
  totalTokens: number;
  rateLimitHits: number;
  estimatedCostUsd: number;
}

export interface RecentCostEvent {
  occurredAt: string;
  eventType: string;
  quantity: number;
  estimatedCostUsd: number;
  metadata: string;
}

export interface CostDashboardResponse {
  totals: CostTotals;
  dailyUsage: DailyUsage[];
  recentEvents: RecentCostEvent[];
}

export async function fetchCostDashboard(): Promise<CostDashboardResponse> {
  const res = await apiFetch('/api/v1/users/me/cost-dashboard');
  if (!res.ok) throw new Error(`Failed to fetch cost dashboard: ${res.statusText}`);
  return res.json();
}
