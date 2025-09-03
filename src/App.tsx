import { useState } from 'react';
import reactLogo from './assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="app-container">
      <header className="app-header">
        <img src={viteLogo} className="logo vite" alt="Vite logo" />
        <img src={reactLogo} className="logo react" alt="React logo" />
        <h1>On-Campus Nutrition Tracker</h1>
        <p className="subtitle">Coming Soon...</p>
      </header>

      <main className="app-main">
        <div className="card">
          <button className="support-button" onClick={() => setCount((count) => count + 1)}>
            Click to show support: {count}
          </button>
        </div>
      </main>

      <footer className="app-footer">
        <p>Made with ❤️ by Group I</p>
      </footer>
    </div>
  );
}

export default App;