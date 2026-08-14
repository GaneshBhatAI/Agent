import axios from 'axios';
import { supabase } from './supabase';

const savedApiUrl = localStorage.getItem('orchestrator_api_url');
export const API_BASE_URL = savedApiUrl || (window.location.hostname === 'localhost' ? 'http://localhost:8000/api' : '/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000,
});

// Attach JWT token to outgoing requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('orchestrator_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Mock / Client-Side State for Static Hosting (GitHub Pages)
const getLocalData = (key: string, defaultVal: any) => {
  const raw = localStorage.getItem(`orchestrator_data_${key}`);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {}
  }
  return defaultVal;
};

const setLocalData = (key: string, data: any) => {
  localStorage.setItem(`orchestrator_data_${key}`, JSON.stringify(data));
};

// Seed initial demo data
if (!localStorage.getItem('orchestrator_data_machines')) {
  setLocalData('machines', [
    {
      id: 1,
      machine_name: 'Machine-A',
      machine_id: 'MACH-1024',
      hostname: 'DESKTOP-WIN11-PRO',
      operating_system: 'Windows 11 Enterprise',
      python_version: '3.11.0',
      agent_version: '1.0.0',
      status: 'ONLINE',
      last_heartbeat: new Date().toISOString(),
      cpu_usage: 18.5,
      memory_usage: 42.0,
      disk_usage: 55.4,
      registered_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);
}

if (!localStorage.getItem('orchestrator_data_repositories')) {
  setLocalData('repositories', [
    {
      id: 1,
      github_owner: 'orchestrator-demo',
      repository_name: 'hello-bot',
      repository_url: 'https://github.com/orchestrator-demo/hello-bot',
      default_branch: 'main',
      description: 'Starter demonstration bot with requirements.txt and main.py',
      is_private: false,
      connected_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 2,
      github_owner: 'orchestrator-demo',
      repository_name: 'invoice-automation',
      repository_url: 'https://github.com/orchestrator-demo/invoice-automation',
      default_branch: 'main',
      description: 'Invoice OCR extraction and ERP sync bot',
      is_private: false,
      connected_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);
}

if (!localStorage.getItem('orchestrator_data_jobs')) {
  setLocalData('jobs', [
    {
      id: 1,
      job_id: 'JOB-90241',
      repository_name: 'hello-bot',
      repository_url: 'https://github.com/orchestrator-demo/hello-bot',
      branch: 'main',
      commit_sha: 'a1b2c3d4e5f6',
      entry_point: 'main.py',
      machine_id: 'MACH-1024',
      status: 'SUCCESS',
      parameters: ['--env', 'production'],
      started_at: new Date(Date.now() - 3600000).toISOString(),
      completed_at: new Date(Date.now() - 3570000).toISOString(),
      duration_seconds: 30.5,
      exit_code: 0,
      created_by: 'admin',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3570000).toISOString(),
    },
  ]);
}

// Fallback interceptor to provide seamless responses on static host
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config } = error;
    if (!config || !config.url) return Promise.reject(error);

    const url = config.url.replace(api.defaults.baseURL || '', '').replace(/^\//, '');
    const method = (config.method || 'get').toLowerCase();

    // 1. Dashboard summary
    if (url === 'dashboard' && method === 'get') {
      const machines = getLocalData('machines', []);
      const jobs = getLocalData('jobs', []);
      return {
        data: {
          total_machines: machines.length,
          online_machines: machines.filter((m: any) => m.status === 'ONLINE').length,
          busy_machines: machines.filter((m: any) => m.status === 'BUSY').length,
          total_jobs: jobs.length,
          successful_jobs: jobs.filter((j: any) => j.status === 'SUCCESS').length,
          failed_jobs: jobs.filter((j: any) => j.status === 'FAILED').length,
          active_schedules: getLocalData('schedules', []).filter((s: any) => s.enabled).length,
          recent_jobs: jobs.slice(0, 5),
          machines: machines,
        },
      };
    }

    // 2. Machines
    if (url === 'machines' && method === 'get') {
      return { data: getLocalData('machines', []) };
    }
    if (url === 'machines/generate-token' && method === 'post') {
      const body = JSON.parse(config.data || '{}');
      const token = 'reg_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      return {
        data: {
          machine_name: body.machine_name || 'Machine-A',
          registration_token: token,
          expires_in_hours: 24,
        },
      };
    }
    if (url.startsWith('machines/') && method === 'get') {
      const mId = url.split('/')[1];
      const machines = getLocalData('machines', []);
      const match = machines.find((m: any) => m.machine_id === mId || String(m.id) === mId);
      return { data: match || machines[0] };
    }

    // 3. Repositories
    if (url === 'github/repositories' && method === 'get') {
      return { data: getLocalData('repositories', []) };
    }
    if (url.startsWith('github/repositories/') && url.endsWith('/branches')) {
      return { data: [{ name: 'main', commit_sha: 'a1b2c3d4e5f6', is_default: true }] };
    }
    if (url.startsWith('github/repositories/') && url.includes('/files')) {
      return {
        data: [
          { name: 'main.py', path: 'main.py', type: 'file', is_python_file: true },
          { name: 'requirements.txt', path: 'requirements.txt', type: 'file', is_python_file: false },
          { name: 'README.md', path: 'README.md', type: 'file', is_python_file: false },
        ],
      };
    }

    // 4. Jobs
    if (url === 'jobs' && method === 'get') {
      return { data: getLocalData('jobs', []) };
    }
    if (url === 'jobs' && method === 'post') {
      const body = JSON.parse(config.data || '{}');
      const newJob = {
        id: Date.now(),
        job_id: 'JOB-' + Math.floor(10000 + Math.random() * 90000),
        repository_name: body.repository_name,
        repository_url: body.repository_url,
        branch: body.branch || 'main',
        commit_sha: body.commit_sha || 'a1b2c3d4e5f6',
        entry_point: body.entry_point || 'main.py',
        machine_id: body.machine_id,
        status: 'RUNNING',
        parameters: body.parameters || [],
        started_at: new Date().toISOString(),
        completed_at: null,
        duration_seconds: null,
        exit_code: null,
        created_by: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const jobs = [newJob, ...getLocalData('jobs', [])];
      setLocalData('jobs', jobs);
      return { data: newJob };
    }
    if (url.startsWith('jobs/') && url.endsWith('/logs')) {
      return {
        data: [
          { id: 1, timestamp: new Date().toISOString(), level: 'INFO', message: 'Workspace initialized' },
          { id: 2, timestamp: new Date().toISOString(), level: 'INFO', message: 'Git checkout commit a1b2c3d4...' },
          { id: 3, timestamp: new Date().toISOString(), level: 'INFO', message: 'Isolated Python virtualenv active' },
          { id: 4, timestamp: new Date().toISOString(), level: 'INFO', message: 'Executing main.py...' },
          { id: 5, timestamp: new Date().toISOString(), level: 'INFO', message: 'Task completed successfully (Exit Code: 0)' },
        ],
      };
    }
    if (url.startsWith('jobs/') && method === 'get') {
      const jId = url.split('/')[1];
      const jobs = getLocalData('jobs', []);
      const match = jobs.find((j: any) => j.job_id === jId || String(j.id) === jId);
      return { data: match || jobs[0] };
    }

    // 5. Schedules
    if (url === 'schedules' && method === 'get') {
      return { data: getLocalData('schedules', []) };
    }
    if (url === 'schedules' && method === 'post') {
      const body = JSON.parse(config.data || '{}');
      const newSched = {
        id: Date.now(),
        name: body.name,
        repository_name: body.repository_name,
        repository_url: body.repository_url,
        branch: body.branch || 'main',
        entry_point: body.entry_point || 'main.py',
        machine_id: body.machine_id,
        schedule_type: body.schedule_type || 'CRON',
        cron_expression: body.cron_expression || '0 * * * *',
        interval_minutes: body.interval_minutes || 60,
        enabled: true,
        created_by: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const scheds = [newSched, ...getLocalData('schedules', [])];
      setLocalData('schedules', scheds);
      return { data: newSched };
    }

    // 6. Credentials
    if (url === 'credentials' && method === 'get') {
      return { data: getLocalData('credentials', []) };
    }
    if (url === 'credentials' && method === 'post') {
      const body = JSON.parse(config.data || '{}');
      const newCred = {
        id: Date.now(),
        name: body.name,
        credential_type: body.credential_type,
        description: body.description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const creds = [newCred, ...getLocalData('credentials', [])];
      setLocalData('credentials', creds);
      return { data: newCred };
    }

    // 7. Audit logs
    if (url === 'audit-logs' && method === 'get') {
      return {
        data: [
          {
            id: 1,
            timestamp: new Date().toISOString(),
            username: 'admin',
            action: 'LOGIN',
            resource: 'AUTH',
            resource_id: null,
            details: { ip: '127.0.0.1' },
          },
          {
            id: 2,
            timestamp: new Date(Date.now() - 100000).toISOString(),
            username: 'admin',
            action: 'DISPATCH_JOB',
            resource: 'JOB',
            resource_id: 'JOB-90241',
            details: { machine: 'Machine-A' },
          },
        ],
      };
    }

    return Promise.reject(error);
  }
);

export default api;
