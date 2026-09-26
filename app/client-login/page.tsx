'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function ClientLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await signIn('credentials', {
      email, password, redirect: false,
    });
    setLoading(false);
    
    if (res?.error) {
      setError('Invalid email or password. Please try again.');
    } else {
      try {
        const sessionRes = await fetch('/api/auth/session');
        const session = await sessionRes.json();
        if (session?.user?.role === 'admin' || session?.role === 'admin') {
          window.location.href = '/admin';
        } else {
          window.location.href = '/dashboard';
        }
      } catch (err) {
        window.location.href = '/dashboard';
      }
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center p-6 relative overflow-hidden pt-20">
      
      <div className="w-full max-w-md relative z-10 flex flex-col">
        
        <div className="flex flex-col items-center mb-10">
          <Link href="/" className="mb-4 hover:opacity-80 transition-opacity">
            <img src="/images/new-logo.jpg" alt="Riznex Logo" className="h-16 w-auto mix-blend-screen" />
          </Link>
          <h1 className="text-[1.35rem] font-black text-white uppercase tracking-wider mb-2">Welcome Back</h1>
          <h2 className="text-gray-400 text-[0.6rem] font-bold uppercase tracking-widest text-center">Access your Riznex Client Dashboard</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Email</label>
            <input 
              type="text" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Henley.Thames" 
              className="w-full bg-[#EBF1F7] border-none px-4 py-3.5 text-black focus:outline-none focus:ring-2 focus:ring-[#D1A041] transition-all text-sm rounded-sm placeholder:text-gray-500 font-medium" 
              required
            />
          </div>
          <div>
            <label className="block text-[0.65rem] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              className="w-full bg-[#EBF1F7] border-none px-4 py-3.5 text-black focus:outline-none focus:ring-2 focus:ring-[#D1A041] transition-all text-sm rounded-sm placeholder:text-gray-500 font-medium" 
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[0.65rem] font-bold uppercase tracking-widest rounded px-4 py-3 text-center">
              {error}
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-[#D1A041] text-black font-black tracking-widest uppercase text-[0.7rem] hover:bg-white transition-colors rounded-sm shadow-md mt-6 disabled:opacity-50"
          >
            {loading ? 'Logging In...' : 'Login To Dashboard'}
          </button>
        </form>
        
        <div className="mt-10 flex justify-center border-t border-white/5 pt-8">
          <a href="#" className="text-[0.65rem] text-gray-600 font-bold uppercase tracking-widest hover:text-[#D1A041] transition-colors">Forgot Password?</a>
        </div>

      </div>
    </div>
  );
}
