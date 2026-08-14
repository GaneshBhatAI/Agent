# Database Schema & Entity Relationship

The Central Orchestrator utilizes PostgreSQL for relational entity management and time-indexed job logging.

---

## Entity Relationship Diagram

```mermaid
erDiagram
    USERS ||--o{ AUDIT_LOGS : performs
    MACHINES ||--o{ JOBS : executes
    REPOSITORIES ||--o{ JOBS : provides_code
    REPOSITORIES ||--o{ SCHEDULES : target_code
    MACHINES ||--o{ SCHEDULES : assigned_to
    JOBS ||--o{ JOB_LOGS : generates
    CREDENTIALS ||--o{ REPOSITORIES : authenticates

    USERS {
        int id PK
        string username UK
        string email UK
        string password_hash
        string role
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    MACHINES {
        int id PK
        string machine_name UK
        string machine_id UK
        string hostname
        string ip_address
        string operating_system
        string python_version
        string agent_version
        string status
        datetime last_heartbeat
        float cpu_usage
        float memory_usage
        float disk_usage
        string registration_token
        string agent_token_hash
        datetime registered_at
        datetime created_at
        datetime updated_at
    }

    REPOSITORIES {
        int id PK
        string github_owner
        string repository_name
        string repository_url
        string default_branch
        text description
        boolean is_private
        int credential_id FK
        datetime connected_at
        datetime created_at
        datetime updated_at
    }

    JOBS {
        int id PK
        string job_id UK
        int repository_id FK
        string repository_name
        string repository_url
        string branch
        string commit_sha
        string entry_point
        string machine_id FK
        string status
        json parameters
        json environment_variables
        datetime started_at
        datetime completed_at
        float duration_seconds
        int exit_code
        text error_message
        string error_type
        int retry_count
        int max_retries
        int timeout_seconds
        string created_by
        int schedule_id
        datetime created_at
        datetime updated_at
    }

    JOB_LOGS {
        int id PK
        string job_id FK
        datetime timestamp
        string level
        text message
    }

    SCHEDULES {
        int id PK
        string name UK
        int repository_id FK
        string repository_name
        string repository_url
        string branch
        string entry_point
        string machine_id FK
        string schedule_type
        string cron_expression
        int interval_minutes
        boolean enabled
        json parameters
        json environment_variables
        datetime next_run_at
        datetime last_run_at
        string last_job_id
        string created_by
        datetime created_at
        datetime updated_at
    }

    CREDENTIALS {
        int id PK
        string name UK
        string credential_type
        text encrypted_value
        string description
        string created_by
        datetime created_at
        datetime updated_at
    }

    AUDIT_LOGS {
        int id PK
        datetime timestamp
        int user_id FK
        string username
        string action
        string resource
        string resource_id
        json details
        string ip_address
    }
```

---

## Status Enumerations

### Machine Status
- `ONLINE`: Agent beaconing within heartbeat window and available for execution.
- `BUSY`: Agent currently running an active job.
- `OFFLINE`: Heartbeat timed out (> 45 seconds).
- `DISABLED`: Manually disabled by operator/admin.

### Job Status
- `QUEUED`: Job created in Control Room, awaiting machine poll.
- `ASSIGNED`: Dispatched to target machine agent.
- `PREPARING`: Workspace setup and Git checkout in progress.
- `INSTALLING_DEPENDENCIES`: Virtual environment creation and pip install in progress.
- `RUNNING`: Python subprocess executing.
- `SUCCESS`: Process completed with exit code 0.
- `FAILED`: Process completed with non-zero exit code or error.
- `CANCELLED`: Execution manually stopped by operator.
- `TIMEOUT`: Execution exceeded configured timeout duration.
