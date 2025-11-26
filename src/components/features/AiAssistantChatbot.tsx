// Enhanced AI Assistant Chatbot Component
import React, { useRef, useState, useEffect, useMemo } from 'react';
import type { User } from 'firebase/auth';
import { resolveFirebase } from '../../lib/resolveFirebase';
import type { Meal } from '../../types/meal';
import type { NutritionGoals } from '../../types/nutrition';
import { calculateActualCalories, calculateActualMacros } from '../../utils/mealCalculations';
import { computeNutritionPlan } from '../../utils/nutritionPlan';
import { AlexIcon, UserIcon, CalendarIcon, UtensilsIcon, NutIcon, WheatIcon, DumbbellIcon, BreadIcon, DropletIcon, TargetIcon, ScaleIcon, ChartIcon, RunningIcon, RefreshIcon, PackageIcon, TagIcon } from '../ui/Icons';

interface PromptSuggestion {
  id: string;
  text: string;
  category: 'meal-planning' | 'nutrition-advice' | 'goal-support' | 'quick-questions';
  Icon: React.ComponentType<{ className?: string; size?: number }>;
}

const PROMPT_SUGGESTIONS: PromptSuggestion[] = [
  // Meal Planning
  {
    id: 'meal-plan-1',
    text: 'Create a meal plan for today based on my remaining nutrition goals',
    category: 'meal-planning',
    Icon: CalendarIcon
  },
  {
    id: 'meal-plan-2',
    text: 'Suggest breakfast options that fit my dietary restrictions',
    category: 'meal-planning',
    Icon: UtensilsIcon
  },
  {
    id: 'meal-plan-3',
    text: 'What should I eat for dinner to meet my protein goal?',
    category: 'meal-planning',
    Icon: UtensilsIcon
  },
  {
    id: 'meal-plan-4',
    text: 'Give me healthy snack ideas that align with my goals',
    category: 'meal-planning',
    Icon: NutIcon
  },
  // Nutrition Advice
  {
    id: 'nutrition-1',
    text: 'How can I increase my fiber intake today?',
    category: 'nutrition-advice',
    Icon: WheatIcon
  },
  {
    id: 'nutrition-2',
    text: 'What foods are high in protein but low in calories?',
    category: 'nutrition-advice',
    Icon: DumbbellIcon
  },
  {
    id: 'nutrition-3',
    text: 'Explain the difference between good and bad carbs',
    category: 'nutrition-advice',
    Icon: BreadIcon
  },
  {
    id: 'nutrition-4',
    text: 'How much water should I drink based on my activity level?',
    category: 'nutrition-advice',
    Icon: DropletIcon
  },
  // Goal Support
  {
    id: 'goal-1',
    text: 'Help me understand if I\'m on track to meet my goals today',
    category: 'goal-support',
    Icon: TargetIcon
  },
  {
    id: 'goal-2',
    text: 'What adjustments should I make to reach my target weight?',
    category: 'goal-support',
    Icon: ScaleIcon
  },
  {
    id: 'goal-3',
    text: 'Suggest ways to improve my macro balance',
    category: 'goal-support',
    Icon: ChartIcon
  },
  // Quick Questions
  {
    id: 'quick-1',
    text: 'What are the best pre-workout meal options?',
    category: 'quick-questions',
    Icon: RunningIcon
  },
  {
    id: 'quick-2',
    text: 'Can you recommend post-workout recovery foods?',
    category: 'quick-questions',
    Icon: RefreshIcon
  },
  {
    id: 'quick-3',
    text: 'What are some healthy meal prep ideas for the week?',
    category: 'quick-questions',
    Icon: PackageIcon
  },
  {
    id: 'quick-4',
    text: 'How do I read nutrition labels effectively?',
    category: 'quick-questions',
    Icon: TagIcon
  }
];

const AiAssistantChatbot: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [systemContext, setSystemContext] = useState<string | undefined>(undefined);
  const [todayIntake, setTodayIntake] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [goals, setGoals] = useState<NutritionGoals | null>(null);
  const [nutritionPlan, setNutritionPlan] = useState<ReturnType<typeof computeNutritionPlan> | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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

  // Load user's nutrition goals
  useEffect(() => {
    if (!user) {
      setGoals(null);
      setNutritionPlan(null);
      return;
    }

    const loadGoals = async () => {
      try {
        const { db, firestore } = await resolveFirebase();
        const userDocRef = firestore.doc(db, 'users', user.uid);
        const userDocSnap = await firestore.getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          const userGoals = data.nutrition_goals || null;
          setGoals(userGoals);
          if (userGoals) {
            const plan = computeNutritionPlan(userGoals);
            setNutritionPlan(plan);
          }
        }
      } catch (error) {
        console.error('Error loading nutrition goals:', error);
      }
    };

    void loadGoals();
  }, [user]);

  // Calculate today's intake from meals
  useEffect(() => {
    if (!user) {
      setTodayIntake({ calories: 0, protein: 0, carbs: 0, fat: 0 });
      return;
    }

    let unsubLocal: (() => void) | null = null;
    (async () => {
      try {
        const { db, firestore } = await resolveFirebase();
        const mealsQ = firestore.query(firestore.collection(db, 'meals'), firestore.where('userId', '==', user.uid));
        unsubLocal = firestore.onSnapshot(mealsQ, (snap) => {
          const now = new Date();
          const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
          const endOfToday = startOfToday + 24 * 60 * 60 * 1000;

          let calories = 0;
          let protein = 0;
          let carbs = 0;
          let fat = 0;

          const toMillis = (val: any): number => {
            if (typeof val === 'number') return val;
            if (val && typeof val.seconds === 'number') return val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1e6);
            if (val instanceof Date) return val.getTime();
            return 0;
          };

          snap.forEach((docSnap: any) => {
            const meal = docSnap.data() as Meal;
            const ms = toMillis(meal.createdAt);

            if (ms >= startOfToday && ms < endOfToday) {
              calories += calculateActualCalories(meal);
              const macros = calculateActualMacros(meal);
              protein += macros.protein || 0;
              carbs += macros.carbs || 0;
              fat += macros.fat || 0;
            }
          });

          setTodayIntake({
            calories: Math.round(calories),
            protein: Math.round(protein * 10) / 10,
            carbs: Math.round(carbs * 10) / 10,
            fat: Math.round(fat * 10) / 10
          });
        });
      } catch (err) {
        console.error('Meals snapshot failed', err);
      }
    })();

    return () => { if (unsubLocal) unsubLocal(); };
  }, [user]);

  // Build comprehensive system context
  useEffect(() => {
    if (!user) {
      setSystemContext(undefined);
      return;
    }

    const buildContext = async () => {
      try {
        const { auth, db, firestore } = await resolveFirebase();
        const currentUser = auth.currentUser;
        if (!currentUser) {
          setSystemContext(undefined);
          return;
        }

        const userRef = firestore.doc(db, 'users', currentUser.uid);
        const snap = await firestore.getDoc(userRef);
        if (!snap.exists()) {
          setSystemContext(undefined);
          return;
        }

        const data = snap.data() as any;
        const allergens: string[] = data.allergens || [];
        const ng = data.nutrition_goals || {};
        const prefs = ng.preferences || {};

        const parts: string[] = [];
        
        // Assistant identity
        parts.push(`You are Alex, a friendly and knowledgeable nutrition assistant. You help users with personalized nutrition advice, meal planning, and achieving their health goals.`);
        parts.push(`Always introduce yourself as Alex and be conversational, supportive, and encouraging.`);
        
        // User info
        parts.push(`User: ${currentUser.displayName || currentUser.email || 'OU Student'}`);
        
        // Current time context
        parts.push(`Current time: ${timeOfDay} (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`);
        
        // Goals
        if (ng.primary_goal) parts.push(`Primary goal: ${ng.primary_goal}`);
        if (ng.activity_level) parts.push(`Activity level: ${ng.activity_level}`);
        if (ng.current_weight) parts.push(`Current weight: ${ng.current_weight} lbs`);
        if (ng.target_weight) parts.push(`Target weight: ${ng.target_weight} lbs`);
        if (ng.height) parts.push(`Height: ${ng.height} in`);
        
        // Macro targets
        if (ng.macro_targets) {
          parts.push(
            `Macro targets: ${ng.macro_targets.protein_percentage}% protein, ${ng.macro_targets.carbs_percentage}% carbs, ${ng.macro_targets.fat_percentage}% fat`
          );
        }
        
        // Dietary restrictions
        if (allergens.length) parts.push(`Allergies: ${allergens.join(', ')}`);
        const restrictions: string[] = prefs.dietary_restrictions || [];
        if (restrictions.length) parts.push(`Dietary restrictions: ${restrictions.join(', ')}`);
        if (prefs.cooking_skill) parts.push(`Cooking skill: ${prefs.cooking_skill}`);
        if (prefs.meal_frequency) parts.push(`Meal frequency: ${prefs.meal_frequency} per day`);

        // Today's intake and remaining goals
        if (nutritionPlan) {
          const remainingCalories = Math.max(0, nutritionPlan.targetCalories - todayIntake.calories);
          const remainingProtein = Math.max(0, nutritionPlan.macroGrams.protein - todayIntake.protein);
          const remainingCarbs = Math.max(0, nutritionPlan.macroGrams.carbs - todayIntake.carbs);
          const remainingFat = Math.max(0, nutritionPlan.macroGrams.fat - todayIntake.fat);

          parts.push(`\nToday's intake so far:`);
          parts.push(`- Calories: ${todayIntake.calories} / ${nutritionPlan.targetCalories} (${Math.round((todayIntake.calories / nutritionPlan.targetCalories) * 100)}%)`);
          parts.push(`- Protein: ${todayIntake.protein}g / ${Math.round(nutritionPlan.macroGrams.protein)}g (${Math.round((todayIntake.protein / nutritionPlan.macroGrams.protein) * 100)}%)`);
          parts.push(`- Carbs: ${todayIntake.carbs}g / ${Math.round(nutritionPlan.macroGrams.carbs)}g (${Math.round((todayIntake.carbs / nutritionPlan.macroGrams.carbs) * 100)}%)`);
          parts.push(`- Fat: ${todayIntake.fat}g / ${Math.round(nutritionPlan.macroGrams.fat)}g (${Math.round((todayIntake.fat / nutritionPlan.macroGrams.fat) * 100)}%)`);
          
          parts.push(`\nRemaining targets for today:`);
          parts.push(`- Calories: ${remainingCalories} remaining`);
          parts.push(`- Protein: ${Math.round(remainingProtein)}g remaining`);
          parts.push(`- Carbs: ${Math.round(remainingCarbs)}g remaining`);
          parts.push(`- Fat: ${Math.round(remainingFat)}g remaining`);
        }

        const contextText = parts.join('\n');
        setSystemContext(contextText || undefined);
      } catch (e) {
        console.error('Failed to build system context', e);
        setSystemContext(undefined);
      }
    };

    void buildContext();
  }, [user, goals, todayIntake, nutritionPlan, timeOfDay]);

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
        throw new Error('Server responded with an error');
      }

      const data = await response.json();
      const result = data.content;

      setMessages((prev) => [...prev, { role: 'assistant', content: result }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
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
    void sendPrompt(suggestion.text);
  };

  const filteredSuggestions = selectedCategory 
    ? PROMPT_SUGGESTIONS.filter(s => s.category === selectedCategory)
    : PROMPT_SUGGESTIONS;

  const categories = ['meal-planning', 'nutrition-advice', 'goal-support', 'quick-questions'] as const;
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
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h2>Alex</h2>
              <span className="personalized-badge">Personalized</span>
            </div>
            <p>Your personalized nutrition assistant</p>
            <div className="capability-indicators">
              <span className="capability-badge">✓ Knows Your Goals</span>
              <span className="capability-badge">✓ Tracks Daily Intake</span>
              <span className="capability-badge">✓ Personalized Advice</span>
            </div>
          </div>
        </div>
        {nutritionPlan && (
          <div className="ai-chatbot-stats">
            <div className="stat-mini">
              <span className="stat-label">Calories</span>
              <span className="stat-value">{todayIntake.calories}/{nutritionPlan.targetCalories}</span>
            </div>
            <div className="stat-mini">
              <span className="stat-label">Protein</span>
              <span className="stat-value">{Math.round(todayIntake.protein)}g</span>
            </div>
          </div>
        )}
      </div>

      <div className="ai-chatbot-body">
        {messages.length > 0 ? (
          <div className="ai-chatbot-messages">
            {messages.map((m, idx) => (
              <div key={idx} className={`ai-message ai-message-${m.role}`}>
                <div className="ai-message-avatar">
                  {m.role === 'assistant' ? <AlexIcon size={20} /> : <UserIcon size={20} />}
                </div>
                <div className="ai-message-content">
                  <div className="ai-message-text">{m.content}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div className="ai-message ai-message-assistant">
                <div className="ai-message-avatar"><AlexIcon size={20} /></div>
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
        ) : (
          <div className="ai-chatbot-welcome">
            {/* Category Filters */}
            <div className="suggestion-categories">
              <button
                className={`category-filter ${selectedCategory === null ? 'active' : ''}`}
                onClick={() => setSelectedCategory(null)}
              >
                All Suggestions
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`category-filter ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {categoryLabels[cat]}
                </button>
              ))}
            </div>

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
            placeholder="Ask Alex anything about nutrition, meal planning, or your goals..."
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

