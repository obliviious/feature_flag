// Typed API client for FlagForge backend

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// ============================================================
// Types matching backend response structs
// ============================================================

export interface Project {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Environment {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface FlagVariant {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
}

export interface FlagEnvironmentState {
  environment_id: string;
  environment_name: string;
  environment_slug: string;
  enabled: boolean;
}

export interface Flag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  flag_type: string;
  tags: string[];
  archived: boolean;
  variants: FlagVariant[];
  environments: FlagEnvironmentState[];
  created_at: string;
  updated_at: string;
}

export interface Segment {
  id: string;
  key: string;
  name: string;
  description: string | null;
  match_type: string;
  constraints: SegmentConstraint[];
  created_at: string;
  updated_at: string;
}

export interface SegmentConstraint {
  id: string;
  attribute: string;
  operator: string;
  values: string[];
}

export interface SdkKey {
  id: string;
  environment_id: string;
  name: string;
  key_type: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

export interface CreateSdkKeyResponse extends SdkKey {
  raw_key: string;
}

export interface AuditLogEntry {
  id: string;
  project_id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_state: unknown;
  after_state: unknown;
  metadata: unknown;
  created_at: string;
}

// ============================================================
// API Client Factory
// ============================================================

export type GetToken = () => Promise<string | null>;

async function request<T>(
  getToken: GetToken,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export function createApi(getToken: GetToken) {
  const base = (projectId: string) => `/api/v1/projects/${projectId}`;

  return {
    // Projects
    listProjects: () => request<Project[]>(getToken, "/api/v1/projects"),

    getProject: (projectId: string) =>
      request<Project>(getToken, `/api/v1/projects/${projectId}`),

    // Flags
    listFlags: (projectId: string) =>
      request<Flag[]>(getToken, `${base(projectId)}/flags`),

    createFlag: (projectId: string, data: {
      key: string;
      name: string;
      description?: string;
      flag_type?: string;
      tags?: string[];
      variants: { key: string; value: unknown; description?: string }[];
      default_variant_key: string;
    }) =>
      request<Flag>(getToken, `${base(projectId)}/flags`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    toggleFlag: (projectId: string, flagKey: string, environmentId: string, enabled: boolean) =>
      request<{ flag_key: string; environment_id: string; enabled: boolean }>(
        getToken,
        `${base(projectId)}/flags/${flagKey}/toggle`,
        { method: "PATCH", body: JSON.stringify({ environment_id: environmentId, enabled }) }
      ),

    deleteFlag: (projectId: string, flagKey: string) =>
      request<void>(getToken, `${base(projectId)}/flags/${flagKey}`, {
        method: "DELETE",
      }),

    // Environments
    listEnvironments: (projectId: string) =>
      request<Environment[]>(getToken, `${base(projectId)}/environments`),

    // Segments
    listSegments: (projectId: string) =>
      request<Segment[]>(getToken, `${base(projectId)}/segments`),

    // SDK Keys
    listSdkKeys: (projectId: string) =>
      request<SdkKey[]>(getToken, `${base(projectId)}/sdk-keys`),

    createSdkKey: (projectId: string, data: {
      environment_id: string;
      name: string;
      key_type: string;
    }) =>
      request<CreateSdkKeyResponse>(getToken, `${base(projectId)}/sdk-keys`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    revokeSdkKey: (projectId: string, keyId: string) =>
      request<SdkKey>(getToken, `${base(projectId)}/sdk-keys/${keyId}/revoke`, {
        method: "POST",
      }),

    // Audit Log
    listAuditLog: (projectId: string, limit = 50, offset = 0) =>
      request<AuditLogEntry[]>(
        getToken,
        `${base(projectId)}/audit-log?limit=${limit}&offset=${offset}`
      ),
  };
}

export type Api = ReturnType<typeof createApi>;
