import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface SystemMetrics {
  total_users: number;
  total_instruments: number;
  total_applications: number;
  applications_by_status: Record<string, number>;
}

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity: string;
  entity_id: string;
  created_at: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'metrics' | 'audit'>('metrics');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [metricsRes, logsRes] = await Promise.all([
        fetch(import.meta.env.VITE_API_BASE_URL + '/api/v1/admin/metrics', { headers: { 'Authorization': `Bearer ${session.access_token}` } }),
        fetch(import.meta.env.VITE_API_BASE_URL + '/api/v1/admin/audit-logs', { headers: { 'Authorization': `Bearer ${session.access_token}` } })
      ]);

      if (metricsRes.ok) setMetrics(await metricsRes.json());
      if (logsRes.ok) setLogs(await logsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf9f4]">
      <header className="bg-white border-b border-[#e6e2dd] px-8 py-4 flex justify-between items-center text-[#1c1c19]">
        <h1 className="text-xl font-bold font-['Sora',sans-serif] text-[#004d40]">Super Admin Dashboard</h1>
        <button onClick={() => supabase.auth.signOut()} className="text-[#50453b] hover:text-[#1c1c19] font-medium">
          Sign Out
        </button>
      </header>

      <main className="p-8 max-w-7xl mx-auto space-y-8">
        {/* Navigation Tabs */}
        <div className="flex gap-4 border-b border-[#e6e2dd]">
          <button 
            className={`py-3 px-6 font-bold uppercase text-sm ${activeTab === 'metrics' ? 'text-[#004d40] border-b-2 border-[#004d40]' : 'text-[#8b8782] hover:text-[#50453b]'}`}
            onClick={() => setActiveTab('metrics')}
          >
            System Metrics
          </button>
          <button 
            className={`py-3 px-6 font-bold uppercase text-sm ${activeTab === 'audit' ? 'text-[#004d40] border-b-2 border-[#004d40]' : 'text-[#8b8782] hover:text-[#50453b]'}`}
            onClick={() => setActiveTab('audit')}
          >
            Audit Logs
          </button>
        </div>

        {loading ? (
          <div className="text-[#50453b] text-center p-8 font-medium">Loading data...</div>
        ) : (
          <>
            {/* Metrics Tab */}
            {activeTab === 'metrics' && metrics && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-xl border border-[#e6e2dd] shadow-sm">
                    <p className="text-[#50453b] text-xs font-bold uppercase mb-2">Total Users</p>
                    <p className="text-4xl font-bold text-[#1c1c19]">{metrics.total_users}</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-[#e6e2dd] shadow-sm">
                    <p className="text-[#50453b] text-xs font-bold uppercase mb-2">Total Instruments</p>
                    <p className="text-4xl font-bold text-[#1c1c19]">{metrics.total_instruments}</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-[#e6e2dd] shadow-sm">
                    <p className="text-[#50453b] text-xs font-bold uppercase mb-2">Total Applications</p>
                    <p className="text-4xl font-bold text-[#1c1c19]">{metrics.total_applications}</p>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-[#e6e2dd] shadow-sm">
                  <p className="text-[#50453b] text-xs font-bold uppercase mb-4">Application Pipeline Status</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(metrics.applications_by_status).map(([status, count]) => (
                      <div key={status} className="bg-[#fdf9f4] p-4 rounded-lg border border-[#e6e2dd]">
                        <span className="text-xl font-bold text-[#004d40] block mb-1">{count}</span>
                        <span className="text-[#50453b] text-xs font-medium uppercase">{status.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Audit Logs Tab */}
            {activeTab === 'audit' && (
              <div className="bg-white rounded-xl border border-[#e6e2dd] shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm text-[#50453b]">
                  <thead className="bg-[#f0ece7] text-[#1c1c19] uppercase text-xs">
                    <tr>
                      <th className="px-6 py-4">Timestamp</th>
                      <th className="px-6 py-4">Action</th>
                      <th className="px-6 py-4">Entity</th>
                      <th className="px-6 py-4">Entity ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e6e2dd]">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#fdf9f4]">
                        <td className="px-6 py-4 font-mono text-xs">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="px-6 py-4 font-bold text-[#b71c1c]">{log.action}</td>
                        <td className="px-6 py-4 uppercase text-xs">{log.entity}</td>
                        <td className="px-6 py-4 font-mono text-[10px] truncate max-w-[150px]">{log.entity_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
