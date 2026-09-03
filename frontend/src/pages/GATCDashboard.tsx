import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, FileCheck, CheckCircle2, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';

interface Application {
  id: string;
  application_number: string;
  status: string;
  verification_type: string;
}

export default function GATCDashboard() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(import.meta.env.VITE_API_BASE_URL + '/api/v1/applications/', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (res.ok) {
        const data = await res.json();
        const relevant = data.filter((a: any) => ['under_review', 'approved', 'certificate_generated'].includes(a.status));
        setApplications(relevant);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCertificate = async (appId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(import.meta.env.VITE_API_BASE_URL + '/api/v1/certificates/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}` 
        },
        body: JSON.stringify({ application_id: appId })
      });

      if (res.ok) {
        alert("Certificate generated successfully!");
        fetchData();
      } else {
        alert("Failed to generate certificate");
      }
    } catch (err) {
      console.error("Failed to generate certificate", err);
    }
  };

  const downloadCertificate = async (appId: string) => {
    const newWindow = window.open('about:blank', '_blank');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        newWindow?.close();
        return;
      }
      const res = await fetch(import.meta.env.VITE_API_BASE_URL + `/api/v1/certificates/application/${appId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const cert = await res.json();
        const pdfUrl = import.meta.env.VITE_API_BASE_URL + `/static/certificates/${cert.certificate_number}.pdf?t=${Date.now()}`;
        if (newWindow) {
          newWindow.location.href = pdfUrl;
        } else {
          window.location.href = pdfUrl;
        }
      } else {
        newWindow?.close();
        // Fallback to regeneration if it returns 404
        handleGenerateCertificate(appId);
      }
    } catch (err) {
      console.error(err);
      newWindow?.close();
    }
  };

  const underReview = applications.filter(a => a.status === 'under_review');
  const approved = applications.filter(a => a.status === 'approved');
  const issued = applications.filter(a => a.status === 'certificate_generated');

  return (
    <div className="min-h-screen bg-[#fdf9f4]">
      {/* Header */}
      <header className="bg-white border-b border-[#e6e2dd] px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl font-bold text-[#b71c1c] font-['Sora',sans-serif] flex items-center gap-2">
          <ShieldCheck size={24} /> GATC Escalation Portal
        </h1>
        <button onClick={() => supabase.auth.signOut()} className="text-[#50453b] font-semibold hover:text-[#1c1c19]">
          Sign Out
        </button>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        
        {/* Welcome & Stats Row */}
        <section>
          <motion.h2 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl font-bold text-[#1c1c19] mb-6 font-['Sora',sans-serif]"
          >
            Welcome back, GATC Reviewer
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Requires Review', count: underReview.length, icon: <AlertCircle size={24} />, color: 'bg-[#ffebee]', text: 'text-[#b71c1c]' },
              { label: 'Pending Certificates', count: approved.length, icon: <FileCheck size={24} />, color: 'bg-[#fff3e0]', text: 'text-[#e65100]' },
              { label: 'Certificates Issued', count: issued.length, icon: <CheckCircle2 size={24} />, color: 'bg-[#e8f5e9]', text: 'text-[#1b5e20]' },
            ].map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-6 rounded-2xl border border-[#e6e2dd] shadow-sm flex items-center justify-between"
              >
                <div>
                  <p className="text-[#8b8782] text-sm font-bold uppercase mb-1">{stat.label}</p>
                  <p className={`text-4xl font-bold ${stat.text}`}>{loading ? '-' : stat.count}</p>
                </div>
                <div className={`p-4 rounded-xl ${stat.color} ${stat.text}`}>
                  {stat.icon}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Lists */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Escalation Queue */}
            <section className="bg-white rounded-2xl border border-[#e6e2dd] shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-[#e6e2dd] bg-[#faf8f5] flex justify-between items-center">
                <h3 className="font-bold text-lg text-[#1c1c19]">Escalation & Issuance Queue</h3>
                <button onClick={fetchData} className="text-[#8b8782] hover:text-[#1c1c19]">
                  <RefreshCw size={20} />
                </button>
              </div>
              
              <div className="p-0">
                {loading ? (
                  <div className="text-center text-[#8b8782] py-8">Loading queue...</div>
                ) : applications.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-[#fdf9f4] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#e6e2dd]">
                      <ShieldCheck className="text-[#a19d94]" size={28} />
                    </div>
                    <h4 className="font-bold text-[#1c1c19] mb-2">Queue is Empty</h4>
                    <p className="text-[#8b8782] text-sm max-w-sm mx-auto">There are no escalated applications or pending certificates to issue.</p>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-[#f0ece7] text-[#50453b] text-xs uppercase font-bold">
                      <tr>
                        <th className="px-6 py-4">App Number</th>
                        <th className="px-6 py-4">Type</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e6e2dd]">
                      {applications.map((app) => (
                        <tr key={app.id} className="hover:bg-[#fdf9f4] transition-colors">
                          <td className="px-6 py-4 font-bold text-[#1c1c19]">{app.application_number}</td>
                          <td className="px-6 py-4 text-[#8b8782] text-sm">{app.verification_type}</td>
                          <td className="px-6 py-4">
                            {app.status === 'under_review' ? (
                               <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#ffebee] text-[#b71c1c]">
                                 Review Required
                               </span>
                            ) : app.status === 'certificate_generated' ? (
                              <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#e3f2fd] text-[#1565c0]">
                                Issued
                              </span>
                            ) : (
                              <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#e8f5e9] text-[#1b5e20]">
                                Approved
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {app.status === 'under_review' ? (
                              <button 
                                onClick={() => navigate(`/gatc/applications/${app.id}`)}
                                className="text-[#b71c1c] font-bold hover:underline flex items-center justify-end gap-1 ml-auto"
                              >
                                Review Findings <ArrowRight size={16} />
                              </button>
                            ) : (
                              <button 
                                onClick={() => app.status === 'certificate_generated' ? downloadCertificate(app.id) : handleGenerateCertificate(app.id)}
                                className="text-[#004d40] font-bold hover:underline"
                              >
                                {app.status === 'certificate_generated' ? 'View Certificate' : 'Issue Certificate'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </div>

          {/* Right Column: Sidebar */}
          <div className="space-y-8">
            
            {/* GATC Guide */}
            <div className="bg-[#fdf9f4] border border-[#e6e2dd] rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-lg text-[#1c1c19] mb-4 flex items-center gap-2">
                <AlertCircle className="text-[#004d40]" size={20} /> Review Protocol
              </h3>
              <ul className="space-y-4 text-sm text-[#50453b]">
                <li className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#b71c1c] text-white font-bold flex items-center justify-center shrink-0">1</div>
                  <p><strong>Review Flagged Tests:</strong> Any LMO test that falls outside legal tolerance is flagged to this portal.</p>
                </li>
                <li className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#b71c1c] text-white font-bold flex items-center justify-center shrink-0">2</div>
                  <p><strong>Executive Decision:</strong> You have the authority to manually Override & Approve if tolerances are within reasonable limits.</p>
                </li>
                <li className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#b71c1c] text-white font-bold flex items-center justify-center shrink-0">3</div>
                  <p><strong>Digital Signing:</strong> Click 'Issue Certificate' to cryptographically sign and generate the QR-verified PDF.</p>
                </li>
              </ul>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
