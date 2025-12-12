import React, { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
// Resolve auth at runtime to avoid bundling firebase in initial chunk
const resolveAuthClient = async () => {
  const mod: any = await import('../firebase');
  const auth = (mod.getAuthClient ? await mod.getAuthClient() : mod.auth) as any;
  const firebaseAuth = await import('firebase/auth');
  return { auth, firebaseAuth };
};
import AiAssistantChatbot from '../components/features/AiAssistantChatbot';
import AiAssistantChatbotMobile from '../components/features/AiAssistantChatbotMobile';
import Disclaimer from '../components/ui/Disclaimer';

const AiAssistantPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 767);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    let unsub: (() => void) | null = null;
    (async () => {
      try {
        const { auth, firebaseAuth } = await resolveAuthClient();
        unsub = firebaseAuth.onAuthStateChanged(auth, (user: User | null) => {
          setUser(user);
          setLoading(false);
        });
      } catch (err) {
        console.error('Failed to init auth listener', err);
        setLoading(false);
      }
    })();
    return () => { if (unsub) unsub(); };
  }, []);

  // Show disclaimer on first visit to the page (per browser) and allow reopening
  useEffect(() => {
    const seen = localStorage.getItem('novaDisclaimerSeen');
    setShowDisclaimerModal(!seen);
  }, []);

  const handleDismissDisclaimer = () => {
    setShowDisclaimerModal(false);
    localStorage.setItem('novaDisclaimerSeen', '1');
  };

  const handleOpenDisclaimer = () => {
    setShowDisclaimerModal(true);
  };

  // Handle window resize to switch between mobile and desktop
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 767);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) {
    return (
      <div className="ai-assistant-page">
        <div className="muted" style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="ai-assistant-page">
        <div className="muted" style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Not Signed In</p>
          <p>Please sign in to chat with Nova, your nutrition assistant.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-assistant-page">
      {showDisclaimerModal && (
        <div className="disclaimer-modal-overlay" role="dialog" aria-modal="true">
          <div className="disclaimer-modal">
            <Disclaimer />
            <div className="disclaimer-modal-actions">
              <button className="btn-secondary" onClick={handleDismissDisclaimer}>I Understand</button>
            </div>
          </div>
        </div>
      )}
      <main className="ai-assistant-content">
        <div className="ai-assistant-container" style={isMobile && dropdownOpen ? { maxHeight: 'none', overflowY: 'auto' } : {}}>
          {isMobile ? (
            <AiAssistantChatbotMobile onOpenDisclaimer={handleOpenDisclaimer} onDropdownOpenChange={setDropdownOpen} />
          ) : (
            <AiAssistantChatbot onOpenDisclaimer={handleOpenDisclaimer} />
          )}
          {/* Inline disclaimer removed; now shown in modal and via header icon */}
        </div>
      </main>
    </div>
  );
};

export default AiAssistantPage;

