import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserCheck, ClipboardList, CheckCircle2, ArrowRight, AlertCircle, Calendar } from 'lucide-react';

interface Application {
  id: string;
  application_number: string;
  status: string;
  verification_type: string;
  submission_date: string | null;
  scheduled_date: string | null;
}

export default function LMODashboard() {
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
        setApplications(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const pendingInspections = applications.filter(a => a.status === 'assigned');
  const completedInspections = applications.filter(a => ['under_review', 'approved', 'certificate_generated', 'rejected'].includes(a.status));

  return (
    <div className="min-h-screen bg-[#fdf9f4]">
      {/* Header */}
      <header className="bg-white border-b border-[#e6e2dd] px-6 py-4 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <h1 className="text-xl font-bold text-[#004d40] font-['Sora',sans-serif] flex items-center gap-2">
          <UserCheck size={24} /> LMO Field Portal
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
            Welcome back, Officer
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'Total Assigned', count: applications.length, icon: <ClipboardList size={24} />, color: 'bg-[#e0f2f1]', text: 'text-[#004d40]' },
              { label: 'Pending Inspections', count: pendingInspections.length, icon: <Calendar size={24} />, color: 'bg-[#fff3e0]', text: 'text-[#e65100]' },
              { label: 'Completed', count: completedInspections.length, icon: <CheckCircle2 size={24} />, color: 'bg-[#e8f5e9]', text: 'text-[#1b5e20]' },
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
            
            {/* Inspection Queue */}
            <section className="bg-white rounded-2xl border border-[#e6e2dd] shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-[#e6e2dd] bg-[#faf8f5]">
                <h3 className="font-bold text-lg text-[#1c1c19]">Your Inspection Queue</h3>
              </div>
              
              <div className="p-6">
                {loading ? (
                  <div className="text-center text-[#8b8782] py-8">Loading...</div>
                ) : pendingInspections.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-[#e8f5e9] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#c8e6c9]">
                      <CheckCircle2 className="text-[#1b5e20]" size={28} />
                    </div>
                    <h4 className="font-bold text-[#1c1c19] mb-2">You're All Caught Up!</h4>
                    <p className="text-[#8b8782] text-sm max-w-sm mx-auto">There are no pending inspections assigned to you at the moment.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingInspections.map((app) => (
                      <div key={app.id} className="flex flex-col sm:flex-row justify-between sm:items-center p-5 border border-[#e6e2dd] rounded-xl hover:bg-[#fdf9f4] transition-colors gap-4">
                        <div>
                          <p className="font-bold text-[#1c1c19] text-lg mb-1">{app.application_number}</p>
                          <p className="text-sm text-[#8b8782] uppercase tracking-wide">{app.verification_type} VERIFICATION</p>
                        </div>
                        <button 
                          onClick={() => navigate(`/lmo/applications/${app.id}`)}
                          className="bg-[#004d40] text-white px-5 py-2.5 rounded-lg font-bold hover:bg-[#00382e] transition-colors whitespace-nowrap"
                        >
                          Start Inspection
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Column: Sidebar */}
          <div className="space-y-8">
            
            {/* Officer Duty Guide */}
            <div className="bg-[#fdf9f4] border border-[#e6e2dd] rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-lg text-[#1c1c19] mb-4 flex items-center gap-2">
                <AlertCircle className="text-[#b71c1c]" size={20} /> Field Test Protocol
              </h3>
              <ul className="space-y-4 text-sm text-[#50453b]">
                <li className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#004d40] text-white font-bold flex items-center justify-center shrink-0">1</div>
                  <p><strong>Verify Identity:</strong> Ensure the instrument matches the application serial number.</p>
                </li>
                <li className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#004d40] text-white font-bold flex items-center justify-center shrink-0">2</div>
                  <p><strong>Input Raw Data:</strong> Enter your exact field test readings into the portal. Do not round numbers.</p>
                </li>
                <li className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#004d40] text-white font-bold flex items-center justify-center shrink-0">3</div>
                  <p><strong>Auto-Evaluation:</strong> The Decision Engine will automatically calculate absolute error against legal tolerances.</p>
                </li>
              </ul>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
