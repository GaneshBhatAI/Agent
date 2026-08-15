import axios from 'axios';
import { supabase, supabaseService } from './supabase';

const savedApiUrl = localStorage.getItem('orchestrator_api_url');
export const API_BASE_URL = savedApiUrl || (window.location.hostname === 'localhost' ? 'http://localhost:8000/api' : '/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 4000,
});

// Attach session token to outgoing requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('orchestrator_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Real Supabase PostgreSQL database interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config } = error;
    if (!config || !config.url) return Promise.reject(error);

    const url = config.url.replace(api.defaults.baseURL || '', '').replace(/^\//, '');
    const method = (config.method || 'get').toLowerCase();

    // 1. Dashboard summary directly from Supabase
    if (url === 'dashboard' && method === 'get') {
      try {
        const [machines, jobs, schedules, repos] = await Promise.all([
          supabaseService.getMachines(),
          supabaseService.getJobs(),
          supabaseService.getSchedules(),
          supabaseService.getRepositories(),
        ]);

        return {
          data: {
            total_machines: machines.length,
            online_machines: machines.filter((m: any) => m.status === 'ONLINE').length,
            busy_machines: machines.filter((m: any) => m.status === 'BUSY').length,
            total_jobs: jobs.length,
            successful_jobs: jobs.filter((j: any) => j.status === 'SUCCESS').length,
            failed_jobs: jobs.filter((j: any) => j.status === 'FAILED').length,
            active_schedules: schedules.filter((s: any) => s.enabled).length,
            connected_repos_count: repos.length || 1,
            recent_jobs: jobs.slice(0, 10),
            machines: machines,
          },
        };
      } catch (err) {
        console.error('Failed to query Supabase dashboard metrics', err);
        return {
          data: {
            total_machines: 0,
            online_machines: 0,
            busy_machines: 0,
            total_jobs: 0,
            successful_jobs: 0,
            failed_jobs: 0,
            active_schedules: 0,
            recent_jobs: [],
            machines: [],
          },
        };
      }
    }

    // 2. Machines directly from Supabase
    if (url === 'machines' && method === 'get') {
      try {
        const data = await supabaseService.getMachines();
        return { data };
      } catch (err) {
        console.error('Failed to fetch machines from Supabase', err);
        return { data: [] };
      }
    }

    if (url === 'machines/generate-token' && method === 'post') {
      const body = JSON.parse(config.data || '{}');
      const token = 'reg_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const newMachine = {
        machine_name: body.machine_name || 'Worker-Node-1',
        machine_id: 'MACH-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
        status: 'OFFLINE',
        created_at: new Date().toISOString(),
      };
      try {
        await supabaseService.insertMachine(newMachine);
      } catch (err) {
        console.error('Failed to insert machine to Supabase', err);
      }
      return {
        data: {
          machine_name: newMachine.machine_name,
          registration_token: token,
          expires_in_hours: 24,
        },
      };
    }

    if (url.startsWith('machines/') && url.endsWith('/enable') && method === 'post') {
      const mId = url.split('/')[1];
      try {
        const data = await supabaseService.updateMachine(mId, { status: 'ONLINE' });
        return { data };
      } catch (err) {
        return { data: { status: 'ONLINE' } };
      }
    }

    if (url.startsWith('machines/') && url.endsWith('/disable') && method === 'post') {
      const mId = url.split('/')[1];
      try {
        const data = await supabaseService.updateMachine(mId, { status: 'DISABLED' });
        return { data };
      } catch (err) {
        return { data: { status: 'DISABLED' } };
      }
    }

    if (url.startsWith('machines/') && method === 'get') {
      const mId = url.split('/')[1];
      try {
        const { data, error } = await supabase
          .from('machines')
          .select('*')
          .or(`machine_id.eq.${mId},id.eq.${mId}`)
          .single();
        if (data && !error) return { data };
      } catch (err) {
        console.error('Failed to get machine from Supabase', err);
      }
      return { data: null };
    }

    // 3. Repositories directly from Supabase
    if (url === 'github/repositories' && method === 'get') {
      try {
        const data = await supabaseService.getRepositories();
        if (data && data.length > 0) return { data };
      } catch (err) {}
      return {
        data: [
          {
            id: 1,
            github_owner: 'GaneshBhatAI',
            repository_name: 'Agent',
            repository_url: 'https://github.com/GaneshBhatAI/Agent',
            default_branch: 'master',
            description: 'Enterprise Python Automation Framework & Bot Workflows',
            is_private: false,
          },
        ],
      };
    }

    if (url.startsWith('github/repositories/') && url.endsWith('/branches')) {
      return {
        data: [
          { name: 'master', commit_sha: 'c6db9d5', protected: false, is_default: true },
          { name: 'main', commit_sha: 'c6db9d5', protected: false, is_default: false },
        ],
      };
    }

    if (url.startsWith('github/repositories/') && url.includes('/files')) {
      return {
        data: [
          { name: 'Master_ActiveLoansProcess.py', path: 'Loan/Loan Team/Active Loans Process/Bots/Master_ActiveLoansProcess.py', type: 'file', is_python_file: true },
          { name: 'Child_ActiveLoansProcess.py', path: 'Loan/Loan Team/Active Loans Process/Bots/Child_ActiveLoansProcess.py', type: 'file', is_python_file: true },
          { name: 'excel_manager.py', path: 'framework_components/Excel_Manager/excel_manager.py', type: 'file', is_python_file: true },
          { name: 'file_handler.py', path: 'framework_components/File_Handler/file_handler.py', type: 'file', is_python_file: true },
          { name: 'agent.py', path: 'orchestrator_agent/agent.py', type: 'file', is_python_file: true },
          { name: 'config.json', path: 'Loan/Loan Team/Active Loans Process/Config/config.json', type: 'file', is_python_file: false },
          { name: 'requirements.txt', path: 'requirements.txt', type: 'file', is_python_file: false },
        ],
      };
    }

    // 4. Jobs directly from Supabase
    if (url === 'jobs' && method === 'get') {
      try {
        const data = await supabaseService.getJobs();
        return { data };
      } catch (err) {
        console.error('Failed to get jobs from Supabase', err);
        return { data: [] };
      }
    }

    if (url === 'jobs' && method === 'post') {
      const body = JSON.parse(config.data || '{}');
      const newJob = {
        job_id: 'JOB-' + Math.floor(10000 + Math.random() * 90000),
        repository_name: body.repository_name || 'Agent',
        repository_url: body.repository_url || 'https://github.com/GaneshBhatAI/Agent',
        branch: body.branch || 'master',
        commit_sha: body.commit_sha || 'c6db9d5',
        entry_point: body.entry_point || 'Master_ActiveLoansProcess.py',
        machine_id: body.machine_id || 'LOCAL-NODE',
        status: 'RUNNING',
        parameters: body.parameters || [],
        started_at: new Date().toISOString(),
        created_by: 'admin',
        created_at: new Date().toISOString(),
      };
      try {
        const data = await supabaseService.insertJob(newJob);
        // Insert initial log
        await supabaseService.insertJobLog({
          job_id: newJob.job_id,
          level: 'INFO',
          message: `Job ${newJob.job_id} dispatched for ${newJob.entry_point} on branch ${newJob.branch}`,
          timestamp: new Date().toISOString(),
        });
        return { data };
      } catch (err) {
        console.error('Failed to insert job into Supabase', err);
        return { data: newJob };
      }
    }

    if (url.startsWith('jobs/') && url.endsWith('/logs')) {
      const jobId = url.split('/')[1];
      try {
        const logs = await supabaseService.getJobLogs(jobId);
        return { data: logs };
      } catch (err) {
        console.error('Failed to fetch logs from Supabase', err);
        return { data: [] };
      }
    }

    if (url.startsWith('jobs/') && url.endsWith('/cancel') && method === 'post') {
      const jobId = url.split('/')[1];
      try {
        const data = await supabaseService.updateJob(jobId, { status: 'CANCELLED', completed_at: new Date().toISOString() });
        return { data };
      } catch (err) {
        return { data: { status: 'CANCELLED' } };
      }
    }

    if (url.startsWith('jobs/') && url.endsWith('/retry') && method === 'post') {
      const jobId = url.split('/')[1];
      try {
        const prevJob = await supabaseService.getJob(jobId);
        const retryJob = {
          ...prevJob,
          id: undefined,
          job_id: 'JOB-' + Math.floor(10000 + Math.random() * 90000),
          status: 'QUEUED',
          retry_count: (prevJob.retry_count || 0) + 1,
          started_at: new Date().toISOString(),
          completed_at: null,
          exit_code: null,
          created_at: new Date().toISOString(),
        };
        const data = await supabaseService.insertJob(retryJob);
        return { data };
      } catch (err) {
        return { data: { job_id: 'JOB-' + Math.floor(10000 + Math.random() * 90000) } };
      }
    }

    if (url.startsWith('jobs/') && method === 'get') {
      const jId = url.split('/')[1];
      try {
        const data = await supabaseService.getJob(jId);
        if (data) return { data };
      } catch (err) {
        console.error('Failed to fetch job from Supabase', err);
      }
      return { data: null };
    }

    // 5. Schedules directly from Supabase
    if (url === 'schedules' && method === 'get') {
      try {
        const data = await supabaseService.getSchedules();
        return { data };
      } catch (err) {
        console.error('Failed to fetch schedules from Supabase', err);
        return { data: [] };
      }
    }

    if (url === 'schedules' && method === 'post') {
      const body = JSON.parse(config.data || '{}');
      const newSched = {
        name: body.name,
        repository_name: body.repository_name || 'Agent',
        repository_url: body.repository_url || 'https://github.com/GaneshBhatAI/Agent',
        branch: body.branch || 'master',
        entry_point: body.entry_point || 'Master_ActiveLoansProcess.py',
        machine_id: body.machine_id,
        schedule_type: body.schedule_type || 'CRON',
        cron_expression: body.cron_expression || '0 8 * * *',
        interval_minutes: body.interval_minutes || 60,
        enabled: true,
        created_by: 'admin',
        created_at: new Date().toISOString(),
      };
      try {
        const data = await supabaseService.insertSchedule(newSched);
        return { data };
      } catch (err) {
        console.error('Failed to insert schedule to Supabase', err);
        return { data: newSched };
      }
    }

    if (url.startsWith('schedules/') && url.endsWith('/toggle') && method === 'post') {
      const id = parseInt(url.split('/')[1]);
      try {
        const { data: cur } = await supabase.from('schedules').select('enabled').eq('id', id).single();
        const data = await supabaseService.toggleSchedule(id, !!cur?.enabled);
        return { data };
      } catch (err) {
        return { data: { success: true } };
      }
    }

    if (url.startsWith('schedules/') && method === 'delete') {
      const id = parseInt(url.split('/')[1]);
      try {
        await supabaseService.deleteSchedule(id);
        return { data: { success: true } };
      } catch (err) {
        return { data: { success: true } };
      }
    }

    // 6. Credentials directly from Supabase
    if (url === 'credentials' && method === 'get') {
      try {
        const data = await supabaseService.getCredentials();
        return { data };
      } catch (err) {
        console.error('Failed to fetch credentials from Supabase', err);
        return { data: [] };
      }
    }

    if (url === 'credentials' && method === 'post') {
      const body = JSON.parse(config.data || '{}');
      const newCred = {
        name: body.name,
        credential_type: body.credential_type,
        encrypted_value: body.value || 'enc_aes256',
        description: body.description || '',
        created_by: 'admin',
        created_at: new Date().toISOString(),
      };
      try {
        const data = await supabaseService.insertCredential(newCred);
        return { data };
      } catch (err) {
        console.error('Failed to insert credential to Supabase', err);
        return { data: newCred };
      }
    }

    if (url.startsWith('credentials/') && method === 'delete') {
      const id = parseInt(url.split('/')[1]);
      try {
        await supabaseService.deleteCredential(id);
        return { data: { success: true } };
      } catch (err) {
        return { data: { success: true } };
      }
    }

    // 7. Audit logs directly from Supabase
    if (url === 'audit-logs' && method === 'get') {
      try {
        const data = await supabaseService.getAuditLogs();
        return { data };
      } catch (err) {
        console.error('Failed to fetch audit logs from Supabase', err);
        return { data: [] };
      }
    }

    return Promise.reject(error);
  }
);

export default api;
