import React, { useEffect, useState } from 'react';
import type { WaterBottle, BottleIcon } from '../../types/water';
import { mlToOz, ozToMl, getBottleIconBySize } from '../../types/water';
import cupIcon from '../../assets/bottles/cup.png';
import drinkIcon from '../../assets/bottles/drink.png';
import bottleIcon from '../../assets/bottles/bottle.png';

// Load Firebase lazily
const resolveFirebase = async () => {
  const mod: any = await import('../../firebase');
  const authClient = await mod.getAuthClient();
  const dbClient = await mod.getFirestoreClient();
  const firestore = await import('firebase/firestore');
  return { authClient, dbClient, firestore };
};

interface WaterBottleManagerCardProps {
  bottles: WaterBottle[];
  unit: 'oz' | 'ml';
  user: any | null;
  loading: boolean;
  onBottlesUpdate: (bottles: WaterBottle[]) => void;
}

const WaterBottleManagerCard: React.FC<WaterBottleManagerCardProps> = ({
  bottles,
  unit,
  user,
  loading,
  onBottlesUpdate,
}) => {
  const [showBottleManager, setShowBottleManager] = useState(false);
  const [editingBottle, setEditingBottle] = useState<WaterBottle | null>(null);
  const [bottleName, setBottleName] = useState('');
  const [bottleAmount, setBottleAmount] = useState('');
  const [bottleUnit, setBottleUnit] = useState<'oz' | 'ml'>('oz');
  const [selectedIcon, setSelectedIcon] = useState<BottleIcon>('drink');
  const [localLoading, setLocalLoading] = useState(false);

  const iconMap: Record<BottleIcon, string> = {
    cup: cupIcon,
    drink: drinkIcon,
    bottle: bottleIcon,
  };

  // Auto-select icon based on size when amount changes
  useEffect(() => {
    if (bottleAmount) {
      const val = parseFloat(bottleAmount);
      if (val > 0) {
        const amountMl = bottleUnit === 'oz' ? ozToMl(val) : Math.round(val);
        const suggestedIcon = getBottleIconBySize(amountMl);
        setSelectedIcon(suggestedIcon);
      }
    }
  }, [bottleAmount, bottleUnit]);

  const isLoading = loading || localLoading;

  const handleSaveBottle = async () => {
    if (!user?.uid || !bottleName.trim() || !bottleAmount) return;
    const val = parseFloat(bottleAmount);
    if (!val || val <= 0) return;

    setLocalLoading(true);
    try {
      const { dbClient, firestore } = await resolveFirebase();
      const userDocRef = firestore.doc(dbClient, 'users', user.uid);
      const userDocSnap = await firestore.getDoc(userDocRef);
      
      const amountMl = bottleUnit === 'oz' ? ozToMl(val) : Math.round(val);
      const newBottle: WaterBottle = {
        id: editingBottle?.id || `bottle_${Date.now()}`,
        name: bottleName.trim(),
        amountMl,
        icon: selectedIcon,
        useCount: editingBottle?.useCount || 0,
        createdAt: editingBottle?.createdAt || Date.now(),
      };

      const currentBottles: WaterBottle[] = userDocSnap.exists() 
        ? (userDocSnap.data().water_bottles || [])
        : [];

      let updatedBottles: WaterBottle[];
      if (editingBottle) {
        updatedBottles = currentBottles.map(b => 
          b.id === editingBottle.id ? newBottle : b
        );
      } else {
        updatedBottles = [...currentBottles, newBottle];
      }

      await firestore.updateDoc(userDocRef, {
        water_bottles: updatedBottles,
        updated_at: new Date()
      });

      const sorted = updatedBottles.sort((a, b) => {
        const aCount = a.useCount || 0;
        const bCount = b.useCount || 0;
        if (bCount !== aCount) return bCount - aCount;
        return (a.name || '').localeCompare(b.name || '');
      });
      onBottlesUpdate(sorted);
      
      // Reset form
      setBottleName('');
      setBottleAmount('');
      setBottleUnit('oz');
      setSelectedIcon('drink');
      setEditingBottle(null);
      setShowBottleManager(false);
    } catch (e) {
      console.error('Failed to save bottle', e);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleDeleteBottle = async (bottleId: string) => {
    if (!user?.uid) return;
    if (!confirm('Are you sure you want to delete this bottle?')) return;

    setLocalLoading(true);
    try {
      const { dbClient, firestore } = await resolveFirebase();
      const userDocRef = firestore.doc(dbClient, 'users', user.uid);
      const userDocSnap = await firestore.getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const currentBottles: WaterBottle[] = userDocSnap.data().water_bottles || [];
        const updatedBottles = currentBottles.filter(b => b.id !== bottleId);
        
        await firestore.updateDoc(userDocRef, {
          water_bottles: updatedBottles,
          updated_at: new Date()
        });
        
        onBottlesUpdate(updatedBottles);
      }
    } catch (e) {
      console.error('Failed to delete bottle', e);
    } finally {
      setLocalLoading(false);
    }
  };

  const handleEditBottle = (bottle: WaterBottle) => {
    setEditingBottle(bottle);
    setBottleName(bottle.name);
    setBottleAmount(unit === 'oz' ? mlToOz(bottle.amountMl).toString() : bottle.amountMl.toString());
    setBottleUnit(unit);
    setSelectedIcon(bottle.icon || getBottleIconBySize(bottle.amountMl));
    setShowBottleManager(true);
  };

  const handleCancelBottleEdit = () => {
    setBottleName('');
    setBottleAmount('');
    setBottleUnit('oz');
    setSelectedIcon('drink');
    setEditingBottle(null);
    setShowBottleManager(false);
  };

  return (
    <div className="card">
      <div className="section-header-with-tooltip">
        <h2>{showBottleManager ? (editingBottle ? 'Edit Bottle' : 'Add Bottle') : 'Saved Bottles'}</h2>
        {!showBottleManager && (
          <button
            className="water-bottle-manage-btn"
            onClick={() => setShowBottleManager(true)}
            disabled={isLoading || !user}
          >
            {bottles.length > 0 ? 'Add More' : 'Add Bottle'}
          </button>
        )}
      </div>
      <div className="water-tracker">
        {showBottleManager ? (
          <div className="water-bottle-form">
            <div className="water-bottle-form-row">
              <input
                type="text"
                className="water-input"
                placeholder="Bottle name (e.g., Hydro Flask)"
                value={bottleName}
                onChange={(e) => setBottleName(e.target.value)}
                disabled={isLoading || !user}
              />
            </div>
            <div className="water-bottle-form-row">
              <div className="water-input-wrap">
                <input
                  type="number"
                  min={1}
                  step={1}
                  className="water-input"
                  placeholder={`Amount in ${bottleUnit}`}
                  value={bottleAmount}
                  onChange={(e) => setBottleAmount(e.target.value)}
                  disabled={isLoading || !user}
                />
                <select
                  className="water-unit"
                  value={bottleUnit}
                  onChange={(e) => setBottleUnit(e.target.value as 'oz' | 'ml')}
                  disabled={isLoading}
                >
                  <option value="oz">oz</option>
                  <option value="ml">ml</option>
                </select>
              </div>
            </div>
            <div className="water-bottle-form-row">
              <label className="water-bottle-icon-label">Select Icon</label>
              <div className="water-bottle-icon-selector">
                {(['cup', 'drink', 'bottle'] as BottleIcon[]).map((iconType) => {
                  const sizeLabel = iconType === 'cup' ? 'Small' : iconType === 'drink' ? 'Medium' : 'Large';
                  return (
                    <button
                      key={iconType}
                      type="button"
                      className={`water-bottle-icon-option ${selectedIcon === iconType ? 'selected' : ''}`}
                      onClick={() => setSelectedIcon(iconType)}
                      disabled={isLoading || !user}
                      title={sizeLabel}
                    >
                      <img 
                        src={iconMap[iconType]} 
                        alt={iconType}
                        className="water-bottle-icon-preview"
                      />
                      <span className="water-bottle-icon-label-text">{sizeLabel}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="water-bottle-form-actions">
              <button
                className="water-add"
                onClick={handleSaveBottle}
                disabled={isLoading || !bottleName.trim() || !bottleAmount || !user}
              >
                {editingBottle ? 'Update' : 'Save'} Bottle
              </button>
              <button
                className="water-btn"
                onClick={handleCancelBottleEdit}
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="water-bottles-list">
            {bottles.length === 0 ? (
              <div className="muted" style={{ textAlign: 'center', padding: '1rem' }}>
                No saved bottles. Add one to get started!
              </div>
            ) : (
              <div className="water-bottles-manage-list">
                {bottles.map((bottle) => {
                  const amountOz = mlToOz(bottle.amountMl);
                  const amountMl = bottle.amountMl;
                  return (
                    <div key={bottle.id} className="water-bottle-item">
                      <div className="water-bottle-item-info">
                        <div className="water-bottle-item-header">
                          {bottle.icon && (
                            <img 
                              src={iconMap[bottle.icon]} 
                              alt={bottle.icon}
                              className="water-bottle-item-icon"
                            />
                          )}
                          <div className="water-bottle-item-name">{bottle.name}</div>
                        </div>
                        <div className="water-bottle-item-amount">
                          {unit === 'oz' ? `${amountOz} oz` : `${amountMl} ml`}
                          {bottle.useCount && bottle.useCount > 0 && (
                            <span className="water-bottle-use-count"> • Used {bottle.useCount} time{bottle.useCount !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                      <div className="water-bottle-item-actions">
                        <button
                          className="water-bottle-edit-btn"
                          onClick={() => handleEditBottle(bottle)}
                          disabled={isLoading || !user}
                        >
                          Edit
                        </button>
                        <button
                          className="water-bottle-delete-btn"
                          onClick={() => handleDeleteBottle(bottle.id)}
                          disabled={isLoading || !user}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WaterBottleManagerCard;

