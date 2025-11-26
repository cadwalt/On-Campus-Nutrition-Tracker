import React from 'react';
import type { WaterBottle, BottleIcon } from '../../types/water';
import { mlToOz, getBottleIconBySize } from '../../types/water';
import cupIcon from '../../assets/bottles/cup.png';
import drinkIcon from '../../assets/bottles/drink.png';
import bottleIcon from '../../assets/bottles/bottle.png';

interface WaterMyBottlesCardProps {
  bottles: WaterBottle[];
  unit: 'oz' | 'ml';
  user: any | null;
  loading: boolean;
  onBottleAdd: (bottle: WaterBottle) => void;
}

const WaterMyBottlesCard: React.FC<WaterMyBottlesCardProps> = ({
  bottles,
  unit,
  user,
  loading,
  onBottleAdd,
}) => {
  const iconMap: Record<BottleIcon, string> = {
    cup: cupIcon,
    drink: drinkIcon,
    bottle: bottleIcon,
  };

  if (bottles.length === 0) {
    return null;
  }

  return (
    <div className="card">
      <div className="section-header-with-tooltip">
        <h2>My Bottles</h2>
      </div>
      <div className="water-tracker">
        <div className="water-bottles-grid">
          {bottles.map((bottle) => {
            const amountOz = mlToOz(bottle.amountMl);
            const amountMl = bottle.amountMl;
            const bottleIcon = bottle.icon || getBottleIconBySize(bottle.amountMl);
            return (
              <button
                key={bottle.id}
                className="water-bottle-btn"
                onClick={() => onBottleAdd(bottle)}
                disabled={loading || !user}
                title={bottle.name}
              >
                <img 
                  src={iconMap[bottleIcon]} 
                  alt={bottleIcon}
                  className="water-bottle-icon"
                />
                <div className="water-bottle-name">{bottle.name}</div>
                <div className="water-bottle-amount">
                  {unit === 'oz' ? `${amountOz} oz` : `${amountMl} ml`}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WaterMyBottlesCard;

