'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { primaryButtonStyle, editInputStyle } from '@/lib/styles';

export default function AuthForm({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const { signIn, signUp } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setSubmitting(true);
    if (mode === 'sign-in') {
      const { error } = await signIn(email, password);
      setSubmitting(false);
      if (error) setError(error);
      else router.push('/');
    } else {
      const { error, needsEmailConfirm } = await signUp(email, password);
      setSubmitting(false);
      if (error) setError(error);
      else if (needsEmailConfirm) setNotice('Check your email to confirm your account, then sign in.');
      else router.push('/');
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <form
        onSubmit={handleSubmit}
        style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 28, width: 340, display: 'flex', flexDirection: 'column', gap: 14 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 30, height: 30, borderRadius: 7, background: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#fff' }}>
            C
          </div>
          <div style={{ fontWeight: 600, fontSize: 15, color: '#0f172a' }}>Carrier CRM</div>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={editInputStyle} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Password</span>
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} style={editInputStyle} />
        </label>

        {error && <div style={{ fontSize: 12, color: '#b91c1c' }}>{error}</div>}
        {notice && <div style={{ fontSize: 12, color: '#166534' }}>{notice}</div>}

        <button type="submit" disabled={submitting} style={{ ...primaryButtonStyle, padding: '10px 14px', opacity: submitting ? 0.6 : 1 }}>
          {mode === 'sign-in' ? 'Sign in' : 'Create account'}
        </button>

        <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center' }}>
          {mode === 'sign-in' ? (
            <>
              No account? <Link href="/sign-up">Sign up</Link>
            </>
          ) : (
            <>
              Already have an account? <Link href="/sign-in">Sign in</Link>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
