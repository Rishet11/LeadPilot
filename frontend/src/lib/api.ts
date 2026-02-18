const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Import auth utilities
import { getStoredAuthToken } from "./auth";

// Helper to get headers with bearer token from localStorage
function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  const authToken = getStoredAuthToken();
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }
  return headers;
}

export interface Lead {
  id: number;
  name: string;
  phone: string | null;
  city: string | null;
  category: string | null;
  rating: number | null;
  reviews: number | null;
  website: string | null;
  instagram: string | null;
  email: string | null;
  maps_url: string | null;
  lead_score: number;
  reason: string | null;
  ai_outreach: string | null;
  source: string;
  status: string;
  country: string | null;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: number;
  job_type: string;
  targets: string;
  status: string;
  leads_found: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface LeadStats {
  total_leads: number;
  high_priority_leads: number;
  leads_by_status: Record<string, number>;
  leads_by_source: Record<string, number>;
}

export interface Setting {
  key: string;
  value: string;
  updated_at: string;
}

export interface UsageCurrent {
  period: string | null;
  leads_generated: number;
  scrape_jobs: number;
  remaining_credits: number | null;
  monthly_quota: number | null;
}

export interface CurrentPlan {
  plan_tier: string;
  monthly_lead_quota: number;
  instagram_enabled: boolean;
  max_concurrent_jobs: number;
  subscription_status: string;
}

export interface GoogleAuthResult {
  access_token: string;
  token_type: string;
  customer_id: number;
  email: string;
  name: string;
  plan_tier: string;
  is_new_customer: boolean;
}

export interface GeneratedGoogleTarget {
  city: string;
  category: string;
  limit: number;
}

export interface GeneratedInstagramTarget {
  keyword: string;
  limit: number;
  followers_min?: number;
  followers_max?: number;
  score_threshold?: number;
}

export interface TargetBuilderResponse {
  objective: string;
  google_maps_targets: GeneratedGoogleTarget[];
  instagram_targets: GeneratedInstagramTarget[];
  strategy: string;
  source: string;
  warnings: string[];
}

export interface AgentTemplate {
  id: string;
  name: string;
  vertical: string;
  ideal_for: string;
  objective: string;
  expected_outcome: string;
  google_maps_targets: GeneratedGoogleTarget[];
  instagram_targets: GeneratedInstagramTarget[];
}

// Error handling helper
async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function loginWithGoogleIdToken(idToken: string): Promise<GoogleAuthResult> {
  const res = await fetch(`${API_BASE}/api/auth/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id_token: idToken }),
  });
  return handleResponse<GoogleAuthResult>(res);
}

// Leads API
export async function getLeads(params?: {
  skip?: number;
  limit?: number;
  status?: string;
  source?: string;
  min_score?: number;
  city?: string;
  category?: string;
  no_website?: boolean;
}): Promise<Lead[]> {
  const searchParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.set(key, String(value));
    });
  }
  const res = await fetch(`${API_BASE}/api/leads?${searchParams}`, {
    headers: getHeaders(),
  });
  return handleResponse<Lead[]>(res);
}

export async function getLeadStats(): Promise<LeadStats> {
  const res = await fetch(`${API_BASE}/api/leads/stats`, {
    headers: getHeaders(),
  });
  return handleResponse<LeadStats>(res);
}

export async function updateLeadStatus(id: number, status: string): Promise<Lead> {
  const res = await fetch(`${API_BASE}/api/leads/${id}/status`, {
    method: "PATCH",
    headers: getHeaders(),
    body: JSON.stringify({ status }),
  });
  return handleResponse<Lead>(res);
}

export async function deleteLead(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/api/leads/${id}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete lead");
}

export async function batchDeleteLeads(ids: number[]): Promise<void> {
  const res = await fetch(`${API_BASE}/api/leads/batch-delete`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ lead_ids: ids }),
  });
  if (!res.ok) throw new Error("Failed to delete leads");
}

// Scrape API
export async function scrapeSingle(city: string, category: string, limit: number): Promise<{ job_id: number }> {
  const res = await fetch(`${API_BASE}/api/scrape/single`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ city, category, limit }),
  });
  return handleResponse<{ job_id: number }>(res);
}

export async function scrapeBatch(targets: { city: string; category: string; limit: number }[]): Promise<{ job_id: number }> {
  const res = await fetch(`${API_BASE}/api/scrape/google-maps`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ targets }),
  });
  return handleResponse<{ job_id: number }>(res);
}

export async function scrapeInstagram(targets: { 
  keyword: string; 
  limit: number;
  followers_min?: number;
  followers_max?: number;
  score_threshold?: number;
}[]): Promise<{ job_id: number }> {
  const res = await fetch(`${API_BASE}/api/scrape/instagram`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ targets }),
  });
  return handleResponse<{ job_id: number }>(res);
}

// Jobs API
export async function getJobs(limit = 20): Promise<Job[]> {
  const res = await fetch(`${API_BASE}/api/jobs/?limit=${limit}`, {
    headers: getHeaders(),
  });
  return handleResponse<Job[]>(res);
}

export async function getJob(id: number): Promise<Job> {
  const res = await fetch(`${API_BASE}/api/jobs/${id}`, {
    headers: getHeaders(),
  });
  return handleResponse<Job>(res);
}

// Settings API
export async function getSettings(): Promise<Setting[]> {
  const res = await fetch(`${API_BASE}/api/settings`, {
    headers: getHeaders(),
  });
  return handleResponse<Setting[]>(res);
}

export async function updateSetting(key: string, value: string): Promise<Setting> {
  const res = await fetch(`${API_BASE}/api/settings/${key}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify({ key, value }),
  });
  return handleResponse<Setting>(res);
}

export async function resetSettings(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/settings/reset`, {
    method: "POST",
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error("Failed to reset settings");
}

// Usage & Plan APIs
export async function getCurrentUsage(): Promise<UsageCurrent> {
  const res = await fetch(`${API_BASE}/api/usage/current`, {
    headers: getHeaders(),
  });
  return handleResponse<UsageCurrent>(res);
}

export async function getCurrentPlan(): Promise<CurrentPlan> {
  const res = await fetch(`${API_BASE}/api/plans/current`, {
    headers: getHeaders(),
  });
  return handleResponse<CurrentPlan>(res);
}

export async function generateTargetsFromObjective(payload: {
  objective: string;
  max_targets?: number;
  default_limit?: number;
  include_instagram?: boolean;
}): Promise<TargetBuilderResponse> {
  const res = await fetch(`${API_BASE}/api/agents/target-builder`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });
  return handleResponse<TargetBuilderResponse>(res);
}

export async function getAgentTemplates(vertical?: string): Promise<AgentTemplate[]> {
  const searchParams = new URLSearchParams();
  if (vertical) {
    searchParams.set("vertical", vertical);
  }

  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const res = await fetch(`${API_BASE}/api/agents/templates${suffix}`, {
    headers: getHeaders(),
  });
  return handleResponse<AgentTemplate[]>(res);
}
