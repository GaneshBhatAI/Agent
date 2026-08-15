import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qwutrfmmcorktztefrja.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_E4XKAZgjI27EdpVNP6qC0w_UlcwlTpe';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper to get active session username for strict user isolation
export const getActiveUsername = (): string => {
  try {
    const raw = localStorage.getItem('orchestrator_user');
    if (raw) {
      const u = JSON.parse(raw);
      return u.username || 'admin';
    }
  } catch {}
  return 'admin';
};

export const getActiveUserId = (): number | undefined => {
  try {
    const raw = localStorage.getItem('orchestrator_user');
    if (raw) {
      const u = JSON.parse(raw);
      return u.id;
    }
  } catch {}
  return undefined;
};

// Supabase Multi-Tenant Database Service API (Strict Multi-User Isolation)
export const supabaseService = {
  // Machines (Strictly filtered by logged in user)
  async getMachines(username?: string) {
    const user = username || getActiveUsername();
    const { data, error } = await supabase
      .from('machines')
      .select('*')
      .eq('created_by', user)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async insertMachine(machine: any) {
    const payload = {
      ...machine,
      created_by: machine.created_by || getActiveUsername(),
      user_id: machine.user_id || getActiveUserId(),
    };
    const { data, error } = await supabase.from('machines').insert([payload]).select().single();
    if (error) throw error;
    return data;
  },

  async updateMachine(machineId: string, updates: any) {
    const user = getActiveUsername();
    const { data, error } = await supabase
      .from('machines')
      .update(updates)
      .eq('machine_id', machineId)
      .eq('created_by', user)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Repositories (Strictly filtered by logged in user)
  async getRepositories(username?: string) {
    const user = username || getActiveUsername();
    const { data, error } = await supabase
      .from('repositories')
      .select('*')
      .eq('created_by', user)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async insertRepository(repo: any) {
    const payload = {
      ...repo,
      created_by: repo.created_by || getActiveUsername(),
      user_id: repo.user_id || getActiveUserId(),
    };
    const { data, error } = await supabase.from('repositories').insert([payload]).select().single();
    if (error) throw error;
    return data;
  },

  async deleteRepository(repoId: number) {
    const user = getActiveUsername();
    const { error } = await supabase
      .from('repositories')
      .delete()
      .eq('id', repoId)
      .eq('created_by', user);
    if (error) throw error;
    return true;
  },

  // Jobs (Strictly filtered by logged in user)
  async getJobs(username?: string) {
    const user = username || getActiveUsername();
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('created_by', user)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getJob(jobId: string) {
    const user = getActiveUsername();
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('job_id', jobId)
      .eq('created_by', user)
      .single();
    if (error) throw error;
    return data;
  },

  async insertJob(job: any) {
    const payload = {
      ...job,
      created_by: job.created_by || getActiveUsername(),
      user_id: job.user_id || getActiveUserId(),
    };
    const { data, error } = await supabase.from('jobs').insert([payload]).select().single();
    if (error) throw error;
    return data;
  },

  async updateJob(jobId: string, updates: any) {
    const user = getActiveUsername();
    const { data, error } = await supabase
      .from('jobs')
      .update(updates)
      .eq('job_id', jobId)
      .eq('created_by', user)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Job Logs
  async getJobLogs(jobId: string) {
    const { data, error } = await supabase
      .from('job_logs')
      .select('*')
      .eq('job_id', jobId)
      .order('timestamp', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async insertJobLog(log: any) {
    const { data, error } = await supabase.from('job_logs').insert([log]).select().single();
    if (error) throw error;
    return data;
  },

  // Schedules (Strictly filtered by logged in user)
  async getSchedules(username?: string) {
    const user = username || getActiveUsername();
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('created_by', user)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async insertSchedule(schedule: any) {
    const payload = {
      ...schedule,
      created_by: schedule.created_by || getActiveUsername(),
      user_id: schedule.user_id || getActiveUserId(),
    };
    const { data, error } = await supabase.from('schedules').insert([payload]).select().single();
    if (error) throw error;
    return data;
  },

  async toggleSchedule(id: number, currentEnabled: boolean) {
    const user = getActiveUsername();
    const { data, error } = await supabase
      .from('schedules')
      .update({ enabled: !currentEnabled })
      .eq('id', id)
      .eq('created_by', user)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteSchedule(id: number) {
    const user = getActiveUsername();
    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', id)
      .eq('created_by', user);
    if (error) throw error;
    return true;
  },

  // Credentials (Strictly filtered by logged in user)
  async getCredentials(username?: string) {
    const user = username || getActiveUsername();
    const { data, error } = await supabase
      .from('credentials')
      .select('*')
      .eq('created_by', user)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async insertCredential(cred: any) {
    const payload = {
      ...cred,
      created_by: cred.created_by || getActiveUsername(),
      user_id: cred.user_id || getActiveUserId(),
    };
    const { data, error } = await supabase.from('credentials').insert([payload]).select().single();
    if (error) throw error;
    return data;
  },

  async deleteCredential(id: number) {
    const user = getActiveUsername();
    const { error } = await supabase
      .from('credentials')
      .delete()
      .eq('id', id)
      .eq('created_by', user);
    if (error) throw error;
    return true;
  },

  // Audit Logs (Strictly filtered by logged in user)
  async getAuditLogs(username?: string) {
    const user = username || getActiveUsername();
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('username', user)
      .order('timestamp', { ascending: false })
      .limit(100);
    if (error) throw error;
    return data || [];
  },

  async insertAuditLog(log: any) {
    const payload = {
      ...log,
      username: log.username || getActiveUsername(),
      user_id: log.user_id || getActiveUserId(),
    };
    const { data, error } = await supabase.from('audit_logs').insert([payload]).select().single();
    if (error) throw error;
    return data;
  },
};
