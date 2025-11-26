import React from 'react';

interface WaterAddCardProps {
  inputAmount: string;
  unit: 'oz' | 'ml';
  user: any | null;
  loading: boolean;
  onInputAmountChange: (value: string) => void;
  onUnitChange: (unit: 'oz' | 'ml') => void;
  onQuickAdd: (oz: number) => void;
  onCustomAdd: () => void;
}

const WaterAddCard: React.FC<WaterAddCardProps> = ({
  inputAmount,
  unit,
  user,
  loading,
  onInputAmountChange,
  onUnitChange,
  onQuickAdd,
  onCustomAdd,
}) => {
  return (
    <div className="card">
      <div className="section-header-with-tooltip">
        <h2>Add Water</h2>
      </div>
      <div className="water-tracker">
        {/* Quick Add Buttons */}
        <div className="water-add-section">
          <label className="water-add-section-label">Quick Add</label>
          <div className="water-quick-buttons">
            <button 
              className="water-btn" 
              onClick={() => onQuickAdd(8)} 
              disabled={loading || !user}
            >
              +8 oz
            </button>
            <button 
              className="water-btn" 
              onClick={() => onQuickAdd(12)} 
              disabled={loading || !user}
            >
              +12 oz
            </button>
            <button 
              className="water-btn" 
              onClick={() => onQuickAdd(16)} 
              disabled={loading || !user}
            >
              +16 oz
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="water-add-divider">
          <span>or</span>
        </div>

        {/* Custom Amount Input */}
        <div className="water-add-section">
          <label className="water-add-section-label">Custom Amount</label>
          <div className="water-custom-input-container">
            <div className="water-custom-input-wrapper">
              <input
                type="number"
                min={1}
                step={1}
                className="water-custom-input"
                placeholder={`Enter amount`}
                value={inputAmount}
                onChange={(e) => onInputAmountChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onCustomAdd();
                  }
                }}
                disabled={loading || !user}
              />
              <select
                className="water-custom-unit"
                value={unit}
                onChange={(e) => onUnitChange(e.target.value as 'oz' | 'ml')}
                disabled={loading}
              >
                <option value="oz">oz</option>
                <option value="ml">ml</option>
              </select>
            </div>
            <button 
              className="water-add-btn-primary" 
              onClick={onCustomAdd} 
              disabled={loading || !inputAmount || !user}
            >
              Add
            </button>
          </div>
        </div>

        {!user && (
          <div className="water-auth-message">
            Sign in to track water intake
          </div>
        )}
      </div>
    </div>
  );
};

export default WaterAddCard;

