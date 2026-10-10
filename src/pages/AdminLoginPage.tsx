import React, { FormEvent, useState } from 'react';
import { useSiteSettings } from '../components/SiteSettingsContext';

interface AdminLoginPageProps {
  needsOwnerSetup: boolean;
  firebaseMode: boolean;
  ownerSetupLoading: boolean;
  ownerSetupError: string;
  onLogin: (email: string, password: string) => Promise<void>;
  onSetupOwner: (email: string, password: string) => Promise<void>;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  needsOwnerSetup,
  firebaseMode,
  ownerSetupLoading,
  ownerSetupError,
  onLogin,
  onSetupOwner,
}) => {
  const settings = useSiteSettings();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    if (needsOwnerSetup && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (needsOwnerSetup) await onSetupOwner(email, password);
      else await onLogin(email, password);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to authenticate. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f8f9ff] flex items-center justify-center px-5 py-12">
      <section className="w-full max-w-md bg-white border border-[#e2e8f0] rounded-xl shadow-lg p-7 sm:p-9">
        <div className="flex items-center gap-3 mb-8">
          <img src={settings.logoUrl} alt={`${settings.brandName} logo`} className="h-10 w-10 object-contain" />
          <div>
            <h1 className="text-[20px] font-bold text-[#0b1c30]">{settings.brandName} Admin</h1>
            <p className="text-[12px] text-[#565e74]">Secure dashboard access</p>
          </div>
        </div>
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-wider text-[#004ac6] font-bold">{needsOwnerSetup ? 'First-time setup' : 'Admin portal'}</p>
          <h2 className="text-[26px] font-bold text-[#0b1c30] mt-1">{needsOwnerSetup ? 'Create Owner Account' : 'Sign in'}</h2>
          <p className="text-[13px] text-[#565e74] mt-2">
            {needsOwnerSetup ? 'Create the Main Owner account to initialize admin access.' : 'Sign in with your admin email and password.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="text-[13px] font-semibold text-[#0b1c30]">Username / Email
            <input autoComplete="username" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full h-11 px-3 rounded-lg bg-[#eff4ff] border border-[#d4d9e5] font-normal focus:outline-none focus:ring-2 focus:ring-[#004ac6]/30" />
          </label>
          <label className="text-[13px] font-semibold text-[#0b1c30]">Password
            <input autoComplete={needsOwnerSetup ? 'new-password' : 'current-password'} type="password" required minLength={needsOwnerSetup ? 12 : undefined} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full h-11 px-3 rounded-lg bg-[#eff4ff] border border-[#d4d9e5] font-normal focus:outline-none focus:ring-2 focus:ring-[#004ac6]/30" />
          </label>
          {needsOwnerSetup && (
            <label className="text-[13px] font-semibold text-[#0b1c30]">Confirm Password
              <input autoComplete="new-password" type="password" required minLength={12} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1 w-full h-11 px-3 rounded-lg bg-[#eff4ff] border border-[#d4d9e5] font-normal focus:outline-none focus:ring-2 focus:ring-[#004ac6]/30" />
            </label>
          )}
          {ownerSetupLoading && <p role="status" className="text-[12px] text-[#565e74]">Checking Firebase admin setup...</p>}
          {ownerSetupError && <p role="alert" className="text-[12px] text-[#ba1a1a]">{ownerSetupError}</p>}
          {error && <p role="alert" className="text-[12px] text-[#ba1a1a]">{error}</p>}
          <button disabled={isSubmitting || (firebaseMode && ownerSetupLoading)} type="submit" className="mt-2 h-11 rounded-lg bg-[#004ac6] hover:bg-[#2563eb] text-white font-semibold disabled:opacity-60">
            {isSubmitting ? 'Please wait...' : needsOwnerSetup ? 'Create Owner Account' : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 border-t border-[#e2e8f0] pt-4 text-[11px] leading-relaxed text-[#565e74]">
          {firebaseMode
            ? 'Credentials are stored by Firebase Authentication, and admin roles are verified against the Firestore users collection. First-time Owner setup is securely initialized through Firebase.'
            : 'This client-only demo stores account records in this browser. Configure Firebase Authentication before exposing admin access to the public internet.'}
        </p>
      </section>
    </main>
  );
};
