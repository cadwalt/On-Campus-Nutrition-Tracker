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
      <main className="ai-assistant-content">
        <div className="ai-assistant-container">
          {isMobile ? <AiAssistantChatbotMobile /> : <AiAssistantChatbot />}
          <Disclaimer className="ai-assistant-page-disclaimer" />
        </div>
      </main>
    </div>
  );
};

export default AiAssistantPage;

