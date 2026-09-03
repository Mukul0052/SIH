import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function NewApplication() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const instrumentId = searchParams.get('instrument_id') || '';
  
  const [instrument, setInstrument] = useState<any>(null);
  const [verificationType, setVerificationType] = useState('initial');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchInstrument = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/instruments/`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const instruments = await res.json();
        const found = instruments.find((i: any) => i.id === instrumentId);
        if (found) setInstrument(found);
      }
    } catch (err) {
      console.error("Failed to load instrument details", err);
    }
  };

  useEffect(() => {
    if (instrumentId) {
      fetchInstrument();
    }
  }, [instrumentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Step 1: Create draft application
      const res = await fetch(import.meta.env.VITE_API_BASE_URL + '/api/v1/applications/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          instrument_id: instrumentId,
          verification_type: verificationType,
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to create application');
      }

      const application = await res.json();

      // Step 2: Submit the application
      const submitRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/applications/${application.id}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
      });

      if (!submitRes.ok) {
        const errorData = await submitRes.json();
        throw new Error(errorData.detail || 'Failed to submit application');
      }

      navigate('/applications');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf9f4]">
      <header className="bg-white border-b border-[#e6e2dd] px-8 py-4 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-[#50453b] hover:text-[#1c1c19]">← Back</button>
        <h1 className="text-xl font-bold text-[#004d40] font-['Sora',sans-serif]">New Verification Application</h1>
      </header>

      <main className="p-8 max-w-3xl mx-auto">
        {!instrumentId ? (
          <div className="bg-white p-12 rounded-xl border border-[#e6e2dd] shadow-sm text-center">
            <div className="w-16 h-16 bg-[#e0f2f1] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#004d40]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"></path>
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#1c1c19] mb-2">No Instrument Selected</h2>
            <p className="text-[#50453b] mb-8">You must select an instrument from your registry before starting a verification application.</p>
            <button 
              onClick={() => navigate('/instruments')}
              className="bg-[#004d40] text-white font-bold py-3 px-8 rounded-lg hover:bg-[#003d33] transition-colors"
            >
              Browse My Instruments
            </button>
          </div>
        ) : (
          <div className="bg-white p-8 rounded-xl border border-[#e6e2dd] shadow-sm">
            {error && <div className="mb-6 p-4 bg-[#ffdad6] text-[#93000a] rounded-lg text-sm">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-[#1c1c19] uppercase mb-3">Selected Instrument</label>
                <div className="w-full p-4 rounded-lg bg-[#fdf9f4] border border-[#004d40] flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[#1c1c19] text-lg">{instrument ? instrument.serial_number : 'Loading...'}</p>
                    <p className="text-sm text-[#50453b]">{instrument ? `${instrument.manufacturer} - ${instrument.model}` : 'Fetching instrument details...'}</p>
                  </div>
                  <button type="button" onClick={() => navigate('/instruments')} className="text-[#004d40] text-sm font-bold hover:underline">
                    Change
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-[#1c1c19] uppercase mb-1">Verification Type *</label>
                <select
                  value={verificationType}
                  onChange={(e) => setVerificationType(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-white border-2 border-[#e6ded9] focus:border-[#004d40] focus:ring-0 outline-none transition-colors text-[#1c1c19]"
                >
                  <option value="initial">Initial Verification</option>
                  <option value="re_verification">Re-Verification</option>
                </select>
              </div>

              <div className="pt-4">
                <button
                  type="submit" disabled={loading || !instrumentId}
                  className="w-full bg-[#f57f17] text-white font-bold py-3 px-8 rounded-lg shadow-sm hover:bg-[#f9a825] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Submitting Application...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
