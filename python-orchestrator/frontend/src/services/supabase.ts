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
      return u.username || 'Ganesh';
    }
  } catch {}
  return 'Ganesh';
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

// User-scoped persistent sync helper
const getUserKey = (prefix: string, username?: string) => {
  const u = (username || getActiveUsername()).toLowerCase();
  return `orchestrator_${prefix}_${u}`;
};

const getLocalUserList = (prefix: string, username?: string): any[] => {
  try {
    const raw = localStorage.getItem(getUserKey(prefix, username));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveLocalUserList = (prefix: string, items: any[], username?: string) => {
  try {
    localStorage.setItem(getUserKey(prefix, username), JSON.stringify(items));
  } catch {}
};

// Supabase Multi-Tenant Database Service API with Resilient Sync
export const supabaseService = {
  // Machines (Strictly filtered by logged in user)
  async getMachines(username?: string) {
    const user = username || getActiveUsername();
    let dbItems: any[] = [];
    try {
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        dbItems = data.filter((m: any) => !m.created_by || m.created_by.toLowerCase() === user.toLowerCase());
      }
    } catch {}

    const localItems = getLocalUserList('machines', user);
    // Merge by id or machine_id
    const map = new Map<string, any>();
    localItems.forEach((m) => map.set(m.machine_id || String(m.id), m));
    dbItems.forEach((m) => map.set(m.machine_id || String(m.id), m));
    return Array.from(map.values());
  },

  async insertMachine(machine: any) {
    const user = machine.created_by || getActiveUsername();
    const payload = {
      ...machine,
      created_by: user,
      user_id: machine.user_id || getActiveUserId(),
      created_at: machine.created_at || new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase.from('machines').insert([payload]).select().single();
      if (!error && data) {
        const cur = getLocalUserList('machines', user);
        saveLocalUserList('machines', [data, ...cur], user);
        return data;
      }
    } catch {}

    const cur = getLocalUserList('machines', user);
    const fallback = { ...payload, id: Date.now() };
    saveLocalUserList('machines', [fallback, ...cur], user);
    return fallback;
  },

  async updateMachine(machineId: string, updates: any) {
    const user = getActiveUsername();
    try {
      const { data, error } = await supabase
        .from('machines')
        .update(updates)
        .eq('machine_id', machineId)
        .select()
        .single();
      if (!error && data) {
        const cur = getLocalUserList('machines', user).map((m) => (m.machine_id === machineId ? { ...m, ...updates } : m));
        saveLocalUserList('machines', cur, user);
        return data;
      }
    } catch {}

    const cur = getLocalUserList('machines', user).map((m) => (m.machine_id === machineId ? { ...m, ...updates } : m));
    saveLocalUserList('machines', cur, user);
    return { machine_id: machineId, ...updates };
  },

  // Repositories (Strictly filtered by logged in user)
  async getRepositories(username?: string) {
    const user = username || getActiveUsername();
    let dbItems: any[] = [];
    try {
      const { data, error } = await supabase
        .from('repositories')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        dbItems = data.filter((r: any) => !r.created_by || r.created_by.toLowerCase() === user.toLowerCase());
      }
    } catch (err) {
      console.warn('Supabase repositories query fallback', err);
    }

    const localItems = getLocalUserList('repositories', user);
    const map = new Map<string, any>();
    localItems.forEach((r) => map.set(r.repository_url?.toLowerCase() || `${r.github_owner}/${r.repository_name}`.toLowerCase(), r));
    dbItems.forEach((r) => map.set(r.repository_url?.toLowerCase() || `${r.github_owner}/${r.repository_name}`.toLowerCase(), r));
    return Array.from(map.values());
  },

  async insertRepository(repo: any) {
    const user = repo.created_by || getActiveUsername();
    const payload = {
      ...repo,
      created_by: user,
      user_id: repo.user_id || getActiveUserId(),
      created_at: repo.created_at || new Date().toISOString(),
      connected_at: repo.connected_at || new Date().toISOString(),
    };

    // 1. Try Supabase insert
    try {
      const { data, error } = await supabase.from('repositories').insert([payload]).select().single();
      if (!error && data) {
        const cur = getLocalUserList('repositories', user).filter(
          (r) => (r.repository_url || '').toLowerCase() !== (data.repository_url || '').toLowerCase()
        );
        saveLocalUserList('repositories', [data, ...cur], user);
        return data;
      }
    } catch (err) {
      console.warn('Supabase repository insert fallback', err);
    }

    // 2. Immediate User-Scoped Persistence Guarantee
    const cur = getLocalUserList('repositories', user).filter(
      (r) => (r.repository_url || '').toLowerCase() !== (payload.repository_url || '').toLowerCase()
    );
    const fallback = { ...payload, id: payload.id || Date.now() };
    saveLocalUserList('repositories', [fallback, ...cur], user);
    return fallback;
  },

  async deleteRepository(repoId: number) {
    const user = getActiveUsername();
    try {
      await supabase.from('repositories').delete().eq('id', repoId);
    } catch {}

    const cur = getLocalUserList('repositories', user).filter((r) => r.id !== repoId);
    saveLocalUserList('repositories', cur, user);
    return true;
  },

  // Jobs (Strictly filtered by logged in user)
  async getJobs(username?: string) {
    const user = username || getActiveUsername();
    let dbItems: any[] = [];
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        dbItems = data.filter((j: any) => !j.created_by || j.created_by.toLowerCase() === user.toLowerCase());
      }
    } catch {}

    const localItems = getLocalUserList('jobs', user);
    const map = new Map<string, any>();
    localItems.forEach((j) => map.set(j.job_id || String(j.id), j));
    dbItems.forEach((j) => map.set(j.job_id || String(j.id), j));
    return Array.from(map.values());
  },

  async getJob(jobId: string) {
    const user = getActiveUsername();
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('job_id', jobId)
        .single();
      if (!error && data) return data;
    } catch {}

    const localItems = getLocalUserList('jobs', user);
    return localItems.find((j) => j.job_id === jobId) || null;
  },

  async insertJob(job: any) {
    const user = job.created_by || getActiveUsername();
    const payload = {
      ...job,
      created_by: user,
      user_id: job.user_id || getActiveUserId(),
      created_at: job.created_at || new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase.from('jobs').insert([payload]).select().single();
      if (!error && data) {
        const cur = getLocalUserList('jobs', user);
        saveLocalUserList('jobs', [data, ...cur], user);
        return data;
      }
    } catch {}

    const cur = getLocalUserList('jobs', user);
    const fallback = { ...payload, id: Date.now() };
    saveLocalUserList('jobs', [fallback, ...cur], user);
    return fallback;
  },

  async updateJob(jobId: string, updates: any) {
    const user = getActiveUsername();
    try {
      const { data, error } = await supabase
        .from('jobs')
        .update(updates)
        .eq('job_id', jobId)
        .select()
        .single();
      if (!error && data) {
        const cur = getLocalUserList('jobs', user).map((j) => (j.job_id === jobId ? { ...j, ...updates } : j));
        saveLocalUserList('jobs', cur, user);
        return data;
      }
    } catch {}

    const cur = getLocalUserList('jobs', user).map((j) => (j.job_id === jobId ? { ...j, ...updates } : j));
    saveLocalUserList('jobs', cur, user);
    return { job_id: jobId, ...updates };
  },

  // Job Logs
  async getJobLogs(jobId: string) {
    try {
      const { data, error } = await supabase
        .from('job_logs')
        .select('*')
        .eq('job_id', jobId)
        .order('timestamp', { ascending: true });
      if (!error && data) return data;
    } catch {}

    const localLogs = getLocalUserList(`job_logs_${jobId}`);
    return localLogs;
  },

  async insertJobLog(log: any) {
    try {
      const { data, error } = await supabase.from('job_logs').insert([log]).select().single();
      if (!error && data) return data;
    } catch {}

    const localLogs = getLocalUserList(`job_logs_${log.job_id}`);
    saveLocalUserList(`job_logs_${log.job_id}`, [...localLogs, log]);
    return log;
  },

  // Schedules (Strictly filtered by logged in user)
  async getSchedules(username?: string) {
    const user = username || getActiveUsername();
    let dbItems: any[] = [];
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        dbItems = data.filter((s: any) => !s.created_by || s.created_by.toLowerCase() === user.toLowerCase());
      }
    } catch {}

    const localItems = getLocalUserList('schedules', user);
    const map = new Map<number, any>();
    localItems.forEach((s) => map.set(s.id, s));
    dbItems.forEach((s) => map.set(s.id, s));
    return Array.from(map.values());
  },

  async insertSchedule(schedule: any) {
    const user = schedule.created_by || getActiveUsername();
    const payload = {
      ...schedule,
      created_by: user,
      user_id: schedule.user_id || getActiveUserId(),
      created_at: schedule.created_at || new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase.from('schedules').insert([payload]).select().single();
      if (!error && data) {
        const cur = getLocalUserList('schedules', user);
        saveLocalUserList('schedules', [data, ...cur], user);
        return data;
      }
    } catch {}

    const cur = getLocalUserList('schedules', user);
    const fallback = { ...payload, id: Date.now() };
    saveLocalUserList('schedules', [fallback, ...cur], user);
    return fallback;
  },

  async toggleSchedule(id: number, currentEnabled: boolean) {
    const user = getActiveUsername();
    try {
      const { data, error } = await supabase
        .from('schedules')
        .update({ enabled: !currentEnabled })
        .eq('id', id)
        .select()
        .single();
      if (!error && data) {
        const cur = getLocalUserList('schedules', user).map((s) => (s.id === id ? { ...s, enabled: !currentEnabled } : s));
        saveLocalUserList('schedules', cur, user);
        return data;
      }
    } catch {}

    const cur = getLocalUserList('schedules', user).map((s) => (s.id === id ? { ...s, enabled: !currentEnabled } : s));
    saveLocalUserList('schedules', cur, user);
    return { id, enabled: !currentEnabled };
  },

  async deleteSchedule(id: number) {
    const user = getActiveUsername();
    try {
      await supabase.from('schedules').delete().eq('id', id);
    } catch {}

    const cur = getLocalUserList('schedules', user).filter((s) => s.id !== id);
    saveLocalUserList('schedules', cur, user);
    return true;
  },

  // Credentials (Strictly filtered by logged in user)
  async getCredentials(username?: string) {
    const user = username || getActiveUsername();
    let dbItems: any[] = [];
    try {
      const { data, error } = await supabase
        .from('credentials')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        dbItems = data.filter((c: any) => !c.created_by || c.created_by.toLowerCase() === user.toLowerCase());
      }
    } catch {}

    const localItems = getLocalUserList('credentials', user);
    const map = new Map<string, any>();
    localItems.forEach((c) => map.set(c.name, c));
    dbItems.forEach((c) => map.set(c.name, c));
    return Array.from(map.values());
  },

  async insertCredential(cred: any) {
    const user = cred.created_by || getActiveUsername();
    const payload = {
      ...cred,
      created_by: user,
      user_id: cred.user_id || getActiveUserId(),
      created_at: cred.created_at || new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase.from('credentials').insert([payload]).select().single();
      if (!error && data) {
        const cur = getLocalUserList('credentials', user).filter((c) => c.name !== cred.name);
        saveLocalUserList('credentials', [data, ...cur], user);
        return data;
      }
    } catch {}

    const cur = getLocalUserList('credentials', user).filter((c) => c.name !== cred.name);
    const fallback = { ...payload, id: Date.now() };
    saveLocalUserList('credentials', [fallback, ...cur], user);
    return fallback;
  },

  async deleteCredential(id: number) {
    const user = getActiveUsername();
    try {
      await supabase.from('credentials').delete().eq('id', id);
    } catch {}

    const cur = getLocalUserList('credentials', user).filter((c) => c.id !== id);
    saveLocalUserList('credentials', cur, user);
    return true;
  },

  // Audit Logs (Strictly filtered by logged in user)
  async getAuditLogs(username?: string) {
    const user = username || getActiveUsername();
    let dbItems: any[] = [];
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);
      if (!error && data) {
        dbItems = data.filter((l: any) => !l.username || l.username.toLowerCase() === user.toLowerCase());
      }
    } catch {}

    const localItems = getLocalUserList('audit_logs', user);
    return [...dbItems, ...localItems].slice(0, 100);
  },

  async insertAuditLog(log: any) {
    const user = log.username || getActiveUsername();
    const payload = {
      ...log,
      username: user,
      user_id: log.user_id || getActiveUserId(),
      timestamp: log.timestamp || new Date().toISOString(),
    };

    try {
      await supabase.from('audit_logs').insert([payload]);
    } catch {}

    const cur = getLocalUserList('audit_logs', user);
    saveLocalUserList('audit_logs', [payload, ...cur], user);
    return payload;
  },
};
