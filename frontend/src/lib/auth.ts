// Auth utilities for managing API key in localStorage

const API_KEY_STORAGE_KEY = "leadpilot_api_key";

export function getStoredApiKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(API_KEY_STORAGE_KEY) || "";
}

export function setStoredApiKey(key: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
}

export function clearStoredApiKey(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(API_KEY_STORAGE_KEY);
}

export function isLoggedIn(): boolean {
  return !!getStoredApiKey();
}
