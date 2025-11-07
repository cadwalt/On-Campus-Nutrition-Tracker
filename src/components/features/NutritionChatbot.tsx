// Floating Chatbot Component
import React, { useRef, useState, useEffect } from 'react';
import { getChatGptResponse } from '../../chatGptService';
import { auth, db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';

const NutritionChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [systemContext, setSystemContext] = useState<string | undefined>(undefined);

  // Auto-focus input when the panel opens for quick follow-ups
  useEffect(() => {
    if (isOpen) {
      // Slight delay to ensure element is mounted
      const id = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(id);
    }
  }, [isOpen]);

  // Load user profile context (allergies, restrictions, preferences, goals) when opening
  useEffect(() => {
    const loadContext = async () => {
      if (!isOpen) return;
      const user = auth.currentUser;
      if (!user) {
        setSystemContext(undefined);
        return;
      }
      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data() as any;
          const allergens: string[] = data.allergens || [];
          const ng = data.nutrition_goals || {};
          const prefs = ng.preferences || {};

          const parts: string[] = [];
          parts.push(`User: ${user.displayName || user.email || 'OU Student'}`);
          if (ng.primary_goal) parts.push(`Primary goal: ${ng.primary_goal}`);
          if (ng.activity_level) parts.push(`Activity level: ${ng.activity_level}`);
          if (ng.current_weight) parts.push(`Current weight: ${ng.current_weight} lbs`);
          if (ng.target_weight) parts.push(`Target weight: ${ng.target_weight} lbs`);
          if (ng.height) parts.push(`Height: ${ng.height} in`);
          if (ng.macro_targets) {
            parts.push(
              `Macro targets: ${ng.macro_targets.protein_percentage}% protein, ${ng.macro_targets.carbs_percentage}% carbs, ${ng.macro_targets.fat_percentage}% fat`
            );
          }
          if (allergens.length) parts.push(`Allergies: ${allergens.join(', ')}`);
          const restrictions: string[] = prefs.dietary_restrictions || [];
          if (restrictions.length) parts.push(`Dietary restrictions: ${restrictions.join(', ')}`);
          if (prefs.cooking_skill) parts.push(`Cooking skill: ${prefs.cooking_skill}`);
          if (prefs.meal_frequency) parts.push(`Meal frequency: ${prefs.meal_frequency} per day`);

          const contextText = parts.join('\n');
          setSystemContext(contextText || undefined);
        } else {
          setSystemContext(undefined);
        }
      } catch (e) {
        console.error('Failed to load user context for chatbot', e);
        setSystemContext(undefined);
      }
    };
    void loadContext();
  }, [isOpen]);

  const sendPrompt = async () => {
    if (!prompt.trim() || loading) return;
    const currentPrompt = prompt.trim();
    // Clear input immediately for a clean experience
    setPrompt('');
    // Add user's message to transcript so they can still see it
    setMessages((prev) => [...prev, { role: 'user', content: currentPrompt }]);
    setLoading(true);
    try {
      const result = await getChatGptResponse(currentPrompt, systemContext);
      setMessages((prev) => [...prev, { role: 'assistant', content: result }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Error fetching response' }]);
    } finally {
      setLoading(false);
      // Return focus to the input for rapid follow-ups
      inputRef.current?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendPrompt();
  };

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          className="chatbot-toggle-button"
          onClick={() => setIsOpen(true)}
          aria-label="Open Nutrition Assistant"
        >
          <svg 
            width="28" 
            height="28" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            <path d="M8 10h.01M12 10h.01M16 10h.01"/>
          </svg>
        </button>
      )}

      {/* Chatbot Panel */}
      {isOpen && (
        <div className="chatbot-panel">
          <div className="chatbot-header">
            <div className="chatbot-header-content">
              <div className="chatbot-icon">
                <svg 
                  width="24" 
                  height="24" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                >
                  <path d="M12 2a10 10 0 0 1 7.07 17.07 10 10 0 1 1-14.14 0A10 10 0 0 1 12 2z"/>
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                </svg>
              </div>
              <div>
                <h3>Nutrition Assistant</h3>
                <p>Ask me about nutrition, meal ideas, or dietary advice</p>
              </div>
            </div>
            <button
              className="chatbot-close-button"
              onClick={() => setIsOpen(false)}
              aria-label="Close"
              title="Close"
            >
              {/* Use a clear close symbol for better affordance */}
              <span aria-hidden="true" style={{ fontSize: 18, lineHeight: 1 }}>
                ×
              </span>
            </button>
          </div>

          <div className="chatbot-body">
            {messages.length > 0 ? (
              <div>
                {messages.map((m, idx) => (
                  <div key={idx} className="chatbot-response">
                    <div className="response-label">{m.role === 'assistant' ? 'Assistant:' : 'You:'}</div>
                    <div className="response-text">{m.content}</div>
                  </div>
                ))}
                {loading && (
                  <div className="chatbot-response">
                    <div className="response-label">Assistant:</div>
                    <div className="response-text">Thinking…</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="chatbot-placeholder">
                <p>👋 Hi! I'm your nutrition assistant.</p>
                <p>Ask me questions like:</p>
                <ul>
                  <li
                    role="button"
                    tabIndex={0}
                    onClick={() => { setPrompt('What are good high-protein breakfast ideas?'); inputRef.current?.focus(); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setPrompt('What are good high-protein breakfast ideas?'); inputRef.current?.focus(); } }}
                  >
                    "What are good high-protein breakfast ideas?"
                  </li>
                  <li
                    role="button"
                    tabIndex={0}
                    onClick={() => { setPrompt('How can I increase my fiber intake?'); inputRef.current?.focus(); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setPrompt('How can I increase my fiber intake?'); inputRef.current?.focus(); } }}
                  >
                    "How can I increase my fiber intake?"
                  </li>
                  <li
                    role="button"
                    tabIndex={0}
                    onClick={() => { setPrompt("What's a healthy pre-workout snack?"); inputRef.current?.focus(); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setPrompt("What's a healthy pre-workout snack?"); inputRef.current?.focus(); } }}
                  >
                    "What's a healthy pre-workout snack?"
                  </li>
                </ul>
              </div>
            )}
          </div>

          <form className="chatbot-input-area" onSubmit={handleSubmit}>
            <textarea
              className="chatbot-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask a nutrition question..."
              rows={3}
              disabled={loading}
              ref={inputRef}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void sendPrompt();
                }
              }}
            />
            <button 
              type="submit" 
              className="chatbot-send-button"
              disabled={loading || !prompt.trim()}
            >
              {loading ? (
                <span>Thinking...</span>
              ) : (
                <>
                  <span>Send</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default NutritionChatbot;
