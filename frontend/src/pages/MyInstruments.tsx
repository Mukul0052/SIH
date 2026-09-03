import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Instrument {
  id: string;
  serial_number: string;
  manufacturer: string | null;
  model: string | null;
  capacity: number | null;
  capacity_unit: string | null;
  accuracy_class: string | null;
  created_at: string;
}

export default function MyInstruments() {
  const navigate = useNavigate();
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInstruments();
  }, []);

  const fetchInstruments = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(import.meta.env.VITE_API_BASE_URL + '/api/v1/instruments/', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setInstruments(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf9f4]">
      <header className="bg-white border-b border-[#e6e2dd] px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-[#50453b] hover:text-[#1c1c19]">← Back</button>
          <h1 className="text-xl font-bold text-[#004d40] font-['Sora',sans-serif]">My Instruments</h1>
        </div>
        <button onClick={() => navigate('/instruments/new')} className="bg-[#004d40] text-white px-4 py-2 rounded font-semibold hover:bg-[#003d33]">
          + Register New
        </button>
      </header>

      <main className="p-8 max-w-7xl mx-auto">
        {loading ? (
          <div className="text-center py-12 text-[#50453b]">Loading instruments...</div>
        ) : instruments.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#e6e2dd] p-12 text-center">
            <p className="text-[#50453b] text-lg mb-4">You haven't registered any instruments yet.</p>
            <button onClick={() => navigate('/instruments/new')} className="bg-[#004d40] text-white px-6 py-3 rounded font-semibold hover:bg-[#003d33]">
              Register Your First Instrument
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-[#e6e2dd] shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#fdf9f4] border-b border-[#e6e2dd]">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#50453b] uppercase">Serial No.</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#50453b] uppercase hidden md:table-cell">Manufacturer</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#50453b] uppercase hidden md:table-cell">Model</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#50453b] uppercase hidden lg:table-cell">Capacity</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-[#50453b] uppercase hidden lg:table-cell">Class</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-[#50453b] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {instruments.map(inst => (
                  <tr key={inst.id} className="border-b border-[#f0ece7] hover:bg-[#fdf9f4] transition-colors">
                    <td className="px-6 py-4 font-medium text-[#1c1c19]">{inst.serial_number}</td>
                    <td className="px-6 py-4 text-[#50453b] hidden md:table-cell">{inst.manufacturer || '—'}</td>
                    <td className="px-6 py-4 text-[#50453b] hidden md:table-cell">{inst.model || '—'}</td>
                    <td className="px-6 py-4 text-[#50453b] hidden lg:table-cell">
                      {inst.capacity ? `${inst.capacity} ${inst.capacity_unit}` : '—'}
                    </td>
                    <td className="px-6 py-4 text-[#50453b] hidden lg:table-cell">{inst.accuracy_class || '—'}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => navigate(`/applications/new?instrument_id=${inst.id}`)}
                        className="text-[#004d40] font-semibold text-sm hover:underline"
                      >
                        Apply for Verification
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
