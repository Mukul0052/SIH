import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('owner');
  const [organization, setOrganization] = useState('');
  const [employeeRef, setEmployeeRef] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Using Supabase Auth to sign up
    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          role: role,
        }
      }
    });

    if (authError) {
      setError(authError.message);
      return;
    }

    if (data.user) {
      // In a real flow, we'd also insert into our public.users table or trigger a Supabase function.
      // For now, we'll just handle the auth state.
      if (role === 'lmo' || role === 'gatc') {
        setSuccess(true);
      } else {
        navigate('/');
      }
    }
  };

  if (success) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#fdf9f4]">
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-sm border border-[#e6e2dd] text-center">
          <h2 className="text-2xl font-bold text-[#1c1c19] mb-4">Registration Pending</h2>
          <p className="text-[#50453b] mb-6">
            Your registration as an officer/GATC has been received. Your account is pending admin approval.
          </p>
          <a href="/login" className="text-[#004d40] font-semibold hover:underline">Return to Login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-[#fdf9f4] py-12 overflow-auto">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-sm border border-[#e6e2dd]">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[#1c1c19] mb-2 font-['Sora',sans-serif]">Create Account</h1>
          <p className="text-[#50453b]">Register for Legal Metrology Services</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-[#ffdad6] text-[#93000a] rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#1c1c19] uppercase mb-1">Role</label>
              <select 
                value={role} 
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-[#f7f3ee] border border-[#e6ded9] text-[#1c1c19] focus:outline-none focus:ring-2 focus:ring-[#004d40] transition-shadow"
              >
                <option value="owner">Instrument Owner (Business)</option>
                <option value="lmo">Legal Metrology Officer (LMO)</option>
                <option value="gatc">Govt. Approved Test Centre (GATC)</option>
                <option value="admin">System Administrator (Admin)</option>
              </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1c1c19] uppercase mb-1">Full Name</label>
            <input
              type="text" required value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-[#f7f3ee] border border-[#e6ded9] focus:outline-none focus:ring-2 focus:ring-[#004d40]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1c1c19] uppercase mb-1">Email</label>
            <input
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-[#f7f3ee] border border-[#e6ded9] focus:outline-none focus:ring-2 focus:ring-[#004d40]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1c1c19] uppercase mb-1">Password</label>
            <input
              type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-[#f7f3ee] border border-[#e6ded9] focus:outline-none focus:ring-2 focus:ring-[#004d40]"
            />
          </div>

          {role === 'owner' && (
            <div>
              <label className="block text-sm font-semibold text-[#1c1c19] uppercase mb-1">Organization / Shop Name</label>
              <input
                type="text" value={organization} onChange={(e) => setOrganization(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-[#f7f3ee] border border-[#e6ded9] focus:outline-none focus:ring-2 focus:ring-[#004d40]"
              />
            </div>
          )}

          {(role === 'lmo' || role === 'gatc') && (
            <>
              <div>
                <label className="block text-sm font-semibold text-[#1c1c19] uppercase mb-1">Employee / License Ref</label>
                <input
                  type="text" required value={employeeRef} onChange={(e) => setEmployeeRef(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-[#f7f3ee] border border-[#e6ded9] focus:outline-none focus:ring-2 focus:ring-[#004d40]"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1c1c19] uppercase mb-1">Jurisdiction</label>
                <input
                  type="text" required value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-[#f7f3ee] border border-[#e6ded9] focus:outline-none focus:ring-2 focus:ring-[#004d40]"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="w-full bg-[#004d40] text-white font-semibold py-3 px-6 rounded-lg shadow-sm hover:bg-[#003d33] transition-colors mt-6"
          >
            Create Account
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-[#50453b]">
          Already have an account?{' '}
          <a href="/login" className="text-[#004d40] font-semibold hover:underline">
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
