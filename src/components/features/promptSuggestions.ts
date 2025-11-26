import React from 'react';
import { CalendarIcon, UtensilsIcon, NutIcon, WheatIcon, DumbbellIcon, BreadIcon, DropletIcon, TargetIcon, ScaleIcon, ChartIcon, PackageIcon } from '../ui/Icons';

export interface PromptSuggestion {
  id: string;
  text: string;
  category: 'meal-planning' | 'nutrition-advice' | 'goal-support' | 'quick-questions';
  Icon: React.ComponentType<{ className?: string; size?: number }>;
}

export const PROMPT_SUGGESTIONS: PromptSuggestion[] = [
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
  {
    id: 'meal-plan-5',
    text: 'Plan my meals for the rest of the week',
    category: 'meal-planning',
    Icon: PackageIcon
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
  {
    id: 'goal-4',
    text: 'How am I doing with my protein goal this week?',
    category: 'goal-support',
    Icon: DumbbellIcon
  },
  {
    id: 'goal-5',
    text: 'What should I focus on to reach my primary goal faster?',
    category: 'goal-support',
    Icon: TargetIcon
  },
  {
    id: 'goal-6',
    text: 'Am I eating too many or too few calories for my goals?',
    category: 'goal-support',
    Icon: ScaleIcon
  },
  // Quick Questions
  {
    id: 'quick-1',
    text: 'What should I eat right now based on my remaining goals?',
    category: 'quick-questions',
    Icon: UtensilsIcon
  },
  {
    id: 'quick-2',
    text: 'Am I on track to meet my calorie goal today?',
    category: 'quick-questions',
    Icon: TargetIcon
  },
  {
    id: 'quick-3',
    text: 'What are some quick and healthy snack options?',
    category: 'quick-questions',
    Icon: NutIcon
  },
  {
    id: 'quick-4',
    text: 'How can I get more protein in my meals?',
    category: 'quick-questions',
    Icon: DumbbellIcon
  },
  {
    id: 'quick-5',
    text: 'What should I eat for my next meal?',
    category: 'quick-questions',
    Icon: CalendarIcon
  },
  {
    id: 'quick-6',
    text: 'Are there any foods I should avoid based on my goals?',
    category: 'quick-questions',
    Icon: WheatIcon
  }
];

