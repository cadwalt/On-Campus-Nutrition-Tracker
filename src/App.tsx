import { useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';
import { getChatGptResponse } from './chatGptService';

function App() {
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
    <div className="app-container">
      <header className="app-header">
        <img src={viteLogo} className="logo vite" alt="Vite logo" />
        <img src={reactLogo} className="logo react" alt="React logo" />
        <h1>On-Campus Nutrition Tracker</h1>
        <p className="subtitle">Coming soon...</p>
      </header>

      <main className="app-main">
        <div className="card">
          <textarea
            className="prompt-input"
            placeholder="Enter your prompt here..."
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
              {loading ? 'Loading...' : 'Get GPT Response'}
            </button>
          </div>
          <div className="response-container">
            <h2>GPT Response:</h2>
            <p className="response-text">{response}</p>
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <p>Made with ❤️ by Group I</p>
      </footer>
    </div>
  );
}

export default App;