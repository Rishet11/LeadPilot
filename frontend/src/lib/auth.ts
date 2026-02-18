// Auth utilities for managing bearer session token in localStorage

const AUTH_TOKEN_STORAGE_KEY = "leadpilot_auth_token";

export function getStoredAuthToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || "";
}

export function setStoredAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export function clearStoredAuthToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

export function isLoggedIn(): boolean {
  return !!getStoredAuthToken();
}
