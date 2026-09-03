import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import type { Session } from '@supabase/supabase-js';

import Login from './pages/Login';
import Register from './pages/Register';
import OwnerDashboard from './pages/OwnerDashboard';
import RegisterInstrument from './pages/RegisterInstrument';
import MyInstruments from './pages/MyInstruments';
import NewApplication from './pages/NewApplication';
import MyApplications from './pages/MyApplications';
import LMODashboard from './pages/LMODashboard';
import LMOInspection from './pages/LMOInspection';
import GATCDashboard from './pages/GATCDashboard';
import GATCReview from './pages/GATCReview';
import CertificateVerification from './pages/CertificateVerification';
import AdminDashboard from './pages/AdminDashboard';
import Landing from './pages/Landing';

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex h-screen items-center justify-center bg-[#fdf9f4] text-[#50453b]">Loading...</div>;
  }

  const role = session?.user?.user_metadata?.role || 'owner';
  
  let DashboardComponent = <OwnerDashboard />;
  if (role === 'lmo') DashboardComponent = <LMODashboard />;
  if (role === 'gatc') DashboardComponent = <GATCDashboard />;
  if (role === 'admin') DashboardComponent = <AdminDashboard />;

  return (
    <Router>
      <div className="min-h-screen bg-[#fdf9f4] text-[#1c1c19] font-sans">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={session ? DashboardComponent : <Navigate to="/login" replace />} />
          <Route path="/login" element={!session ? <Login /> : <Navigate to="/dashboard" replace />} />
          <Route path="/register" element={!session ? <Register /> : <Navigate to="/dashboard" replace />} />
          <Route path="/verify" element={<CertificateVerification />} />
          
          {/* Protected routes */}
          
          {/* Owner routes */}
          <Route path="/instruments" element={session ? <MyInstruments /> : <Navigate to="/login" />} />
          <Route path="/instruments/new" element={session ? <RegisterInstrument /> : <Navigate to="/login" />} />
          <Route path="/applications" element={session ? <MyApplications /> : <Navigate to="/login" />} />
          <Route path="/applications/new" element={session ? <NewApplication /> : <Navigate to="/login" />} />
          
          {/* LMO routes */}
          <Route path="/lmo/applications/:id" element={session ? <LMOInspection /> : <Navigate to="/login" />} />
          
          {/* GATC routes */}
          <Route path="/gatc/applications/:id" element={session ? <GATCReview /> : <Navigate to="/login" />} />
          
          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to={session ? "/dashboard" : "/"} replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
