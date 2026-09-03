import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Application {
  id: string;
  application_number: string;
  verification_type: string;
  status: string;
  submission_date: string | null;
  scheduled_date: string | null;
  created_at: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft:                { label: 'Draft',               color: 'bg-[#e6e2dd] text-[#50453b]' },
  submitted:            { label: 'Submitted',           color: 'bg-[#e0f2f1] text-[#004d40]' },
  under_review:         { label: 'Under Review',        color: 'bg-[#fff8e1] text-[#f57f17]' },
  scheduled:            { label: 'Scheduled',           color: 'bg-[#e3f2fd] text-[#0d47a1]' },
  assigned:             { label: 'Assigned',            color: 'bg-[#ede7f6] text-[#4a148c]' },
  inspection_pending:   { label: 'Inspection Pending',  color: 'bg-[#fff3e0] text-[#e65100]' },
  testing_in_progress:  { label: 'Testing in Progress', color: 'bg-[#fce4ec] text-[#880e4f]' },
  results_submitted:    { label: 'Results Submitted',   color: 'bg-[#f3e5f5] text-[#6a1b9a]' },
  approved:             { label: 'Approved',            color: 'bg-[#e8f5e9] text-[#1b5e20]' },
  rejected:             { label: 'Rejected',            color: 'bg-[#ffdad6] text-[#93000a]' },
  certificate_generated:{ label: 'Certificate Ready',   color: 'bg-[#e8f5e9] text-[#1b5e20]' },
  closed:               { label: 'Closed',              color: 'bg-[#e6e2dd] text-[#50453b]' },
};

export default function MyApplications() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(import.meta.env.VITE_API_BASE_URL + '/api/v1/applications/', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setApplications(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const downloadCertificate = async (appId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/certificates/application/${appId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const cert = await res.json();
        // Append a timestamp query parameter to bypass aggressive browser caching of PDFs
        window.open(`${import.meta.env.VITE_API_BASE_URL}/static/certificates/${cert.certificate_number}.pdf?t=${Date.now()}`, '_blank');
      } else {
        alert("Certificate is not ready yet.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf9f4]">
      <header className="bg-white border-b border-[#e6e2dd] px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-[#50453b] hover:text-[#1c1c19]">← Back</button>
          <h1 className="text-xl font-bold text-[#004d40] font-['Sora',sans-serif]">My Applications</h1>
        </div>
      </header>

      <main className="p-8 max-w-7xl mx-auto">
        {loading ? (
          <div className="text-center py-12 text-[#50453b]">Loading applications...</div>
        ) : applications.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#e6e2dd] p-12 text-center">
            <p className="text-[#50453b] text-lg mb-4">No applications found.</p>
            <button onClick={() => navigate('/instruments')} className="text-[#004d40] font-semibold hover:underline">
              Go to My Instruments to apply for verification
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map(app => {
              const statusInfo = STATUS_LABELS[app.status] || { label: app.status, color: 'bg-[#e6e2dd] text-[#50453b]' };
              return (
                <div key={app.id} className="bg-white rounded-xl border border-[#e6e2dd] shadow-sm p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="text-lg font-bold text-[#1c1c19]">{app.application_number}</p>
                    <p className="text-sm text-[#50453b] mt-1">
                      {app.verification_type === 'initial' ? 'Initial Verification' : 'Re-Verification'} 
                      {app.submission_date && ` • Submitted ${new Date(app.submission_date).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-sm font-semibold px-4 py-1.5 rounded-full ${statusInfo.color} whitespace-nowrap`}>
                      {statusInfo.label}
                    </span>
                    {app.status === 'certificate_generated' && (
                      <button 
                        onClick={() => downloadCertificate(app.id)}
                        className="text-[#004d40] text-sm font-bold hover:underline bg-[#e0f2f1] px-4 py-1.5 rounded-full"
                      >
                        Download PDF
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
