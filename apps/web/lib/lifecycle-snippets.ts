export interface LifecycleSnippetContext {
  projectId: string;
  apiUrl?: string;
}

const DEFAULT_API_URL = "https://your-flagforge-host.example.com";

export function buildScanScriptEnv(ctx: LifecycleSnippetContext): string {
  return `# Required secrets / env vars for scripts/scan-flag-refs.sh
export FLAGFORGE_API="${ctx.apiUrl ?? DEFAULT_API_URL}"
export FLAGFORGE_PROJECT_ID="${ctx.projectId}"
export FLAGFORGE_MGMT_KEY="mgmt_..."   # Settings → CI / Management Keys
export FLAGFORGE_BRANCH="main"         # optional
export FLAGFORGE_REPO="myorg/my-app"   # optional`;
}

export function buildScanCommand(): string {
  return `# From repo root (requires rg + jq + curl)
chmod +x scripts/scan-flag-refs.sh
./scripts/scan-flag-refs.sh`;
}

export function buildSingleFlagCurl(ctx: LifecycleSnippetContext, flagKey = "my-flag-key"): string {
  return `curl -X POST \\
  "${ctx.apiUrl ?? DEFAULT_API_URL}/api/v1/projects/${ctx.projectId}/flags/${flagKey}/code-refs" \\
  -H "Authorization: mgmt_YOUR_KEY_HERE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "branch": "main",
    "refs": [
      {
        "repo": "myorg/my-app",
        "commit_sha": "abc123",
        "file_path": "src/features/checkout.tsx",
        "line_number": 42,
        "snippet": "useBooleanFlag(\\"my-flag-key\\")"
      }
    ]
  }'`;
}

export function buildGithubSecretsList(): string {
  return `# GitHub repository secrets (Settings → Secrets → Actions)
FLAGFORGE_API_URL=https://your-flagforge-host.example.com
FLAGFORGE_PROJECT_ID=<project-uuid>
FLAGFORGE_MGMT_KEY=mgmt_...`;
}

export function buildClerkM2MNote(): string {
  return `# Alternative: Clerk machine token (Bearer) instead of mgmt_ key
# 1. Clerk Dashboard → Machines → Create machine
# 2. Create a JWT template or use Clerk Backend API to mint a token
# 3. Use: Authorization: Bearer <clerk-jwt>
#
# Recommended for self-hosted FlagForge: use mgmt_ keys (Settings → CI / Management Keys)
# They are project-scoped, revocable, and do not require Clerk M2M billing.`;
}
