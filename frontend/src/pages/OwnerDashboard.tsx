import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Scale, FileText, CheckCircle2, ArrowRight, PlusCircle, AlertCircle } from 'lucide-react';

interface Instrument {
  id: string;
  serial_number: string;
  manufacturer: string | null;
  model: string | null;
  accuracy_class: string | null;
}

interface Application {
  id: string;
  application_number: string;
  status: string;
  verification_type: string;
  submission_date: string | null;
}

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = { 'Authorization': `Bearer ${session.access_token}` };

      const [instRes, appRes] = await Promise.all([
        fetch(import.meta.env.VITE_API_BASE_URL + '/api/v1/instruments/', { headers }),
        fetch(import.meta.env.VITE_API_BASE_URL + '/api/v1/applications/', { headers }),
      ]);

      if (instRes.ok) setInstruments(await instRes.json());
      if (appRes.ok) setApplications(await appRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const pendingApps = applications.filter(a => !['approved', 'rejected', 'closed', 'certificate_generated'].includes(a.status));
  const issuedCerts = applications.filter(a => ['approved', 'certificate_generated'].includes(a.status));

  const downloadCertificate = async (appId: string) => {
    const newWindow = window.open('about:blank', '_blank');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        newWindow?.close();
        return;
      }
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/certificates/application/${appId}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) {
        const cert = await res.json();
        const pdfUrl = `${import.meta.env.VITE_API_BASE_URL}/static/certificates/${cert.certificate_number}.pdf?t=${Date.now()}`;
        if (newWindow) {
          newWindow.location.href = pdfUrl;
        } else {
          window.location.href = pdfUrl;
        }
      } else {
        newWindow?.close();
        alert("Certificate is not ready yet.");
      }
    } catch (err) {
      console.error(err);
      newWindow?.close();
    }
  };

  return (
    <div className="min-h-screen bg-[#fdf9f4]">
      {/* Header */}
      <header className="bg-white border-b border-[#e6e2dd] px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl font-bold text-[#004d40] font-['Sora',sans-serif] flex items-center gap-2">
          <Scale size={24} /> LM Owner Portal
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
            Welcome back, Business Owner
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Registered Instruments', count: instruments.length, icon: <Scale size={24} />, color: 'bg-[#e0f2f1]', text: 'text-[#004d40]' },
              { label: 'Active Applications', count: pendingApps.length, icon: <FileText size={24} />, color: 'bg-[#fff3e0]', text: 'text-[#e65100]' },
              { label: 'Issued Certificates', count: issuedCerts.length, icon: <CheckCircle2 size={24} />, color: 'bg-[#e8f5e9]', text: 'text-[#1b5e20]' },
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
            
            {/* Active Applications */}
            <section className="bg-white rounded-2xl border border-[#e6e2dd] shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-[#e6e2dd] flex justify-between items-center bg-[#faf8f5]">
                <h3 className="font-bold text-lg text-[#1c1c19]">Recent Applications</h3>
                <button onClick={() => navigate('/applications/new')} className="text-[#004d40] text-sm font-bold flex items-center gap-1 hover:underline">
                  New Application <ArrowRight size={16} />
                </button>
              </div>
              
              <div className="p-6">
                {loading ? (
                  <div className="text-center text-[#8b8782] py-8">Loading...</div>
                ) : applications.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-[#fdf9f4] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#e6e2dd]">
                      <FileText className="text-[#a19d94]" size={28} />
                    </div>
                    <h4 className="font-bold text-[#1c1c19] mb-2">No Applications Yet</h4>
                    <p className="text-[#8b8782] text-sm mb-6 max-w-sm mx-auto">You haven't submitted any verification applications for your instruments.</p>
                    <button onClick={() => navigate('/applications/new')} className="bg-[#004d40] text-white px-6 py-3 rounded-lg font-bold hover:bg-[#00382e] transition-colors inline-flex items-center gap-2">
                      <PlusCircle size={18} /> Apply for Verification
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {applications.slice(0, 3).map((app) => (
                      <div key={app.id} className="flex justify-between items-center p-4 border border-[#e6e2dd] rounded-xl hover:bg-[#fdf9f4] transition-colors">
                        <div>
                          <p className="font-bold text-[#1c1c19] mb-1">{app.application_number}</p>
                          <p className="text-xs text-[#8b8782] uppercase">{app.verification_type} VERIFICATION</p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            ['approved', 'certificate_generated'].includes(app.status) ? 'bg-[#e8f5e9] text-[#1b5e20]' :
                            app.status === 'rejected' ? 'bg-[#ffebee] text-[#b71c1c]' :
                            'bg-[#fff3e0] text-[#e65100]'
                          }`}>
                            {app.status.replace(/_/g, ' ')}
                          </span>
                          {app.status === 'certificate_generated' && (
                            <button onClick={() => downloadCertificate(app.id)} className="text-[#004d40] text-xs font-bold hover:underline flex items-center gap-1">
                              Download PDF
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {applications.length > 3 && (
                      <button onClick={() => navigate('/applications')} className="w-full text-center text-[#004d40] font-bold text-sm py-2 hover:bg-[#fdf9f4] rounded-lg transition-colors">
                        View All {applications.length} Applications
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>

            {/* My Instruments */}
            <section className="bg-white rounded-2xl border border-[#e6e2dd] shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-[#e6e2dd] flex justify-between items-center bg-[#faf8f5]">
                <h3 className="font-bold text-lg text-[#1c1c19]">My Instruments</h3>
                <button onClick={() => navigate('/instruments')} className="text-[#004d40] text-sm font-bold hover:underline">
                  View Directory
                </button>
              </div>
              <div className="p-6">
                {loading ? (
                   <div className="text-center text-[#8b8782] py-8">Loading...</div>
                ) : instruments.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-[#8b8782] text-sm mb-4">You need to register an instrument before applying.</p>
                    <button onClick={() => navigate('/instruments/new')} className="bg-white border-2 border-[#004d40] text-[#004d40] px-5 py-2 rounded-lg font-bold hover:bg-[#fdf9f4] transition-colors">
                      Register Instrument
                    </button>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    {instruments.slice(0, 4).map(inst => (
                      <div key={inst.id} className="p-4 border border-[#e6e2dd] rounded-xl">
                        <p className="font-bold text-[#1c1c19]">{inst.model || 'Unknown Model'}</p>
                        <p className="text-sm text-[#8b8782]">S/N: {inst.serial_number}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

          </div>

          {/* Right Column: Sidebar */}
          <div className="space-y-8">
            
            {/* Quick Actions */}
            <div className="bg-[#004d40] rounded-2xl p-6 text-white shadow-md">
              <h3 className="font-bold text-lg mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button onClick={() => navigate('/instruments/new')} className="w-full bg-white/10 hover:bg-white/20 text-left px-4 py-3 rounded-xl font-semibold transition-colors flex justify-between items-center">
                  Register Instrument <PlusCircle size={18} />
                </button>
                <button onClick={() => navigate('/applications/new')} className="w-full bg-white/10 hover:bg-white/20 text-left px-4 py-3 rounded-xl font-semibold transition-colors flex justify-between items-center">
                  New Application <FileText size={18} />
                </button>
                <button onClick={() => navigate('/verify')} className="w-full bg-white/10 hover:bg-white/20 text-left px-4 py-3 rounded-xl font-semibold transition-colors flex justify-between items-center">
                  Verify Certificate <CheckCircle2 size={18} />
                </button>
              </div>
            </div>

            {/* Compliance Guide */}
            <div className="bg-[#fdf9f4] border border-[#e6e2dd] rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-lg text-[#1c1c19] mb-4 flex items-center gap-2">
                <AlertCircle className="text-[#b71c1c]" size={20} /> Compliance Guide
              </h3>
              <ul className="space-y-4 text-sm text-[#50453b]">
                <li className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#e8f5e9] text-[#1b5e20] font-bold flex items-center justify-center shrink-0">1</div>
                  <p><strong>Register Device:</strong> Add your weighing/measuring instrument to the central directory with its serial number.</p>
                </li>
                <li className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#e8f5e9] text-[#1b5e20] font-bold flex items-center justify-center shrink-0">2</div>
                  <p><strong>Apply for Test:</strong> Submit an application for Initial or Re-verification.</p>
                </li>
                <li className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#e8f5e9] text-[#1b5e20] font-bold flex items-center justify-center shrink-0">3</div>
                  <p><strong>LMO Inspection:</strong> An officer will visit and record readings in the system.</p>
                </li>
              </ul>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
