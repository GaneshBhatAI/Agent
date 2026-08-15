export type UserRole = 'ADMIN' | 'OPERATOR' | 'VIEWER';

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

export type MachineStatus = 'ONLINE' | 'OFFLINE' | 'BUSY' | 'DISABLED';

export interface Machine {
  id: number;
  machine_id: string;
  machine_name: string;
  hostname?: string;
  ip_address?: string;
  operating_system?: string;
  python_version?: string;
  agent_version?: string;
  status: MachineStatus;
  last_heartbeat?: string;
  cpu_usage?: number;
  memory_usage?: number;
  disk_usage?: number;
  current_job_id?: string;
  registered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MachineRegistrationTokenResponse {
  machine_name: string;
  registration_token: string;
  expires_in_hours: number;
}

export interface GitHubRepoItem {
  id?: number;
  name?: string;
  repository_name?: string;
  full_name?: string;
  owner?: string;
  github_owner?: string;
  html_url?: string;
  url?: string;
  repository_url?: string;
  description?: string;
  default_branch?: string;
  private?: boolean;
  is_private?: boolean;
  language?: string;
  updated_at?: string;
}

export interface GitHubBranchItem {
  name: string;
  commit_sha?: string;
  protected?: boolean;
  is_default?: boolean;
}

export interface GitHubFileItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  is_python?: boolean;
  is_python_file?: boolean;
  is_dependency_file?: boolean;
}

export interface GitHubCommitItem {
  sha: string;
  message: string;
  author: string;
  date: string;
  url?: string;
}

export type JobStatus =
  | 'QUEUED'
  | 'ASSIGNED'
  | 'PREPARING'
  | 'INSTALLING_DEPENDENCIES'
  | 'RUNNING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED'
  | 'TIMEOUT';

export type ErrorType = 'NONE' | 'INFRASTRUCTURE_ERROR' | 'APPLICATION_ERROR';

export interface Job {
  id: number;
  job_id: string;
  repository_id?: number;
  repository_name: string;
  repository_url: string;
  branch: string;
  commit_sha?: string;
  entry_point: string;
  machine_id: string;
  machine_name?: string;
  status: JobStatus;
  parameters?: string[];
  environment_variables?: Record<string, string>;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  exit_code?: number;
  error_message?: string;
  error_type: ErrorType;
  retry_count: number;
  max_retries: number;
  timeout_seconds: number;
  created_by: string;
  schedule_id?: number;
  created_at: string;
  updated_at: string;
}

export type LogLevel = 'INFO' | 'WARNING' | 'ERROR' | 'DEBUG';

export interface JobLog {
  id: number;
  job_id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
}

export type ScheduleType = 'CRON' | 'INTERVAL' | 'ONCE';

export interface Schedule {
  id: number;
  name: string;
  repository_id?: number;
  repository_name: string;
  repository_url: string;
  branch: string;
  entry_point: string;
  machine_id: string;
  schedule_type: ScheduleType;
  cron_expression?: string;
  interval_minutes?: number;
  enabled: boolean;
  parameters?: string[];
  environment_variables?: Record<string, string>;
  next_run_at?: string;
  last_run_at?: string;
  last_job_id?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Credential {
  id: number;
  name: string;
  credential_type: 'GITHUB_PAT' | 'GITHUB_APP' | 'API_KEY' | 'GENERIC_SECRET' | string;
  description?: string;
  created_by: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  username: string;
  action: string;
  resource: string;
  resource_id?: string;
  details?: Record<string, any>;
  ip_address?: string;
}

export interface DashboardStats {
  total_machines?: number;
  online_machines?: number;
  busy_machines?: number;
  total_jobs?: number;
  successful_jobs?: number;
  failed_jobs?: number;
  active_schedules?: number;
  machines?: Machine[] | {
    total: number;
    online: number;
    busy: number;
    offline: number;
    disabled: number;
  };
  jobs?: {
    total_today: number;
    running: number;
    queued: number;
    success: number;
    failed: number;
    cancelled: number;
    success_rate_percent: number;
  };
  recent_jobs: Job[];
  active_schedules_count?: number;
  connected_repos_count?: number;
}
