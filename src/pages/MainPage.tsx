import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { getChatGptResponse } from '../chatGptService';
import RestaurantDisplay from '../components/RestaurantDisplay';

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
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Nutrition Dashboard</h1>
          <p>Track your nutrition and get personalized recommendations</p>
          <div className="header-actions">
            <Link to="/auth" className="auth-link">Sign In / Sign Up</Link>
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        <RestaurantDisplay />
        
        <div className="card">
          <h2>Nutrition Assistant</h2>
          <textarea
            className="prompt-input"
            placeholder="Ask about nutrition, meal planning, or campus dining options..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
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
      </main>
    </div>
  );
};

export default Dashboard;
