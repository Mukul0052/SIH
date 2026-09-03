import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Scale, FileCheck, ArrowRight, UserCheck, BarChart3, Fingerprint } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Landing() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <div className="min-h-screen bg-[#fdf9f4] text-[#1c1c19] overflow-hidden">
      {/* Navigation */}
      <nav className="border-b border-[#e6ded9] bg-white/80 backdrop-blur-md fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="text-[#004d40]" size={28} />
            <span className="font-['Sora',sans-serif] font-bold text-lg text-[#004d40]">
              LM Certification
            </span>
          </div>
          <div className="flex gap-4">
            {session ? (
              <button 
                onClick={() => navigate('/dashboard')}
                className="px-5 py-2 font-bold text-white bg-[#004d40] rounded-lg hover:bg-[#00382e] transition-colors"
              >
                Go to Dashboard
              </button>
            ) : (
              <>
                <button 
                  onClick={() => navigate('/login')}
                  className="px-4 py-2 font-semibold text-[#004d40] hover:text-[#004d40]/80 transition-colors"
                >
                  Sign In
                </button>
                <button 
                  onClick={() => navigate('/register')}
                  className="px-5 py-2 font-bold text-white bg-[#004d40] rounded-lg hover:bg-[#00382e] transition-colors"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6 relative">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,_rgba(0,77,64,0.05),_transparent_40%)]" />
        
        <motion.div 
          className="max-w-4xl mx-auto text-center relative z-10"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#e8f5e9] text-[#1b5e20] text-sm font-semibold mb-6 border border-[#c8e6c9]">
            <ShieldCheck size={16} /> Government of India Approved
          </motion.div>
          
          <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-bold font-['Sora',sans-serif] leading-tight mb-6">
            Digital Certification for <br />
            <span className="text-[#004d40]">Legal Metrology</span>
          </motion.h1>
          
          <motion.p variants={itemVariants} className="text-xl text-[#50453b] mb-10 max-w-2xl mx-auto leading-relaxed">
            A unified portal for business owners, inspection officers, and test centers to seamlessly issue, track, and verify weighing and measuring instrument certificates.
          </motion.p>
          
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => navigate(session ? '/dashboard' : '/register')}
              className="px-8 py-4 bg-[#004d40] text-white font-bold rounded-xl text-lg hover:bg-[#00382e] transition-colors flex items-center gap-2 shadow-lg shadow-[#004d40]/20"
            >
              {session ? 'Enter Dashboard' : 'Register Your Instrument'} <ArrowRight size={20} />
            </button>
            <button 
              onClick={() => navigate('/verify')}
              className="px-8 py-4 bg-white border-2 border-[#e6ded9] text-[#1c1c19] font-bold rounded-xl text-lg hover:bg-[#f7f3ee] transition-colors"
            >
              Verify Certificate
            </button>
          </motion.div>
        </motion.div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-white border-y border-[#e6ded9]">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl font-bold font-['Sora',sans-serif] mb-4 text-[#004d40]">How the Workflow Operates</h2>
            <p className="text-[#50453b] max-w-2xl mx-auto">From registration to digital certification, the entire pipeline is transparent and fully digitized.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-transparent via-[#e6ded9] to-transparent" />
            
            {[
              {
                step: '01',
                title: 'Owner Application',
                desc: 'Business owners register their instruments and submit an application for legal verification.',
                icon: <FileCheck size={24} className="text-[#004d40]" />
              },
              {
                step: '02',
                title: 'LMO Inspection',
                desc: 'Assigned Legal Metrology Officers conduct field tests. An automated engine calculates margins of error.',
                icon: <UserCheck size={24} className="text-[#004d40]" />
              },
              {
                step: '03',
                title: 'GATC Certification',
                desc: 'Govt Approved Test Centers review the results and issue cryptographic PDF certificates.',
                icon: <ShieldCheck size={24} className="text-[#004d40]" />
              }
            ].map((s, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="relative bg-[#fdf9f4] p-8 rounded-2xl border border-[#e6ded9] z-10 text-center shadow-sm"
              >
                <div className="w-16 h-16 bg-white border border-[#e6ded9] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                  {s.icon}
                </div>
                <div className="text-[#b71c1c] font-bold text-sm mb-2 uppercase tracking-wider">Step {s.step}</div>
                <h3 className="text-xl font-bold mb-3">{s.title}</h3>
                <p className="text-[#50453b]">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h2 className="text-3xl font-bold font-['Sora',sans-serif] text-[#004d40]">Platform Capabilities</h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <motion.div 
              whileHover={{ y: -5 }}
              className="lg:col-span-2 bg-[#004d40] rounded-3xl p-8 text-white overflow-hidden relative"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <BarChart3 size={32} className="mb-6 text-[#a3e4d7]" />
              <h3 className="text-2xl font-bold mb-3">Automated Decision Engine</h3>
              <p className="text-white/80 max-w-md">Our backend math engine instantly evaluates LMO field test inputs against predefined legal tolerance limits, immediately flagging non-compliant instruments to ensure absolute accuracy.</p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white rounded-3xl p-8 border border-[#e6ded9] shadow-sm"
            >
              <Fingerprint size={32} className="mb-6 text-[#b71c1c]" />
              <h3 className="text-xl font-bold mb-3">Cryptographic QR Validation</h3>
              <p className="text-[#50453b]">Every issued certificate embeds a SHA-256 hashed QR token. Public inspectors can scan it to instantly verify validity against the central database.</p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="bg-white rounded-3xl p-8 border border-[#e6ded9] shadow-sm"
            >
              <ShieldCheck size={32} className="mb-6 text-[#004d40]" />
              <h3 className="text-xl font-bold mb-3">Role-Based Access</h3>
              <p className="text-[#50453b]">Strict segregation between Business Owners, LMOs, GATC Reviewers, and Super Admins guarantees operational security and isolated dashboards.</p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5 }}
              className="lg:col-span-2 bg-[#fdf9f4] rounded-3xl p-8 border border-[#e6ded9] shadow-sm relative overflow-hidden"
            >
              <FileCheck size={32} className="mb-6 text-[#004d40]" />
              <h3 className="text-2xl font-bold mb-3">Audit Logs & Transparency</h3>
              <p className="text-[#50453b] max-w-md">Every single state change—from application submission to final approval—is immutably tracked. Super Admins have complete visibility over the entire pipeline.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#e6ded9] bg-white py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Scale className="text-[#004d40]" size={24} />
            <span className="font-['Sora',sans-serif] font-bold text-[#1c1c19]">LM Certification Portal</span>
          </div>
          <p className="text-sm text-[#8b8782]">© {new Date().getFullYear()} Government of India. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
