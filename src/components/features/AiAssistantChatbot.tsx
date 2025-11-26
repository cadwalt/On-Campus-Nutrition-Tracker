// Enhanced AI Assistant Chatbot Component
import React, { useRef, useState, useEffect, useMemo } from 'react';
import type { User } from 'firebase/auth';
import { resolveFirebase } from '../../lib/resolveFirebase';
import { NovaIcon, UserIcon, InfoIcon } from '../ui/Icons';
import { PROMPT_SUGGESTIONS, type PromptSuggestion } from './promptSuggestions';
import { buildSystemContext } from './buildSystemContext';

const AiAssistantChatbot: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [systemContext, setSystemContext] = useState<string | undefined>(undefined);
  const [selectedCategory, setSelectedCategory] = useState<string | null>('quick-questions');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [capabilities, setCapabilities] = useState({
    knowsGoals: true,
    tracksIntake: true,
    personalizedAdvice: true
  });
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Get current time of day
  const timeOfDay = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }, []);

  // Track auth state
  useEffect(() => {
    let unsub: (() => void) | null = null;
    (async () => {
      try {
        const { auth, firebaseAuth } = await resolveFirebase();
        unsub = firebaseAuth.onAuthStateChanged(auth, (u: User | null) => setUser(u));
      } catch (err) {
        console.error('Auth listener init failed', err);
      }
    })();
    return () => { if (unsub) unsub(); };
  }, []);

  // Build comprehensive system context
  useEffect(() => {
    if (!user) {
      setSystemContext(undefined);
      return;
    }

    const loadContext = async () => {
      const context = await buildSystemContext({
        userId: user.uid,
        capabilities,
        timeOfDay
      });
      setSystemContext(context);
    };

    void loadContext();
  }, [user, timeOfDay, capabilities]);

  // Load capability preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('nova-capabilities');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCapabilities({
          knowsGoals: parsed.knowsGoals !== false,
          tracksIntake: parsed.tracksIntake !== false,
          personalizedAdvice: parsed.personalizedAdvice !== false
        });
      } catch (e) {
        // Invalid JSON, use defaults
      }
    }
  }, []);

  // Save capability preferences to localStorage
  useEffect(() => {
    localStorage.setItem('nova-capabilities', JSON.stringify(capabilities));
  }, [capabilities]);

  // Auto-focus input on mount
  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(id);
  }, []);

  const sendPrompt = async (promptText?: string) => {
    const currentPrompt = (promptText || prompt.trim());
    if (!currentPrompt || loading) return;
    
    setPrompt('');
    setMessages((prev) => [...prev, { role: 'user', content: currentPrompt }]);
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: currentPrompt, 
          systemContext: systemContext
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      const result = data.content;

      if (!result) {
        throw new Error('No response content received');
      }

      setMessages((prev) => [...prev, { role: 'assistant', content: result }]);
    } catch (error: any) {
      const errorMessage = error.message?.includes('Failed to fetch') 
        ? 'Unable to connect to the server. Please check your connection and try again.'
        : error.message || 'Sorry, I encountered an error. Please try again.';
      
      setMessages((prev) => [...prev, { role: 'assistant', content: errorMessage }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendPrompt();
  };

  const handleSuggestionClick = (suggestion: PromptSuggestion) => {
    setSelectedCategory(suggestion.category);
    setShowSuggestions(false);
    void sendPrompt(suggestion.text);
  };

  const handleCategoryFilterClick = (category: string | null) => {
    setSelectedCategory(category);
    setShowSuggestions(true);
  };

  const filteredSuggestions = selectedCategory 
    ? PROMPT_SUGGESTIONS.filter(s => s.category === selectedCategory)
    : PROMPT_SUGGESTIONS;

  const categories = ['quick-questions', 'meal-planning', 'nutrition-advice', 'goal-support'] as const;
  const categoryLabels: Record<typeof categories[number], string> = {
    'meal-planning': 'Meal Planning',
    'nutrition-advice': 'Nutrition Advice',
    'goal-support': 'Goal Support',
    'quick-questions': 'Quick Questions'
  };

  return (
    <div className="ai-assistant-chatbot">
      <div className="ai-chatbot-header">
        <div className="ai-chatbot-header-content">
          <div className="ai-chatbot-icon">
            <svg 
              width="32" 
              height="32" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h2>Nova</h2>
              <span className="personalized-badge">Personalized</span>
            </div>
            <p>Your personalized nutrition assistant</p>
            <div className="category-section">
              <p className="category-label">Filter suggestions:</p>
              <div className="suggestion-categories">
                {categories.map(cat => (
                  <button
                    key={cat}
                    className={`category-filter ${selectedCategory === cat ? 'active' : ''}`}
                    onClick={() => handleCategoryFilterClick(cat)}
                  >
                    {categoryLabels[cat]}
                  </button>
                ))}
                <button
                  className={`category-filter ${selectedCategory === null ? 'active' : ''}`}
                  onClick={() => handleCategoryFilterClick(null)}
                >
                  All Suggestions
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="ai-chatbot-capabilities">
          <div className="capability-label-wrapper">
            <p className="capability-label">Allow Nova to access:</p>
            <div className="tooltip-container">
              <InfoIcon size={14} className="info-icon" />
              <div className="tooltip-content">
                <div className="tooltip-header">Permission Details:</div>
                <div className="tooltip-item">
                  <strong>Your Goals:</strong> Access to your nutrition goals, weight, activity level, and macro targets
                </div>
                <div className="tooltip-item">
                  <strong>Your Daily Intake:</strong> Access to what you've eaten today and your remaining nutrition targets
                </div>
                <div className="tooltip-item">
                  <strong>Personalized Information:</strong> Access to your allergies, dietary restrictions, cooking skill, and meal preferences
                </div>
              </div>
            </div>
          </div>
          <div className="capability-indicators">
            <button
              className={`capability-badge ${capabilities.knowsGoals ? 'active' : 'inactive'}`}
              onClick={() => setCapabilities(prev => ({ ...prev, knowsGoals: !prev.knowsGoals }))}
              title={capabilities.knowsGoals ? 'Click to disable' : 'Click to enable'}
            >
              {capabilities.knowsGoals ? '✓' : '○'} Your Goals
            </button>
            <button
              className={`capability-badge ${capabilities.tracksIntake ? 'active' : 'inactive'}`}
              onClick={() => setCapabilities(prev => ({ ...prev, tracksIntake: !prev.tracksIntake }))}
              title={capabilities.tracksIntake ? 'Click to disable' : 'Click to enable'}
            >
              {capabilities.tracksIntake ? '✓' : '○'} Your Daily Intake
            </button>
            <button
              className={`capability-badge ${capabilities.personalizedAdvice ? 'active' : 'inactive'}`}
              onClick={() => setCapabilities(prev => ({ ...prev, personalizedAdvice: !prev.personalizedAdvice }))}
              title={capabilities.personalizedAdvice ? 'Click to disable' : 'Click to enable'}
            >
              {capabilities.personalizedAdvice ? '✓' : '○'} Personalized Information
            </button>
          </div>
        </div>
      </div>

      <div className="ai-chatbot-body">
        {messages.length > 0 && (
          <div className="ai-chatbot-messages">
            {messages.map((m, idx) => (
              <div key={idx} className={`ai-message ai-message-${m.role}`}>
                <div className="ai-message-avatar">
                  {m.role === 'assistant' ? <NovaIcon size={20} /> : <UserIcon size={20} />}
                </div>
                <div className="ai-message-content">
                  <div className="ai-message-text">{m.content}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="ai-message ai-message-assistant">
                <div className="ai-message-avatar"><NovaIcon size={20} /></div>
                <div className="ai-message-content">
                  <div className="ai-message-text">
                    <span className="typing-indicator">
                      <span></span><span></span><span></span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {(messages.length === 0 || showSuggestions) && (
          <div className="ai-chatbot-welcome">
            {/* Prompt Suggestions */}
            <div className="prompt-suggestions">
              {filteredSuggestions.map((suggestion) => {
                const IconComponent = suggestion.Icon;
                return (
                  <button
                    key={suggestion.id}
                    className="prompt-suggestion"
                    onClick={() => handleSuggestionClick(suggestion)}
                    disabled={loading}
                  >
                    <span className="suggestion-icon">
                      <IconComponent size={20} />
                    </span>
                    <span className="suggestion-text">{suggestion.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <form className="ai-chatbot-input-area" onSubmit={handleSubmit}>
        <div className="ai-input-wrapper">
          <textarea
            className="ai-chatbot-input"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask Nova anything about nutrition, meal planning, or your goals..."
            rows={2}
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
            className="ai-chatbot-send-button"
            disabled={loading || !prompt.trim()}
            aria-label="Send message"
          >
            {loading ? (
              <span className="spinner"></span>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/>
              </svg>
            )}
          </button>
        </div>
        {messages.length > 0 && (
          <div className="ai-input-hint">
            Press Enter to send, Shift+Enter for new line
          </div>
        )}
      </form>
    </div>
  );
};

export default AiAssistantChatbot;

