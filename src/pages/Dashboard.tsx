import React, { useState } from 'react';
import { getChatGptResponse } from '../chatGptService';
import RestaurantDisplay from '../components/features/RestaurantDisplay';

const Dashboard: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChatGptCall = async () => {
    if (!prompt.trim()) {
      setResponse('Please enter a prompt.');
      return;
    }

    setLoading(true);
    try {
      const result = await getChatGptResponse(prompt);
      setResponse(result);
    } catch (error) {
      setResponse('Error fetching response');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Nutrition Dashboard</h1>
        <p>Track your nutrition and get personalized recommendations</p>
      </div>

      <main className="dashboard-content">
        <div className="dashboard-grid">
          <div className="dashboard-left">
            <RestaurantDisplay />
            
            <div className="card">
              <h2>Quick Stats</h2>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-number">0</div>
                  <div className="stat-label">Meals Tracked</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">0</div>
                  <div className="stat-label">Calories Today</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">0</div>
                  <div className="stat-label">Water Intake</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">0</div>
                  <div className="stat-label">Active Days</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="dashboard-right">
            <div className="card">
              <h2>Nutrition Assistant</h2>
              <textarea
                className="prompt-input"
                placeholder="Ask about nutrition, meal planning, or campus dining options..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={6}
              />
              <div className="button-container">
                <button
                  className="response-button"
                  onClick={handleChatGptCall}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Get Nutrition Advice'}
                </button>
              </div>
              <div className="response-container">
                <h3>AI Response:</h3>
                <p className="response-text">{response}</p>
              </div>
            </div>
            
            <div className="card">
              <h2>Recent Meals</h2>
              <div className="meal-list">
                <div className="meal-item">
                  <div className="meal-time">12:30 PM</div>
                  <div className="meal-name">Lunch - Chicken Salad</div>
                  <div className="meal-calories">450 cal</div>
                </div>
                <div className="meal-item">
                  <div className="meal-time">8:00 AM</div>
                  <div className="meal-name">Breakfast - Oatmeal</div>
                  <div className="meal-calories">320 cal</div>
                </div>
                <div className="meal-item">
                  <div className="meal-time">Yesterday</div>
                  <div className="meal-name">Dinner - Pasta</div>
                  <div className="meal-calories">680 cal</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
