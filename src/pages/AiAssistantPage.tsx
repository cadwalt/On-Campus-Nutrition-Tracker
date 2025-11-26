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

const AiAssistantPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="ai-assistant-page">
        <div className="page-header">
          <h1>Loading...</h1>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="ai-assistant-page">
        <div className="page-header">
          <h1>Not Signed In</h1>
          <p>Please sign in to chat with Alex, your nutrition assistant.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-assistant-page">
      <main className="ai-assistant-content">
        <div className="ai-assistant-container">
          <AiAssistantChatbot />
        </div>
      </main>
    </div>
  );
};

export default AiAssistantPage;

