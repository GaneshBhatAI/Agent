import React, { useEffect, useState } from 'react';
import { ShieldCheck, RotateCw, User, Activity } from 'lucide-react';
import api from '../services/api';
import { AuditLog } from '../types';
import { format } from 'date-fns';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/audit-logs');
      setLogs(res.data);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-purple-600" />
            <span>System Audit Trail</span>
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Immutable log of user logins, machine registrations, job dispatches, and credential access
          </p>
        </div>

        <button
          onClick={fetchAuditLogs}
          className="flex items-center gap-1.5 rounded-full border border-purple-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-purple-50 shadow-2xs cursor-pointer"
        >
          <RotateCw className="h-3.5 w-3.5 text-purple-600" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Table */}
      <div className="rounded-3xl border border-purple-100 bg-white/90 backdrop-blur-xl overflow-hidden shadow-[0_4px_20px_rgba(111,83,163,0.03)] font-mono text-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-purple-50/50 text-slate-600 uppercase tracking-wider font-bold border-b border-purple-100 text-[11px] font-sans">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Actor</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Resource</th>
                <th className="px-6 py-4">Details</th>
                <th className="px-6 py-4 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50 text-slate-700">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-purple-50/60 transition-colors">
                    <td className="px-6 py-4 text-slate-500 font-medium">
                      {format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 font-sans">
                        <User className="h-3.5 w-3.5 text-purple-600" />
                        <span>{log.username}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-purple-100 border border-purple-200 px-2.5 py-0.5 text-[10px] font-bold text-purple-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-800 font-semibold">{log.resource}</td>
                    <td className="px-6 py-4 text-slate-500 font-sans font-medium">
                      {log.details ? JSON.stringify(log.details) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-400 font-medium">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-sans font-medium">
                    No audit records discovered.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
