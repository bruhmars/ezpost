const API = "/api";
const TOKEN_KEY = "crosspost_token";

export type Platform =
  | "pinterest"
  | "twitter"
  | "instagram"
  | "linkedin"
  | "facebook";

export interface User {
  id: number;
  email: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Account {
  id: number;
  platform: Platform;
  platform_user_id: string;
  username: string;
  created_at: string;
  watched?: boolean;
}

export interface PendingPost {
  id: number;
  source_account_id: number;
  source_post_id: string;
  title: string;
  description: string;
  link: string;
  media: Array<{ url: string; type: "image" | "video" }>;
  media_type: "image" | "video";
  source_platform: Platform;
  source_username: string;
  created_at: string;
}

export interface ActivityItem {
  id: number;
  event_type: string;
  summary: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface SyncHistoryItem {
  id: number;
  source_post_id: string;
  destination_post_id: string | null;
  status: string;
  error_message: string | null;
  synced_at: string;
  media_type: string;
  source_platform: Platform;
  dest_platform: Platform;
  dest_username?: string;
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function formatError(err: unknown): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    if ("error" in err && typeof (err as { error: unknown }).error === "string") {
      return (err as { error: string }).error;
    }
    const fields = (err as { error?: Record<string, string[]> }).error;
    if (fields && typeof fields === "object") {
      const first = Object.values(fields).flat()[0];
      if (first) return first;
    }
  }
  return "Request failed";
}

async function request<T>(path: string, init?: RequestInit, auth = true): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (auth) {
    const token = getStoredToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(formatError(err));
  }
  return res.json() as Promise<T>;
}

export const api = {
  signup: (body: { email: string; password: string; name?: string }) =>
    request<AuthResponse>("/users/signup", { method: "POST", body: JSON.stringify(body) }, false),

  signin: (body: { email: string; password: string }) =>
    request<AuthResponse>("/users/signin", { method: "POST", body: JSON.stringify(body) }, false),

  me: () => request<{ user: User }>("/users/me"),

  health: () => request<{ status: string }>("/health", undefined, false),
  platforms: () =>
    request<{ supported: Platform[]; mediaOnly: boolean }>("/platforms"),
  accounts: () => request<Account[]>("/watch"),
  setWatched: (accountId: number, watched: boolean) =>
    request<{ ok: boolean }>(`/watch/${accountId}`, {
      method: "PATCH",
      body: JSON.stringify({ watched }),
    }),
  deleteAccount: (id: number) =>
    request<{ ok: boolean }>(`/accounts/${id}`, { method: "DELETE" }),
  startAuth: (platform: Platform) =>
    request<{ url: string }>(`/auth/${platform}/start`),
  pending: () => request<PendingPost[]>("/pending"),
  publishPending: (id: number, destination_account_ids: number[]) =>
    request<{ published: number; errors: string[] }>(`/pending/${id}/publish`, {
      method: "POST",
      body: JSON.stringify({ destination_account_ids }),
    }),
  dismissPending: (id: number) =>
    request<{ ok: boolean }>(`/pending/${id}/dismiss`, { method: "POST" }),
  activity: () => request<ActivityItem[]>("/activity"),
  history: () => request<SyncHistoryItem[]>("/history"),
};
