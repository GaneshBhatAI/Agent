import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qwutrfmmcorktztefrja.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_E4XKAZgjI27EdpVNP6qC0w_UlcwlTpe';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Supabase Database Service API
export const supabaseService = {
  // Machines
  async getMachines() {
    const { data, error } = await supabase.from('machines').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async insertMachine(machine: any) {
    const { data, error } = await supabase.from('machines').insert([machine]).select().single();
    if (error) throw error;
    return data;
  },

  async updateMachine(machineId: string, updates: any) {
    const { data, error } = await supabase.from('machines').update(updates).eq('machine_id', machineId).select().single();
    if (error) throw error;
    return data;
  },

  // Repositories
  async getRepositories() {
    const { data, error } = await supabase.from('repositories').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async insertRepository(repo: any) {
    const { data, error } = await supabase.from('repositories').insert([repo]).select().single();
    if (error) throw error;
    return data;
  },

  // Jobs
  async getJobs() {
    const { data, error } = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getJob(jobId: string) {
    const { data, error } = await supabase.from('jobs').select('*').eq('job_id', jobId).single();
    if (error) throw error;
    return data;
  },

  async insertJob(job: any) {
    const { data, error } = await supabase.from('jobs').insert([job]).select().single();
    if (error) throw error;
    return data;
  },

  async updateJob(jobId: string, updates: any) {
    const { data, error } = await supabase.from('jobs').update(updates).eq('job_id', jobId).select().single();
    if (error) throw error;
    return data;
  },

  // Job Logs
  async getJobLogs(jobId: string) {
    const { data, error } = await supabase.from('job_logs').select('*').eq('job_id', jobId).order('timestamp', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async insertJobLog(log: any) {
    const { data, error } = await supabase.from('job_logs').insert([log]).select().single();
    if (error) throw error;
    return data;
  },

  // Schedules
  async getSchedules() {
    const { data, error } = await supabase.from('schedules').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async insertSchedule(schedule: any) {
    const { data, error } = await supabase.from('schedules').insert([schedule]).select().single();
    if (error) throw error;
    return data;
  },

  async toggleSchedule(id: number, currentEnabled: boolean) {
    const { data, error } = await supabase.from('schedules').update({ enabled: !currentEnabled }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async deleteSchedule(id: number) {
    const { error } = await supabase.from('schedules').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // Credentials
  async getCredentials() {
    const { data, error } = await supabase.from('credentials').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async insertCredential(cred: any) {
    const { data, error } = await supabase.from('credentials').insert([cred]).select().single();
    if (error) throw error;
    return data;
  },

  async deleteCredential(id: number) {
    const { error } = await supabase.from('credentials').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  // Audit Logs
  async getAuditLogs() {
    const { data, error } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(100);
    if (error) throw error;
    return data || [];
  },

  async insertAuditLog(log: any) {
    const { data, error } = await supabase.from('audit_logs').insert([log]).select().single();
    if (error) throw error;
    return data;
  },
};
