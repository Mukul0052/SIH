import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function RegisterInstrument() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    serial_number: '',
    category_id: '816e8633-8a3c-4de3-92f5-d57be3cda4b8',
    manufacturer: '',
    model: '',
    capacity: '',
    capacity_unit: 'kg',
    accuracy_class: 'Class III',
  });

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    
    const serial = formData.serial_number.trim();
    if (!serial) {
      errors.serial_number = 'Serial number is required.';
    } else if (serial.length < 3 || serial.length > 50) {
      errors.serial_number = 'Must be 3–50 characters.';
    } else if (!/^[A-Za-z0-9\-_/]+$/.test(serial)) {
      errors.serial_number = 'Only letters, digits, hyphens, underscores, slashes allowed.';
    }

    if (formData.capacity && parseFloat(formData.capacity) <= 0) {
      errors.capacity = 'Must be a positive number.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    setLoading(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated. Please sign in again.");

      const res = await fetch(import.meta.env.VITE_API_BASE_URL + '/api/v1/instruments/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          ...formData,
          capacity: formData.capacity ? parseFloat(formData.capacity) : null,
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        // Pydantic validation errors come as an array in `detail`
        if (Array.isArray(errorData.detail)) {
          const msgs = errorData.detail.map((d: any) => d.msg).join('; ');
          throw new Error(msgs);
        }
        throw new Error(errorData.detail?.error?.message || errorData.detail || 'Failed to register instrument');
      }

      navigate('/instruments');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field: string) =>
    `w-full px-4 py-3 rounded-lg bg-[#f7f3ee] border focus:outline-none focus:ring-2 focus:ring-[#004d40] transition-all ${
      fieldErrors[field] ? 'border-[#93000a]' : 'border-[#e6ded9]'
    }`;

  return (
    <div className="min-h-screen bg-[#fdf9f4]">
      <header className="bg-white border-b border-[#e6e2dd] px-4 md:px-8 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/')} className="text-[#50453b] hover:text-[#1c1c19]">← Back</button>
        <h1 className="text-xl font-bold text-[#004d40] font-['Sora',sans-serif]">Register New Instrument</h1>
      </header>

      <main className="p-4 md:p-8 max-w-3xl mx-auto">
        <div className="bg-white p-6 md:p-8 rounded-xl border border-[#e6e2dd] shadow-sm">
          {error && <div className="mb-6 p-4 bg-[#ffdad6] text-[#93000a] rounded-lg text-sm">{error}</div>}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Serial Number */}
              <div>
                <label className="block text-sm font-semibold text-[#1c1c19] uppercase mb-1">Serial Number *</label>
                <input
                  type="text" required
                  value={formData.serial_number}
                  onChange={(e) => { setFormData({...formData, serial_number: e.target.value}); setFieldErrors({...fieldErrors, serial_number: ''}); }}
                  placeholder="e.g. WS-2024-001"
                  className={inputClass('serial_number')}
                />
                {fieldErrors.serial_number && <p className="text-[#93000a] text-xs mt-1">{fieldErrors.serial_number}</p>}
              </div>
              
              {/* Manufacturer */}
              <div>
                <label className="block text-sm font-semibold text-[#1c1c19] uppercase mb-1">Manufacturer</label>
                <input
                  type="text"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({...formData, manufacturer: e.target.value})}
                  placeholder="e.g. Essae Teraoka"
                  className={inputClass('manufacturer')}
                />
              </div>

              {/* Model */}
              <div>
                <label className="block text-sm font-semibold text-[#1c1c19] uppercase mb-1">Model Name</label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({...formData, model: e.target.value})}
                  placeholder="e.g. DS-852"
                  className={inputClass('model')}
                />
              </div>

              {/* Accuracy Class */}
              <div>
                <label className="block text-sm font-semibold text-[#1c1c19] uppercase mb-1">Accuracy Class</label>
                <select
                  value={formData.accuracy_class}
                  onChange={(e) => setFormData({...formData, accuracy_class: e.target.value})}
                  className={inputClass('accuracy_class')}
                >
                  <option value="Class I">Class I (Special)</option>
                  <option value="Class II">Class II (High)</option>
                  <option value="Class III">Class III (Medium)</option>
                  <option value="Class IV">Class IV (Ordinary)</option>
                </select>
              </div>

              {/* Capacity */}
              <div>
                <label className="block text-sm font-semibold text-[#1c1c19] uppercase mb-1">Capacity</label>
                <div className="flex gap-2">
                  <input
                    type="number" step="0.01" min="0"
                    value={formData.capacity}
                    onChange={(e) => { setFormData({...formData, capacity: e.target.value}); setFieldErrors({...fieldErrors, capacity: ''}); }}
                    placeholder="e.g. 30"
                    className={`w-2/3 ${inputClass('capacity')}`}
                  />
                  <select
                    value={formData.capacity_unit}
                    onChange={(e) => setFormData({...formData, capacity_unit: e.target.value})}
                    className={`w-1/3 ${inputClass('capacity_unit')}`}
                  >
                    <option value="mg">mg</option>
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                    <option value="t">t (tonne)</option>
                    <option value="L">L</option>
                    <option value="mL">mL</option>
                    <option value="kL">kL</option>
                  </select>
                </div>
                {fieldErrors.capacity && <p className="text-[#93000a] text-xs mt-1">{fieldErrors.capacity}</p>}
              </div>
            </div>

            <div className="pt-4 border-t border-[#f0ece7]">
              <button
                type="submit" disabled={loading}
                className="w-full md:w-auto bg-[#004d40] text-white font-semibold py-3 px-8 rounded-lg shadow-sm hover:bg-[#003d33] transition-colors disabled:opacity-50"
              >
                {loading ? 'Registering...' : 'Save Instrument'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
