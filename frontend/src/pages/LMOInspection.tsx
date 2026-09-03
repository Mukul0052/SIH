import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface TestResult {
  id: string;
  test_type: string;
  parameter_name: string;
  standard_value: number;
  observed_value: number;
  unit: string;
  tolerance_margin: number;
  automated_result: string;
}

export default function LMOInspection() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tests, setTests] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [testType, setTestType] = useState('Weight Accuracy');
  const [paramName, setParamName] = useState('10kg Standard');
  const [expected, setExpected] = useState('10.000');
  const [actual, setActual] = useState('');
  const [unit, setUnit] = useState('kg');
  const [tolerance, setTolerance] = useState('0.050');
  const [instrumentDetails, setInstrumentDetails] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const appRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/applications/${id}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (appRes.ok) {
        const appData = await appRes.json();
        setInstrumentDetails(appData.instrument);
        if (appData.instrument?.capacity_unit) {
           setUnit(appData.instrument.capacity_unit);
        }
      }

      const testsRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/applications/${id}/tests`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (testsRes.ok) setTests(await testsRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/applications/${id}/tests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          test_type: testType,
          parameter_name: paramName,
          expected_value: parseFloat(expected),
          actual_value: parseFloat(actual),
          unit: unit,
          tolerance_margin: parseFloat(tolerance),
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to record test');
      }
      
      setActual(''); // reset form
      await fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleFinalize = async () => {
    if (!window.confirm("Are you sure you want to finalize? This will run the automated decision engine.")) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/applications/${id}/finalize-tests`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!res.ok) throw new Error('Failed to finalize');
      
      alert('Tests finalized and decision recorded.');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf9f4]">
      <header className="bg-white border-b border-[#e6e2dd] px-8 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/dashboard')} className="text-[#50453b] hover:text-[#1c1c19]">← Back</button>
        <h1 className="text-xl font-bold text-[#004d40]">Inspection & Testing Suite</h1>
      </header>

      <main className="p-8 max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Record Test Form */}
        <div className="md:col-span-1 bg-white p-6 rounded-xl border border-[#e6e2dd] shadow-sm h-fit">
          <h2 className="font-bold text-[#1c1c19] text-lg mb-4">Record New Reading</h2>
          {error && <div className="mb-4 p-3 bg-[#ffdad6] text-[#93000a] rounded text-sm">{error}</div>}
          
          <form onSubmit={handleAddTest} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#50453b] uppercase mb-1">Test Type</label>
              <input type="text" value={testType} onChange={e => setTestType(e.target.value)} className="w-full px-3 py-2 rounded bg-[#f7f3ee] border border-[#e6ded9]" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#50453b] uppercase mb-1">Parameter</label>
              <input type="text" value={paramName} onChange={e => setParamName(e.target.value)} className="w-full px-3 py-2 rounded bg-[#f7f3ee] border border-[#e6ded9]" required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-[#50453b] uppercase mb-1">Expected</label>
                <input type="number" step="0.001" value={expected} onChange={e => setExpected(e.target.value)} className="w-full px-3 py-2 rounded bg-[#f7f3ee] border border-[#e6ded9]" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#50453b] uppercase mb-1">Tolerance (±)</label>
                <input type="number" step="0.001" value={tolerance} onChange={e => setTolerance(e.target.value)} className="w-full px-3 py-2 rounded bg-[#f7f3ee] border border-[#e6ded9]" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#004d40] uppercase mb-1">Actual Reading *</label>
              <div className="flex gap-2">
                <input type="number" step="0.001" value={actual} onChange={e => setActual(e.target.value)} className="w-full px-3 py-2 rounded bg-white border-2 border-[#004d40]" required autoFocus />
                <select value={unit} onChange={e => setUnit(e.target.value)} className="px-3 py-2 rounded bg-[#f7f3ee] border border-[#e6ded9] text-[#50453b]">
                  <option value="mg">mg</option>
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="t">t</option>
                  <option value="L">L</option>
                  <option value="mL">mL</option>
                  <option value="kL">kL</option>
                </select>
              </div>
            </div>
            <button type="submit" className="w-full bg-[#f57f17] text-white font-bold py-2 rounded shadow-sm hover:bg-[#f9a825]">
              Save Reading
            </button>
          </form>
        </div>

        {/* Results Table & Automated Decision */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-[#e6e2dd] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e6e2dd] bg-[#fdf9f4]">
              <h2 className="font-bold text-[#1c1c19] text-lg">Recorded Readings</h2>
            </div>
            
            {tests.length === 0 ? (
              <div className="p-8 text-center text-[#50453b]">No readings recorded yet.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#f0ece7] text-left text-[#50453b]">
                    <th className="px-4 py-2">Test</th>
                    <th className="px-4 py-2">Expected</th>
                    <th className="px-4 py-2">Actual</th>
                    <th className="px-4 py-2">Tolerance</th>
                    <th className="px-4 py-2">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0ece7]">
                  {tests.map(t => (
                    <tr key={t.id}>
                      <td className="px-4 py-3 font-medium text-[#1c1c19]">{t.parameter_name}</td>
                      <td className="px-4 py-3">{t.standard_value} {t.unit}</td>
                      <td className="px-4 py-3 font-bold">{t.observed_value} {t.unit}</td>
                      <td className="px-4 py-3">±{t.tolerance_margin} {t.unit}</td>
                      <td className="px-4 py-3">
                        {t.automated_result === 'PASS' ? (
                          <span className="text-[#1b5e20] font-bold bg-[#e8f5e9] px-2 py-1 rounded text-xs">PASS</span>
                        ) : (
                          <span className="text-[#b71c1c] font-bold bg-[#ffebee] px-2 py-1 rounded text-xs">FAIL</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex justify-end gap-4">
            <button onClick={handleFinalize} disabled={tests.length === 0} className="bg-[#004d40] text-white px-6 py-3 rounded-lg font-bold shadow-sm hover:bg-[#003d33] disabled:opacity-50">
              Run Decision Engine & Finalize
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}
