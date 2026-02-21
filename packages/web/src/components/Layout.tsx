import React, { useState } from 'react';
import Nav from './Nav';
import BetSlipV2 from './BetSlipV2';
import AuthModal from './AuthModal';
import KimiToast from './KimiToast';
import { useAuthStore } from '@/stores/authStore';
import { useSlipStore } from '@/stores/slipStore';
import { Crosshair } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [showAuth, setShowAuth] = useState(false);
  const [mobileSlip, setMobileSlip] = useState(false);
  const picks = useSlipStore((s) => s.picks);
  const user = useAuthStore((s) => s.user);

  return (
    <div className="app-shell">
      <Nav
        onLoginClick={() => setShowAuth(true)}
        onSlipToggle={() => setMobileSlip((p) => !p)}
      />

      <div className="app-body">
        {/* Main content */}
        <main className="app-main">{children}</main>

        {/* Desktop sidebar slip */}
        <aside className="slip-sidebar">
          <BetSlipV2 onAuthRequired={() => setShowAuth(true)} />
        </aside>
      </div>

      {/* Mobile slip overlay */}
      {mobileSlip && (
        <div className="mobile-slip-overlay">
          <div className="mobile-slip-backdrop" onClick={() => setMobileSlip(false)} />
          <div className="mobile-slip-sheet">
            <BetSlipV2
              onClose={() => setMobileSlip(false)}
              onAuthRequired={() => { setMobileSlip(false); setShowAuth(true); }}
            />
          </div>
        </div>
      )}

      {/* Mobile FAB */}
      {picks.length > 0 && !mobileSlip && (
        <button
          className="mobile-slip-fab"
          onClick={() => setMobileSlip(true)}
        >
          <span style={{ display: 'flex', alignItems: 'center' }}><Crosshair size={16} /></span>
          <span>{picks.length} Pick{picks.length !== 1 ? 's' : ''}</span>
        </button>
      )}

      {/* Auth modal */}
      {showAuth && !user && (
        <AuthModal open={true} onClose={() => setShowAuth(false)} />
      )}

      {/* Toast */}
      <KimiToast />
    </div>
  );
}