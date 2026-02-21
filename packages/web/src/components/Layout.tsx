import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Nav from './Nav';
import BetSlipV2 from './BetSlipV2';
import AuthModal from './AuthModal';
import KimiToast from './KimiToast';
import { useAuthStore } from '@/stores/authStore';
import { useSlipStore } from '@/stores/slipStore';
import { Crosshair, Github } from 'lucide-react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [showAuth, setShowAuth] = useState(false);
  const [mobileSlip, setMobileSlip] = useState(false);
  const picks = useSlipStore((s) => s.picks);
  const user = useAuthStore((s) => s.user);

  const isBoard = router.pathname === '/';

  return (
    <div className="app-shell">
      <Nav
        onLoginClick={() => setShowAuth(true)}
        onSlipToggle={() => setMobileSlip((p) => !p)}
      />

      <div className={`app-body ${!isBoard ? 'app-body-full' : ''}`}>
        {/* Main content */}
        <main className="app-main">{children}</main>

        {/* Desktop sidebar slip — only on Board */}
        {isBoard && (
          <aside className="slip-sidebar">
            <BetSlipV2 onAuthRequired={() => setShowAuth(true)} />
          </aside>
        )}
      </div>

      {/* Mobile slip overlay — only on Board */}
      {isBoard && mobileSlip && (
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

      {/* Mobile FAB — only on Board */}
      {isBoard && picks.length > 0 && !mobileSlip && (
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

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="footer-brand-name">KIMI</span>
            <span>Esports Props Platform</span>
          </div>
          <div className="footer-links">
            <span>Play money only — not real gambling</span>
            <span className="footer-dot">•</span>
            <a href="https://github.com/JonathanDunkleberger/Kimi" target="_blank" rel="noopener noreferrer">
              <Github size={12} style={{ display: 'inline', verticalAlign: -1, marginRight: 3 }} />
              GitHub
            </a>
            <span className="footer-dot">•</span>
            <span>Built by Jonathan Dunkleberger</span>
          </div>
        </div>
      </footer>
    </div>
  );
}