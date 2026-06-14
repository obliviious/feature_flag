// Typed API client for FlagForge backend
// All requests go through /api/proxy/... to avoid mixed-content (HTTPS→HTTP) issues.

const API_URL = "/api/proxy";

// ============================================================
// Types matching backend response structs
// ============================================================

export interface HealthResponse {
  status: string;
  version: string;
  database: string;
}

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

export type FlagLifecycleStatus = "active" | "deprecated" | "scheduled_cleanup";

export interface Flag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  flag_type: string;
  tags: string[];
  archived: boolean;
  owner_email: string | null;
  owner_name: string | null;
  lifecycle_status: FlagLifecycleStatus;
  stale_threshold_days: number | null;
  variants: FlagVariant[];
  environments: FlagEnvironmentState[];
  created_at: string;
  updated_at: string;
}

export interface StaleFlagSummary {
  id: string;
  key: string;
  name: string;
  description: string | null;
  flag_type: string;
  owner_email: string | null;
  owner_name: string | null;
  lifecycle_status: FlagLifecycleStatus;
  stale_threshold_days: number | null;
  created_at: string;
  last_activity_at: string | null;
  staleness_days: number;
  code_ref_count: number;
}

export interface CodeReference {
  id: string;
  flag_id: string;
  repo: string | null;
  branch: string | null;
  commit_sha: string | null;
  file_path: string;
  line_number: number | null;
  snippet: string | null;
  scanned_at: string;
}

export interface UpdateFlagLifecycleBody {
  owner_email?: string | null;
  owner_name?: string | null;
  lifecycle_status?: FlagLifecycleStatus;
  stale_threshold_days?: number | null;
}

export interface IngestCodeRefsBody {
  branch?: string;
  refs: Array<{
    repo?: string;
    branch?: string;
    commit_sha?: string;
    file_path: string;
    line_number?: number;
    snippet?: string;
  }>;
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

export interface ManagementApiKey {
  id: string;
  project_id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

export interface CreateManagementApiKeyResponse extends ManagementApiKey {
  raw_key: string;
}

export interface SdkConnectionInstance {
  sdk_instance_id: string;
  sdk_version: string;
  key_type: string;
  runtime: string;
  last_heartbeat_ts: number;
}

export interface SdkConnectionEnvironmentSummary {
  environment_id: string;
  environment_name: string;
  environment_slug: string;
  active_count: number;
  last_heartbeat_ts: number | null;
  active_instances: SdkConnectionInstance[];
}

export interface SdkConnectionsResponse {
  tracking_enabled: boolean;
  project_id: string;
  active_window_secs: number;
  generated_at: number;
  total_active_instances: number;
  environments_with_connections: number;
  environments_without_connections: number;
  environments: SdkConnectionEnvironmentSummary[];
}

export interface AuditLogDiffChange {
  field: string;
  before: unknown;
  after: unknown;
  kind: string;
}

export interface AuditLogEntry {
  id: string;
  project_id: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_type: string | null;
  actor_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_state: unknown;
  after_state: unknown;
  diff: {
    changes?: AuditLogDiffChange[];
    change_count?: number;
  } | null;
  metadata: unknown;
  severity: string;
  environment_id: string | null;
  environment_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  request_id: string | null;
  created_at: string;
}

export interface AuditLogQuery {
  limit?: number;
  offset?: number;
  actor_email?: string;
  action?: string;
  entity_type?: string;
  entity_id?: string;
  severity?: string;
  environment_id?: string;
  since_hours?: number;
}

export const SEGMENT_OPERATORS = [
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "not_in",
  "contains",
  "starts_with",
  "ends_with",
  "matches",
  "semver_eq",
  "semver_gt",
  "semver_lt",
] as const;

// ============================================================
// Targeting Rules & Overrides
// ============================================================

export interface RuleSegment {
  id: string;
  segment_id: string;
  negate: boolean;
}

export interface RuleDistribution {
  id: string;
  variant_id: string;
  /** 0–100 integer */
  percentage: number;
}

export interface TargetingRule {
  id: string;
  flag_environment_id: string;
  rank: number;
  description: string | null;
  /** Serve a single variant when all segments match. Null when using distributions. */
  variant_id: string | null;
  segments: RuleSegment[];
  distributions: RuleDistribution[];
  created_at: string;
  updated_at: string;
}

export interface FlagOverride {
  id: string;
  targeting_key: string;
  variant_id: string;
  created_at: string;
}

export const AUDIT_ACTIONS = [
  "flag_created",
  "flag_updated",
  "flag_deleted",
  "flag_toggled",
  "flag_lifecycle_updated",
  "management_key_created",
  "management_key_revoked",
  "segment_created",
  "environment_created",
  "sdk_key_created",
  "sdk_key_revoked",
  "project_created",
] as const;

export const AUDIT_SEVERITIES = ["info", "warning", "critical"] as const;

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

function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export interface SetupResponse {
  organization_id: string;
  project_id: string;
  environments: {
    id: string;
    name: string;
    slug: string;
    server_key: string;
    client_key: string;
  }[];
}

export function createApi(getToken: GetToken) {
  const base = (projectId: string) => `/api/v1/projects/${projectId}`;

  return {
    // Health (public)
    getHealth: () => request<HealthResponse>(getToken, "/health"),

    // Setup (bootstrap org + project + envs + keys)
    setup: (data: {
      org_name: string;
      org_slug: string;
      project_name: string;
      project_slug: string;
    }) =>
      request<SetupResponse>(getToken, "/api/v1/setup", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    // Projects
    listProjects: () => request<Project[]>(getToken, "/api/v1/projects"),

    getProject: (projectId: string) =>
      request<Project>(getToken, `/api/v1/projects/${projectId}`),

    // Flags
    listFlags: (projectId: string) =>
      request<Flag[]>(getToken, `${base(projectId)}/flags`),

    getFlag: (projectId: string, flagKey: string) =>
      request<Flag>(getToken, `${base(projectId)}/flags/${encodeURIComponent(flagKey)}`),

    createFlag: (
      projectId: string,
      data: {
        key: string;
        name: string;
        description?: string;
        flag_type?: string;
        tags?: string[];
        variants: { key: string; value: unknown; description?: string }[];
        default_variant_key: string;
      }
    ) =>
      request<Flag>(getToken, `${base(projectId)}/flags`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    toggleFlag: (
      projectId: string,
      flagKey: string,
      environmentId: string,
      enabled: boolean
    ) =>
      request<{ flag_key: string; environment_id: string; enabled: boolean }>(
        getToken,
        `${base(projectId)}/flags/${encodeURIComponent(flagKey)}/toggle`,
        { method: "PATCH", body: JSON.stringify({ environment_id: environmentId, enabled }) }
      ),

    updateFlag: (
      projectId: string,
      flagKey: string,
      data: {
        name?: string;
        description?: string;
        tags?: string[];
        archived?: boolean;
      }
    ) =>
      request<Flag>(getToken, `${base(projectId)}/flags/${encodeURIComponent(flagKey)}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    updateFlagVariants: (
      projectId: string,
      flagKey: string,
      variants: { id: string; key: string; value: unknown; description?: string }[]
    ) =>
      request<Flag>(getToken, `${base(projectId)}/flags/${encodeURIComponent(flagKey)}/variants`, {
        method: "PUT",
        body: JSON.stringify({ variants }),
      }),

    deleteFlag: (projectId: string, flagKey: string) =>
      request<void>(getToken, `${base(projectId)}/flags/${encodeURIComponent(flagKey)}`, {
        method: "DELETE",
      }),

    // Lifecycle management
    getStaleFlags: (projectId: string, thresholdDays?: number) =>
      request<StaleFlagSummary[]>(
        getToken,
        `${base(projectId)}/lifecycle/stale${thresholdDays !== undefined ? `?threshold_days=${thresholdDays}` : ""}`
      ),

    updateFlagLifecycle: (projectId: string, flagKey: string, data: UpdateFlagLifecycleBody) =>
      request<Flag>(
        getToken,
        `${base(projectId)}/flags/${encodeURIComponent(flagKey)}/lifecycle`,
        { method: "PATCH", body: JSON.stringify(data) }
      ),

    getCodeRefs: (projectId: string, flagKey: string) =>
      request<CodeReference[]>(
        getToken,
        `${base(projectId)}/flags/${encodeURIComponent(flagKey)}/code-refs`
      ),

    ingestCodeRefs: (projectId: string, flagKey: string, data: IngestCodeRefsBody) =>
      request<{ flag_key: string; refs_ingested: number; branch: string | null }>(
        getToken,
        `${base(projectId)}/flags/${encodeURIComponent(flagKey)}/code-refs`,
        { method: "POST", body: JSON.stringify(data) }
      ),

    // Environments
    listEnvironments: (projectId: string) =>
      request<Environment[]>(getToken, `${base(projectId)}/environments`),

    createEnvironment: (
      projectId: string,
      data: { name: string; slug: string; color?: string }
    ) =>
      request<Environment>(getToken, `${base(projectId)}/environments`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    // Segments
    listSegments: (projectId: string) =>
      request<Segment[]>(getToken, `${base(projectId)}/segments`),

    getSegment: (projectId: string, segmentId: string) =>
      request<Segment>(getToken, `${base(projectId)}/segments/${segmentId}`),

    createSegment: (
      projectId: string,
      data: {
        key: string;
        name: string;
        description?: string;
        match_type?: string;
        constraints?: { attribute: string; operator: string; values: string[] }[];
      }
    ) =>
      request<Segment>(getToken, `${base(projectId)}/segments`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    // SDK Keys
    listSdkKeys: (projectId: string) =>
      request<SdkKey[]>(getToken, `${base(projectId)}/sdk-keys`),

    createSdkKey: (
      projectId: string,
      data: { environment_id: string; name: string; key_type: string }
    ) =>
      request<CreateSdkKeyResponse>(getToken, `${base(projectId)}/sdk-keys`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    revokeSdkKey: (projectId: string, keyId: string) =>
      request<SdkKey>(getToken, `${base(projectId)}/sdk-keys/${keyId}/revoke`, {
        method: "POST",
      }),

    // Management API keys (CI / automation)
    listManagementKeys: (projectId: string) =>
      request<ManagementApiKey[]>(getToken, `${base(projectId)}/management-keys`),

    createManagementKey: (projectId: string, data: { name: string }) =>
      request<CreateManagementApiKeyResponse>(getToken, `${base(projectId)}/management-keys`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    revokeManagementKey: (projectId: string, keyId: string) =>
      request<ManagementApiKey>(
        getToken,
        `${base(projectId)}/management-keys/${keyId}/revoke`,
        { method: "POST" }
      ),

    listSdkConnections: (projectId: string, activeWindowSecs = 60) =>
      request<SdkConnectionsResponse>(
        getToken,
        `${base(projectId)}/sdk-connections${buildQuery({ active_window_secs: activeWindowSecs })}`
      ),

    // Targeting Rules
    listRules: (projectId: string, flagKey: string, environmentId: string) =>
      request<TargetingRule[]>(
        getToken,
        `${base(projectId)}/flags/${encodeURIComponent(flagKey)}/environments/${environmentId}/rules`
      ),

    createRule: (
      projectId: string,
      flagKey: string,
      environmentId: string,
      data: {
        rank: number;
        description?: string;
        variant_id?: string;
        segments?: { segment_id: string; negate?: boolean }[];
        distributions?: { variant_id: string; percentage: number }[];
      }
    ) =>
      request<TargetingRule>(
        getToken,
        `${base(projectId)}/flags/${encodeURIComponent(flagKey)}/environments/${environmentId}/rules`,
        { method: "POST", body: JSON.stringify(data) }
      ),

    updateRule: (
      projectId: string,
      flagKey: string,
      environmentId: string,
      ruleId: string,
      data: {
        rank?: number;
        description?: string;
        variant_id?: string;
        segments?: { segment_id: string; negate?: boolean }[];
        distributions?: { variant_id: string; percentage: number }[];
      }
    ) =>
      request<TargetingRule>(
        getToken,
        `${base(projectId)}/flags/${encodeURIComponent(flagKey)}/environments/${environmentId}/rules/${ruleId}`,
        { method: "PUT", body: JSON.stringify(data) }
      ),

    deleteRule: (
      projectId: string,
      flagKey: string,
      environmentId: string,
      ruleId: string
    ) =>
      request<void>(
        getToken,
        `${base(projectId)}/flags/${encodeURIComponent(flagKey)}/environments/${environmentId}/rules/${ruleId}`,
        { method: "DELETE" }
      ),

    // Flag Overrides
    listOverrides: (projectId: string, flagKey: string, environmentId: string) =>
      request<FlagOverride[]>(
        getToken,
        `${base(projectId)}/flags/${encodeURIComponent(flagKey)}/environments/${environmentId}/overrides`
      ),

    upsertOverride: (
      projectId: string,
      flagKey: string,
      environmentId: string,
      targeting_key: string,
      variant_id: string
    ) =>
      request<FlagOverride>(
        getToken,
        `${base(projectId)}/flags/${encodeURIComponent(flagKey)}/environments/${environmentId}/overrides`,
        { method: "PUT", body: JSON.stringify({ targeting_key, variant_id }) }
      ),

    deleteOverride: (
      projectId: string,
      flagKey: string,
      environmentId: string,
      targeting_key: string
    ) =>
      request<void>(
        getToken,
        `${base(projectId)}/flags/${encodeURIComponent(flagKey)}/environments/${environmentId}/overrides/${encodeURIComponent(targeting_key)}`,
        { method: "DELETE" }
      ),

    // Audit Log
    listAuditLog: (projectId: string, query: AuditLogQuery = {}) =>
      request<AuditLogEntry[]>(
        getToken,
        `${base(projectId)}/audit-log${buildQuery({
          limit: query.limit ?? 50,
          offset: query.offset ?? 0,
          actor_email: query.actor_email,
          action: query.action,
          entity_type: query.entity_type,
          entity_id: query.entity_id,
          severity: query.severity,
          environment_id: query.environment_id,
          since_hours: query.since_hours,
        })}`
      ),
  };
}

export type Api = ReturnType<typeof createApi>;
