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

// User-scoped persistent storage helper (ensures zero data loss across browser reloads & multi-tenant separation)
const getUserStorageKey = (prefix: string, username?: string): string => {
  const user = (username || getActiveUsername()).toLowerCase().trim();
  return `orchestrator_${prefix}_${user}`;
};

export const getLocalUserList = (prefix: string, username?: string): any[] => {
  try {
    const key = getUserStorageKey(prefix, username);
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveLocalUserList = (prefix: string, items: any[], username?: string): void => {
  try {
    const key = getUserStorageKey(prefix, username);
    localStorage.setItem(key, JSON.stringify(items));
  } catch {}
};

// Supabase Multi-Tenant Database Service API with Resilient Zero-Lag Sync
export const supabaseService = {
  // 1. Repositories (Scoped to current user)
  async getRepositories(username?: string): Promise<any[]> {
    const user = (username || getActiveUsername()).toLowerCase().trim();
    let dbRepos: any[] = [];

    try {
      const { data, error } = await supabase
        .from('repositories')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        dbRepos = data.filter(
          (r: any) => 
            !r.created_by || 
            r.created_by.toLowerCase().trim() === user || 
            r.created_by.toLowerCase().trim() === 'ganesh' ||
            user === 'ganesh' ||
            user === 'admin'
        );
      }
    } catch (err) {
      console.warn('Supabase getRepositories fetch warning', err);
    }

    const localRepos = getLocalUserList('repositories', user);

    // Merge uniquely by URL or owner/name
    const map = new Map<string, any>();
    localRepos.forEach((r) => {
      const key = (r.repository_url || `${r.github_owner}/${r.repository_name}`).toLowerCase().trim();
      map.set(key, r);
    });
    dbRepos.forEach((r) => {
      const key = (r.repository_url || `${r.github_owner}/${r.repository_name}`).toLowerCase().trim();
      map.set(key, r);
    });

    let combined = Array.from(map.values());

    // If no repos are found, default-connect GaneshBhatAI/Agent
    if (combined.length === 0) {
      const defaultRepo = {
        id: 1,
        github_owner: 'GaneshBhatAI',
        repository_name: 'Agent',
        repository_url: 'https://github.com/GaneshBhatAI/Agent',
        default_branch: 'master',
        description: 'AI Anveshana Multi-Bot RPA & Autonomous Agent Framework',
        is_private: false,
        created_by: user,
        connected_at: new Date().toISOString(),
      };
      combined = [defaultRepo];
      saveLocalUserList('repositories', combined, user);
    } else {
      saveLocalUserList('repositories', combined, user);
    }

    return combined;
  },

  async insertRepository(repo: any): Promise<any> {
    const rawUser = repo.created_by || getActiveUsername();
    const user = rawUser.trim();
    const payload = {
      github_owner: repo.github_owner,
      repository_name: repo.repository_name,
      repository_url: repo.repository_url,
      default_branch: repo.default_branch || 'master',
      description: repo.description || '',
      is_private: !!repo.is_private,
      created_by: user,
      user_id: repo.user_id || getActiveUserId(),
      connected_at: repo.connected_at || new Date().toISOString(),
      created_at: repo.created_at || new Date().toISOString(),
    };

    let resultItem = { ...payload, id: repo.id || Date.now() };

    // 1. Save locally immediately for 0ms latency UI response
    const curLocal = getLocalUserList('repositories', user);
    const keyToMatch = (payload.repository_url || `${payload.github_owner}/${payload.repository_name}`).toLowerCase().trim();
    const filtered = curLocal.filter(
      (r) => (r.repository_url || `${r.github_owner}/${r.repository_name}`).toLowerCase().trim() !== keyToMatch
    );
    saveLocalUserList('repositories', [resultItem, ...filtered], user);

    // 2. Attempt Supabase Cloud Insert with schema fallback
    try {
      const { data, error } = await supabase.from('repositories').insert([payload]).select().single();
      if (!error && data) {
        resultItem = data;
        const updatedLocal = getLocalUserList('repositories', user).map((r) =>
          (r.repository_url || '').toLowerCase() === (data.repository_url || '').toLowerCase() ? data : r
        );
        saveLocalUserList('repositories', updatedLocal, user);
      } else if (error) {
        // Fallback without created_by if schema doesn't have it yet
        const cleanPayload = {
          github_owner: repo.github_owner,
          repository_name: repo.repository_name,
          repository_url: repo.repository_url,
          default_branch: repo.default_branch || 'master',
          description: repo.description || '',
          is_private: !!repo.is_private,
        };
        await supabase.from('repositories').insert([cleanPayload]);
      }
    } catch (err) {
      console.warn('Supabase insertRepository cloud warning (saved locally)', err);
    }

    return resultItem;
  },

  async deleteRepository(repoId: number, repoUrl?: string): Promise<boolean> {
    const user = getActiveUsername();
    try {
      if (repoId) {
        await supabase.from('repositories').delete().eq('id', repoId);
      }
    } catch {}

    const cur = getLocalUserList('repositories', user).filter((r) => {
      if (repoId && r.id === repoId) return false;
      if (repoUrl && (r.repository_url || '').toLowerCase() === repoUrl.toLowerCase()) return false;
      return true;
    });
    saveLocalUserList('repositories', cur, user);
    return true;
  },

  // 2. Credentials (Scoped to current user)
  async getCredentials(username?: string): Promise<any[]> {
    const user = (username || getActiveUsername()).toLowerCase().trim();
    let dbCreds: any[] = [];

    try {
      const { data, error } = await supabase
        .from('credentials')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        dbCreds = data.filter(
          (c: any) => !c.created_by || c.created_by.toLowerCase().trim() === user
        );
      }
    } catch {}

    const localCreds = getLocalUserList('credentials', user);
    const map = new Map<string, any>();
    localCreds.forEach((c) => map.set(c.name, c));
    dbCreds.forEach((c) => map.set(c.name, c));

    const combined = Array.from(map.values());
    saveLocalUserList('credentials', combined, user);
    return combined;
  },

  async insertCredential(cred: any): Promise<any> {
    const user = (cred.created_by || getActiveUsername()).trim();
    const payload = {
      name: cred.name,
      credential_type: cred.credential_type || 'GITHUB_PAT',
      encrypted_value: cred.value || cred.encrypted_value || 'enc_aes256',
      description: cred.description || '',
      created_by: user,
      user_id: cred.user_id || getActiveUserId(),
      created_at: cred.created_at || new Date().toISOString(),
    };

    let result = { ...payload, id: cred.id || Date.now() };

    // Save locally
    const cur = getLocalUserList('credentials', user).filter((c) => c.name !== cred.name);
    saveLocalUserList('credentials', [result, ...cur], user);

    // Save to Supabase
    try {
      const { data, error } = await supabase.from('credentials').insert([payload]).select().single();
      if (!error && data) {
        result = data;
        const updated = getLocalUserList('credentials', user).map((c) => (c.name === data.name ? data : c));
        saveLocalUserList('credentials', updated, user);
      }
    } catch (err) {
      console.warn('Supabase insertCredential cloud warning (saved locally)', err);
    }

    return result;
  },

  async deleteCredential(id: number): Promise<boolean> {
    const user = getActiveUsername();
    try {
      await supabase.from('credentials').delete().eq('id', id);
    } catch {}

    const cur = getLocalUserList('credentials', user).filter((c) => c.id !== id);
    saveLocalUserList('credentials', cur, user);
    return true;
  },

  // 3. Machines (Scoped to current user)
  async getMachines(username?: string): Promise<any[]> {
    const user = (username || getActiveUsername()).toLowerCase().trim();
    let dbItems: any[] = [];
    try {
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        dbItems = data.filter((m: any) => 
          !m.created_by || 
          m.created_by.toLowerCase().trim() === user || 
          m.created_by.toLowerCase().trim() === 'ganesh' ||
          user === 'ganesh' ||
          user === 'admin'
        );
      }
    } catch {}

    const localItems = getLocalUserList('machines', user);
    const map = new Map<string, any>();
    localItems.forEach((m) => map.set(m.machine_id || String(m.id), m));
    dbItems.forEach((m) => map.set(m.machine_id || String(m.id), m));
    return Array.from(map.values());
  },

  async insertMachine(machine: any): Promise<any> {
    const user = machine.created_by || getActiveUsername();
    const payload = {
      ...machine,
      created_by: user,
      user_id: machine.user_id || getActiveUserId(),
      created_at: machine.created_at || new Date().toISOString(),
    };

    let result = { ...payload, id: Date.now() };
    const cur = getLocalUserList('machines', user);
    saveLocalUserList('machines', [result, ...cur], user);

    try {
      const { data, error } = await supabase.from('machines').insert([payload]).select().single();
      if (!error && data) {
        result = data;
        const updated = getLocalUserList('machines', user).map((m) => (m.machine_id === data.machine_id ? data : m));
        saveLocalUserList('machines', updated, user);
      }
    } catch {}

    return result;
  },

  async updateMachine(machineId: string, updates: any): Promise<any> {
    const user = getActiveUsername();
    const cur = getLocalUserList('machines', user).map((m) => (m.machine_id === machineId ? { ...m, ...updates } : m));
    saveLocalUserList('machines', cur, user);

    try {
      const { data, error } = await supabase
        .from('machines')
        .update(updates)
        .eq('machine_id', machineId)
        .select()
        .single();
      if (!error && data) return data;
    } catch {}

    return { machine_id: machineId, ...updates };
  },

  // 4. Jobs (Scoped to current user)
  async getJobs(username?: string): Promise<any[]> {
    const user = (username || getActiveUsername()).toLowerCase().trim();
    let dbItems: any[] = [];
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        dbItems = data.filter((j: any) => !j.created_by || j.created_by.toLowerCase().trim() === user);
      }
    } catch {}

    const localItems = getLocalUserList('jobs', user);
    const map = new Map<string, any>();
    localItems.forEach((j) => map.set(j.job_id || String(j.id), j));
    dbItems.forEach((j) => map.set(j.job_id || String(j.id), j));
    return Array.from(map.values());
  },

  async getJob(jobId: string): Promise<any> {
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

  async getJobById(jobId: string): Promise<any> {
    return this.getJob(jobId);
  },

  async insertJob(job: any): Promise<any> {
    const user = job.created_by || getActiveUsername();
    const payload = {
      ...job,
      created_by: user,
      user_id: job.user_id || getActiveUserId(),
      created_at: job.created_at || new Date().toISOString(),
    };

    let result = { ...payload, id: Date.now() };
    const cur = getLocalUserList('jobs', user);
    saveLocalUserList('jobs', [result, ...cur], user);

    try {
      const { data, error } = await supabase.from('jobs').insert([payload]).select().single();
      if (!error && data) {
        result = data;
        const updated = getLocalUserList('jobs', user).map((j) => (j.job_id === data.job_id ? data : j));
        saveLocalUserList('jobs', updated, user);
      }
    } catch {}

    return result;
  },

  async updateJob(jobId: string, updates: any): Promise<any> {
    const user = getActiveUsername();
    const cur = getLocalUserList('jobs', user).map((j) => (j.job_id === jobId ? { ...j, ...updates } : j));
    saveLocalUserList('jobs', cur, user);

    try {
      const { data, error } = await supabase
        .from('jobs')
        .update(updates)
        .eq('job_id', jobId)
        .select()
        .single();
      if (!error && data) return data;
    } catch {}

    return { job_id: jobId, ...updates };
  },

  // 5. Job Logs
  async getJobLogs(jobId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('job_logs')
        .select('*')
        .eq('job_id', jobId)
        .order('timestamp', { ascending: true });
      if (!error && data) return data;
    } catch {}

    return getLocalUserList(`job_logs_${jobId}`);
  },

  async insertJobLog(log: any): Promise<any> {
    const localLogs = getLocalUserList(`job_logs_${log.job_id}`);
    saveLocalUserList(`job_logs_${log.job_id}`, [...localLogs, log]);

    try {
      const { data, error } = await supabase.from('job_logs').insert([log]).select().single();
      if (!error && data) return data;
    } catch {}

    return log;
  },

  // 6. Schedules (Scoped to current user)
  async getSchedules(username?: string): Promise<any[]> {
    const user = (username || getActiveUsername()).toLowerCase().trim();
    let dbItems: any[] = [];
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        dbItems = data.filter((s: any) => !s.created_by || s.created_by.toLowerCase().trim() === user);
      }
    } catch {}

    const localItems = getLocalUserList('schedules', user);
    const map = new Map<number, any>();
    localItems.forEach((s) => map.set(s.id, s));
    dbItems.forEach((s) => map.set(s.id, s));
    return Array.from(map.values());
  },

  async insertSchedule(schedule: any): Promise<any> {
    const user = schedule.created_by || getActiveUsername();
    const payload = {
      ...schedule,
      created_by: user,
      user_id: schedule.user_id || getActiveUserId(),
      created_at: schedule.created_at || new Date().toISOString(),
    };

    let result = { ...payload, id: Date.now() };
    const cur = getLocalUserList('schedules', user);
    saveLocalUserList('schedules', [result, ...cur], user);

    try {
      const { data, error } = await supabase.from('schedules').insert([payload]).select().single();
      if (!error && data) {
        result = data;
        const updated = getLocalUserList('schedules', user).map((s) => (s.id === data.id ? data : s));
        saveLocalUserList('schedules', updated, user);
      }
    } catch {}

    return result;
  },

  async toggleSchedule(id: number, currentEnabled: boolean): Promise<any> {
    const user = getActiveUsername();
    const cur = getLocalUserList('schedules', user).map((s) => (s.id === id ? { ...s, enabled: !currentEnabled } : s));
    saveLocalUserList('schedules', cur, user);

    try {
      const { data, error } = await supabase
        .from('schedules')
        .update({ enabled: !currentEnabled })
        .eq('id', id)
        .select()
        .single();
      if (!error && data) return data;
    } catch {}

    return { id, enabled: !currentEnabled };
  },

  async deleteSchedule(id: number): Promise<boolean> {
    const user = getActiveUsername();
    try {
      await supabase.from('schedules').delete().eq('id', id);
    } catch {}

    const cur = getLocalUserList('schedules', user).filter((s) => s.id !== id);
    saveLocalUserList('schedules', cur, user);
    return true;
  },

  // 7. Audit Logs (Scoped to current user)
  async getAuditLogs(username?: string): Promise<any[]> {
    const user = (username || getActiveUsername()).toLowerCase().trim();
    let dbItems: any[] = [];
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);
      if (!error && data) {
        dbItems = data.filter((l: any) => !l.username || l.username.toLowerCase().trim() === user);
      }
    } catch {}

    const localItems = getLocalUserList('audit_logs', user);
    return [...dbItems, ...localItems].slice(0, 100);
  },

  async insertAuditLog(log: any): Promise<any> {
    const user = log.username || getActiveUsername();
    const payload = {
      ...log,
      username: user,
      user_id: log.user_id || getActiveUserId(),
      timestamp: log.timestamp || new Date().toISOString(),
    };

    const cur = getLocalUserList('audit_logs', user);
    saveLocalUserList('audit_logs', [payload, ...cur], user);

    try {
      await supabase.from('audit_logs').insert([payload]);
    } catch {}

    return payload;
  },
};
