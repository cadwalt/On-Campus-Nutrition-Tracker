import React, { useMemo } from 'react';
import type { WaterLog } from '../../types/water';
import { mlToOz, ozToMl } from '../../types/water';

export interface WaterSuggestion {
  type: 'time' | 'progress' | 'pattern' | 'tip' | 'reminder' | 'welcome';
  message: string;
  icon: string;
  priority: number;
  actionAmount?: number;
}

interface WaterSmartSuggestionsProps {
  logs: WaterLog[] | null;
  totalMlToday: number;
  progressPercentage: number;
  remainingMl: number;
  remainingOz: number;
  unit: 'oz' | 'ml';
  todayRange: { startMs: number; endMs: number };
  user: any | null;
  loading: boolean;
  onAddWater: (amountMl: number) => void;
}

const toMillis = (val: any): number => {
  if (typeof val === 'number') return val;
  if (val && typeof val.seconds === 'number') return val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1e6);
  if (val instanceof Date) return val.getTime();
  return 0;
};

export const generateSmartSuggestions = (
  logs: WaterLog[] | null,
  totalMlToday: number,
  progressPercentage: number,
  remainingMl: number,
  remainingOz: number,
  unit: 'oz' | 'ml',
  todayRange: { startMs: number; endMs: number }
): WaterSuggestion[] => {
  if (!logs || logs.length === 0) {
    return [
      {
        type: 'welcome',
        message: 'Start your hydration journey! Drink water regularly throughout the day.',
        icon: '💧',
        priority: 1,
      },
    ];
  }

  const suggestions: WaterSuggestion[] = [];

  // Time-based suggestion: Check time since last drink
  const todayLogs = logs.filter((log) => {
    const ms = toMillis((log as any).createdAt);
    return ms >= todayRange.startMs && ms < todayRange.endMs;
  });

  if (todayLogs.length > 0) {
    const lastLog = todayLogs.sort((a, b) => 
      toMillis((b as any).createdAt) - toMillis((a as any).createdAt)
    )[0];
    const lastDrinkTime = toMillis((lastLog as any).createdAt);
    const hoursSinceLastDrink = (Date.now() - lastDrinkTime) / (1000 * 60 * 60);

    if (hoursSinceLastDrink >= 3) {
      suggestions.push({
        type: 'reminder',
        message: `It's been ${Math.round(hoursSinceLastDrink)} hours since your last drink. Time to hydrate!`,
        icon: '⏰',
        priority: 3,
        actionAmount: unit === 'oz' ? 8 : 237,
      });
    } else if (hoursSinceLastDrink >= 2) {
      suggestions.push({
        type: 'reminder',
        message: `It's been about ${Math.round(hoursSinceLastDrink)} hours. Consider drinking some water.`,
        icon: '💡',
        priority: 2,
        actionAmount: unit === 'oz' ? 8 : 237,
      });
    }
  } else {
    // No drinks today
    suggestions.push({
      type: 'reminder',
      message: "You haven't had any water today. Start with a glass!",
      icon: '🚀',
      priority: 4,
      actionAmount: unit === 'oz' ? 8 : 237,
    });
  }

  // Progress-based suggestions
  if (progressPercentage >= 100) {
    suggestions.push({
      type: 'progress',
      message: '🎉 Amazing! You\'ve reached your daily goal! Keep up the great work.',
      icon: '🌟',
      priority: 1,
    });
  } else if (progressPercentage >= 75) {
    suggestions.push({
      type: 'progress',
      message: `You're ${Math.round(100 - progressPercentage)}% away from your goal! Almost there!`,
      icon: '🔥',
      priority: 2,
      actionAmount: unit === 'oz' ? Math.max(8, Math.round(remainingOz / 2)) : Math.max(237, Math.round(remainingMl / 2)),
    });
  } else if (progressPercentage >= 50) {
    suggestions.push({
      type: 'progress',
      message: `Great progress! You're halfway there. ${unit === 'oz' ? `${Math.round(remainingOz)} oz` : `${Math.round(remainingMl)} ml`} to go.`,
      icon: '👍',
      priority: 2,
    });
  } else if (progressPercentage < 25 && totalMlToday > 0) {
    suggestions.push({
      type: 'progress',
      message: `You're off to a good start! Try to drink more consistently throughout the day.`,
      icon: '📈',
      priority: 3,
    });
  }

  // Time of day suggestions
  const currentHour = new Date().getHours();
  if (currentHour >= 6 && currentHour < 10) {
    suggestions.push({
      type: 'tip',
      message: 'Morning tip: Start your day with a glass of water to kickstart your metabolism!',
      icon: '🌅',
      priority: 1,
    });
  } else if (currentHour >= 10 && currentHour < 14) {
    suggestions.push({
      type: 'tip',
      message: 'Midday reminder: Stay hydrated during the active part of your day!',
      icon: '☀️',
      priority: 1,
    });
  } else if (currentHour >= 14 && currentHour < 18) {
    suggestions.push({
      type: 'tip',
      message: 'Afternoon tip: Keep a water bottle nearby to maintain steady hydration.',
      icon: '🌤️',
      priority: 1,
    });
  } else if (currentHour >= 18 && currentHour < 22) {
    suggestions.push({
      type: 'tip',
      message: 'Evening reminder: Drink water with dinner, but avoid large amounts before bed.',
      icon: '🌙',
      priority: 1,
    });
  }

  // Pattern-based: Check if user drinks consistently
  if (todayLogs.length >= 3) {
    const intervals: number[] = [];
    const sortedLogs = [...todayLogs].sort((a, b) => 
      toMillis((a as any).createdAt) - toMillis((b as any).createdAt)
    );
    for (let i = 1; i < sortedLogs.length; i++) {
      const interval = (toMillis((sortedLogs[i] as any).createdAt) - toMillis((sortedLogs[i-1] as any).createdAt)) / (1000 * 60 * 60);
      intervals.push(interval);
    }
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    if (avgInterval <= 2) {
      suggestions.push({
        type: 'pattern',
        message: 'Great consistency! You\'re drinking regularly throughout the day.',
        icon: '✨',
        priority: 1,
      });
    }
  }

  // Sort by priority (higher priority first) and return top 2-3
  return suggestions.sort((a, b) => b.priority - a.priority).slice(0, 3);
};

const WaterSmartSuggestions: React.FC<WaterSmartSuggestionsProps> = ({
  logs,
  totalMlToday,
  progressPercentage,
  remainingMl,
  remainingOz,
  unit,
  todayRange,
  user,
  loading,
  onAddWater,
}) => {
  const smartSuggestions = useMemo(() => {
    return generateSmartSuggestions(
      logs,
      totalMlToday,
      progressPercentage,
      remainingMl,
      remainingOz,
      unit,
      todayRange
    );
  }, [logs, totalMlToday, progressPercentage, remainingMl, remainingOz, unit, todayRange]);

  return (
    <div className="card">
      <div className="section-header-with-tooltip">
        <h2>Smart Suggestions</h2>
      </div>
      <div className="water-tracker">
        {smartSuggestions.length > 0 ? (
          <div className="water-suggestions-list">
            {smartSuggestions.map((suggestion, index) => (
              <div key={index} className="water-suggestion-item">
                <div className="water-suggestion-icon">{suggestion.icon}</div>
                <div className="water-suggestion-content">
                  <p className="water-suggestion-message">{suggestion.message}</p>
                  {suggestion.actionAmount && user && (
                    <button
                      className="water-suggestion-action"
                      onClick={() => {
                        const amountMl = unit === 'oz' ? ozToMl(suggestion.actionAmount!) : suggestion.actionAmount!;
                        onAddWater(amountMl);
                      }}
                      disabled={loading}
                    >
                      Add {suggestion.actionAmount} {unit}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="muted" style={{ textAlign: 'center', padding: '1rem' }}>
            Keep tracking your water intake for personalized suggestions!
          </div>
        )}
      </div>
    </div>
  );
};

export default WaterSmartSuggestions;

