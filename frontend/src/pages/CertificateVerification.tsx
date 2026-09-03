import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface CertificateData {
  certificate_number: string;
  application_id: string;
  issue_date: string;
  valid_until: string;
  status: string;
  pdf_storage_ref: string;
}

export default function CertificateVerification() {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cert, setCert] = useState<CertificateData | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setCert(null);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/certificates/verify/${token}`);
      if (res.ok) {
        setCert(await res.json());
      } else {
        const err = await res.json();
        throw new Error(err.detail || 'Invalid or missing certificate token.');
      }
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
        <h1 className="text-xl font-bold text-[#004d40]">Public Certificate Verification</h1>
      </header>

      <main className="p-8 max-w-2xl mx-auto space-y-8">
        <div className="bg-white p-8 rounded-xl border border-[#e6e2dd] shadow-sm">
          <h2 className="text-lg font-bold text-[#1c1c19] mb-4">Verify E-Certificate</h2>
          <p className="text-[#50453b] mb-6 text-sm">Enter the 16-character alphanumeric token printed on the physical or digital certificate to verify its authenticity directly from the government registry.</p>
          
          <form onSubmit={handleVerify} className="flex gap-4">
            <input 
              type="text" 
              value={token} 
              onChange={e => setToken(e.target.value)}
              placeholder="Enter Verification ID or Certificate Number..."
              className="flex-1 px-4 py-3 rounded-lg bg-[#f7f3ee] border border-[#e6ded9] text-[#1c1c19] focus:outline-none focus:ring-2 focus:ring-[#004d40]"
              required
            />
            <button 
              type="submit" 
              disabled={loading || !token}
              className="bg-[#004d40] text-white px-8 py-3 rounded-lg font-bold hover:bg-[#003d33] disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </form>
          {error && <div className="mt-4 text-[#b71c1c] font-semibold text-sm">{error}</div>}
        </div>

        {cert && (
          <div className="bg-[#e8f5e9] p-8 rounded-xl border border-[#c8e6c9] shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className="inline-block bg-[#1b5e20] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2">Authentic</span>
                <h3 className="text-2xl font-bold text-[#1b5e20]">Valid Certificate</h3>
              </div>
              <a 
                href={`http://localhost:8000${cert.pdf_storage_ref}`} 
                target="_blank" rel="noreferrer"
                className="text-[#004d40] font-semibold underline text-sm"
              >
                View PDF
              </a>
            </div>
            
            <div className="grid grid-cols-2 gap-y-4 text-sm">
              <div>
                <p className="text-[#50453b] uppercase text-xs font-bold mb-1">Certificate Number</p>
                <p className="font-medium text-[#1c1c19]">{cert.certificate_number}</p>
              </div>
              <div>
                <p className="text-[#50453b] uppercase text-xs font-bold mb-1">Status</p>
                <p className="font-medium text-[#1c1c19] capitalize">{cert.status}</p>
              </div>
              <div>
                <p className="text-[#50453b] uppercase text-xs font-bold mb-1">Issue Date</p>
                <p className="font-medium text-[#1c1c19]">{cert.issue_date}</p>
              </div>
              <div>
                <p className="text-[#50453b] uppercase text-xs font-bold mb-1">Valid Until</p>
                <p className="font-medium text-[#1c1c19]">{cert.valid_until}</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
