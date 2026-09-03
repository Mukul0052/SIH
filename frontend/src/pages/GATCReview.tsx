import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface TestResult {
  id: string;
  parameter_name: string;
  standard_value: number;
  observed_value: number;
  unit: string;
  tolerance_margin: number;
  automated_result: string;
  remarks: string | null;
}

export default function GATCReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tests, setTests] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTests();
  }, [id]);

  const fetchTests = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/applications/${id}/tests`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) setTests(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (decision: 'approved' | 'rejected') => {
    if (!window.confirm(`Are you sure you want to mark this application as ${decision.toUpperCase()}?`)) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/applications/${id}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ decision, remarks: "GATC manual override review" })
      });

      if (!res.ok) throw new Error('Failed to record decision');
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf9f4]">
      <header className="bg-white border-b border-[#e6e2dd] px-8 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="text-[#50453b] hover:text-[#1c1c19]">← Back</button>
        <h1 className="text-xl font-bold text-[#b71c1c]">GATC Escalation Review</h1>
      </header>

      <main className="p-8 max-w-5xl mx-auto space-y-6">
        {error && <div className="p-4 bg-[#ffdad6] text-[#93000a] rounded">{error}</div>}
        
        <div className="bg-white rounded-xl border border-[#e6e2dd] shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-[#e6e2dd] bg-[#fdf9f4]">
            <h2 className="font-bold text-[#1c1c19] text-lg">LMO Test Findings</h2>
            <p className="text-[#50453b] text-sm">Review the parameters that flagged this instrument for escalation.</p>
          </div>
          
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f0ece7] text-left text-[#50453b]">
                <th className="px-4 py-2">Parameter</th>
                <th className="px-4 py-2">Standard</th>
                <th className="px-4 py-2">Observed</th>
                <th className="px-4 py-2">Tolerance</th>
                <th className="px-4 py-2">Sys Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ece7]">
              {tests.map(t => (
                <tr key={t.id}>
                  <td className="px-4 py-3 font-medium text-[#1c1c19]">{t.parameter_name}</td>
                  <td className="px-4 py-3">{t.standard_value} {t.unit}</td>
                  <td className="px-4 py-3 font-bold text-[#b71c1c]">{t.observed_value} {t.unit}</td>
                  <td className="px-4 py-3">±{t.tolerance_margin} {t.unit}</td>
                  <td className="px-4 py-3">
                    <span className="text-[#b71c1c] font-bold bg-[#ffebee] px-2 py-1 rounded text-xs">
                      {t.automated_result}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-4">
          <button onClick={() => handleDecision('rejected')} className="bg-white border-2 border-[#b71c1c] text-[#b71c1c] px-6 py-3 rounded-lg font-bold shadow-sm hover:bg-[#ffebee]">
            Reject Application
          </button>
          <button onClick={() => handleDecision('approved')} className="bg-[#1b5e20] text-white px-6 py-3 rounded-lg font-bold shadow-sm hover:bg-[#003300]">
            Override & Approve
          </button>
        </div>
      </main>
    </div>
  );
}
