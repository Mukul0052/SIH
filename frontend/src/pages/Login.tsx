import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[#fdf9f4]">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-sm border border-[#e6e2dd]">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[#1c1c19] mb-2 font-['Sora',sans-serif]">Welcome Back</h1>
          <p className="text-[#50453b]">Sign in to your Legal Metrology account</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-[#ffdad6] text-[#93000a] rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-[#1c1c19] uppercase tracking-wide mb-2">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-[#f7f3ee] border border-[#e6ded9] focus:outline-none focus:ring-2 focus:ring-[#004d40] focus:border-transparent transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1c1c19] uppercase tracking-wide mb-2">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-[#f7f3ee] border border-[#e6ded9] focus:outline-none focus:ring-2 focus:ring-[#004d40] focus:border-transparent transition-all"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#004d40] text-white font-semibold py-3 px-6 rounded-lg shadow-sm hover:bg-[#003d33] transition-colors mt-4"
          >
            Sign In
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-[#50453b]">
          <button onClick={() => navigate('/verify')} className="font-semibold text-[#004d40] hover:underline">
            Public Certificate Verification
          </button>
          <br/><br/>
          Don't have an account?{' '}
          <button onClick={() => navigate('/register')} className="font-semibold text-[#004d40] hover:underline">
            Register here
          </button>
        </p>
      </div>
    </div>
  );
}
