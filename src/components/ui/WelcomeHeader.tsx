import React from 'react';
import { type User } from 'firebase/auth';
import { SunHorizonIcon, SunIcon, MoonIcon } from './Icons';

// Get time-based greeting
const getTimeBasedGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return 'Good morning';
  } else if (hour >= 12 && hour < 17) {
    return 'Good afternoon';
  } else if (hour >= 17 && hour < 22) {
    return 'Good evening';
  } else {
    return 'Good night';
  }
};

// Get time-based icon and color
const getTimeBasedIcon = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return { Icon: SunHorizonIcon, color: '#8b5cf6' }; // purple-violet for sunrise
  } else if (hour >= 12 && hour < 17) {
    return { Icon: SunIcon, color: '#667eea' }; // indigo for midday
  } else if (hour >= 17 && hour < 22) {
    return { Icon: SunHorizonIcon, color: '#764ba2' }; // violet for sunset
  } else {
    return { Icon: MoonIcon, color: '#6366f1' }; // indigo-blue for night
  }
};

// Get time-based motivational subtitle
const getTimeBasedSubtitle = (): string => {
  const hour = new Date().getHours();
  const subtitles = {
    morning: [
      "Let's start your day with healthy choices!",
      "Ready to track your nutrition today?",
      "Time to fuel your body right!",
      "Let's take a look at your stats"
    ],
    afternoon: [
      "Let's check in on your progress!",
      "How are your goals looking today?",
      "Keep up the great work!",
      "Let's take a look at your stats"
    ],
    evening: [
      "Let's see how you did today!",
      "Review your nutrition journey",
      "Great job staying on track!",
      "Let's take a look at your stats"
    ],
    night: [
      "Rest well, you've earned it!",
      "Let's review today's progress",
      "Time to wind down and reflect",
      "Let's take a look at your stats"
    ]
  };

  let category: keyof typeof subtitles;
  if (hour >= 5 && hour < 12) {
    category = 'morning';
  } else if (hour >= 12 && hour < 17) {
    category = 'afternoon';
  } else if (hour >= 17 && hour < 22) {
    category = 'evening';
  } else {
    category = 'night';
  }

  const options = subtitles[category];
  return options[Math.floor(Math.random() * options.length)];
};

// Format date nicely
const getFormattedDate = (): string => {
  const today = new Date();
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  return today.toLocaleDateString('en-US', options);
};

interface WelcomeHeaderProps {
  user: User | null;
}

const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({ user }) => {
  // Get user's display name or fallback to email or generic greeting
  const userName = user?.displayName || user?.email?.split('@')[0] || 'there';
  const greeting = getTimeBasedGreeting();
  const { Icon: TimeIcon, color: iconColor } = getTimeBasedIcon();
  const subtitle = getTimeBasedSubtitle();
  const dateString = getFormattedDate();

  return (
    <div className="dashboard-welcome-header">
      <div className="welcome-content">
        <div className="welcome-main">
          <div className="welcome-icon-wrapper">
            <TimeIcon className="welcome-icon" size={64} style={{ color: iconColor }} />
          </div>
          <div className="welcome-text">
            <h1 className="welcome-message">
              <span>{greeting}, {userName}!</span>
            </h1>
            <p className="welcome-subtitle">{subtitle}</p>
          </div>
        </div>
        <div className="welcome-date-wrapper">
          <div className="welcome-date">{dateString}</div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeHeader;

