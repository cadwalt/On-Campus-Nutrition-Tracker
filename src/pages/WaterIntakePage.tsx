import React, { useEffect, useMemo, useState } from 'react';
// Load Firebase lazily to avoid bundling SDK into initial chunk
const resolveFirebase = async () => {
  const mod: any = await import('../firebase');
  const authClient = await mod.getAuthClient();
  const dbClient = await mod.getFirestoreClient();
  const firestore = await import('firebase/firestore');
  return { authClient, dbClient, firestore };
};
import type { WaterLog, WaterBottle, BottleIcon } from '../types/water';
import { mlToOz, ozToMl, getBottleIconBySize } from '../types/water';
import cupIcon from '../assets/bottles/cup.png';
import drinkIcon from '../assets/bottles/drink.png';
import bottleIcon from '../assets/bottles/bottle.png';

const WaterIntakePage: React.FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [logs, setLogs] = useState<WaterLog[] | null>(null);
  const [bottles, setBottles] = useState<WaterBottle[]>([]);
  const [inputAmount, setInputAmount] = useState<string>('');
  const [unit, setUnit] = useState<'oz' | 'ml'>('oz');
  const [loading, setLoading] = useState(false);
  const [showBottleManager, setShowBottleManager] = useState(false);
  const [editingBottle, setEditingBottle] = useState<WaterBottle | null>(null);
  const [bottleName, setBottleName] = useState('');
  const [bottleAmount, setBottleAmount] = useState('');
  const [bottleUnit, setBottleUnit] = useState<'oz' | 'ml'>('oz');
  const [selectedIcon, setSelectedIcon] = useState<BottleIcon>('drink');
  const [dailyGoalMl, setDailyGoalMl] = useState<number>(1892.7); // Default: 64 oz in ml
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState<string>('');
  const [goalInputUnit, setGoalInputUnit] = useState<'oz' | 'ml'>('oz');

  // Icon mapping
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

  // Load user and water logs
  useEffect(() => {
    (async () => {
      const { authClient, dbClient, firestore } = await resolveFirebase();
      const u = authClient.currentUser;
      setUser(u || null);
      if (!u) {
        setLogs([]);
        setBottles([]);
        return;
      }
      const q = firestore.query(firestore.collection(dbClient, 'water'), firestore.where('userId', '==', u.uid));
      const unsub = firestore.onSnapshot(q, (snap: any) => {
        const arr: WaterLog[] = [];
        snap.forEach((doc: any) => {
          const d = doc.data() as any;
          arr.push({ id: doc.id, ...(d as WaterLog) });
        });
        setLogs(arr);
      }, (err: any) => {
        console.error('Failed to load water logs', err);
        setLogs([]);
      });
      return () => unsub();
    })();
  }, []);

  // Load saved bottles and daily goal from user document
  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      try {
        const { dbClient, firestore } = await resolveFirebase();
        const userDocRef = firestore.doc(dbClient, 'users', user.uid);
        const userDocSnap = await firestore.getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          const savedBottles = data.water_bottles || [];
          // Sort by useCount descending, then by name
          const sorted = [...savedBottles].sort((a, b) => {
            const aCount = a.useCount || 0;
            const bCount = b.useCount || 0;
            if (bCount !== aCount) return bCount - aCount;
            return (a.name || '').localeCompare(b.name || '');
          });
          setBottles(sorted);
          
          // Load daily water goal (default to 64 oz / 1892.7 ml)
          const goal = data.water_goal_ml || 1892.7;
          setDailyGoalMl(goal);
        }
      } catch (err) {
        console.error('Failed to load saved bottles', err);
      }
    })();
  }, [user?.uid]);

  const todayRange = useMemo(() => {
    const start = new Date(); start.setHours(0,0,0,0);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { startMs: start.getTime(), endMs: end.getTime() };
  }, []);

  const toMillis = (val: any): number => {
    if (typeof val === 'number') return val;
    if (val && typeof val.seconds === 'number') return val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1e6);
    if (val instanceof Date) return val.getTime();
    return 0;
  };

  const totalMlToday = useMemo(() => {
    if (!logs) return 0;
    return logs.reduce((sum, l) => {
      const ms = toMillis((l as any).createdAt);
      if (ms >= todayRange.startMs && ms < todayRange.endMs) {
        return sum + (l.amountMl || 0);
      }
      return sum;
    }, 0);
  }, [logs, todayRange.startMs, todayRange.endMs]);

  const addWater = async (amountMl: number, source: 'quick' | 'custom' | 'bottle', bottleId?: string) => {
    if (!user) return;
    if (amountMl <= 0 || !Number.isFinite(amountMl)) return;
    setLoading(true);
    try {
      const log: Omit<WaterLog, 'id'> = {
        userId: user.uid,
        amountMl: Math.round(amountMl),
        createdAt: Date.now(),
        source,
        bottleId,
      };
      const { dbClient, firestore } = await resolveFirebase();
      await firestore.addDoc(firestore.collection(dbClient, 'water'), log);
      setInputAmount('');

      // Update bottle use count if using a saved bottle
      if (bottleId && source === 'bottle') {
        await updateBottleUseCount(bottleId);
      }
    } catch (e) {
      console.error('Failed to add water log', e);
    } finally {
      setLoading(false);
    }
  };

  const updateBottleUseCount = async (bottleId: string) => {
    if (!user?.uid) return;
    try {
      const { dbClient, firestore } = await resolveFirebase();
      const userDocRef = firestore.doc(dbClient, 'users', user.uid);
      const userDocSnap = await firestore.getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        const savedBottles: WaterBottle[] = data.water_bottles || [];
        const updatedBottles = savedBottles.map(bottle => 
          bottle.id === bottleId 
            ? { ...bottle, useCount: (bottle.useCount || 0) + 1 }
            : bottle
        );
        await firestore.updateDoc(userDocRef, {
          water_bottles: updatedBottles,
          updated_at: new Date()
        });
        // Update local state
        setBottles(updatedBottles.sort((a, b) => {
          const aCount = a.useCount || 0;
          const bCount = b.useCount || 0;
          if (bCount !== aCount) return bCount - aCount;
          return (a.name || '').localeCompare(b.name || '');
        }));
      }
    } catch (e) {
      console.error('Failed to update bottle use count', e);
    }
  };

  const handleQuickAdd = (oz: number) => addWater(ozToMl(oz), 'quick');

  const handleBottleAdd = (bottle: WaterBottle) => {
    void addWater(bottle.amountMl, 'bottle', bottle.id);
  };

  const handleCustomAdd = () => {
    const val = parseFloat(inputAmount);
    if (!val || val <= 0) return;
    const ml = unit === 'oz' ? ozToMl(val) : Math.round(val);
    void addWater(ml, 'custom');
  };

  const handleSaveBottle = async () => {
    if (!user?.uid || !bottleName.trim() || !bottleAmount) return;
    const val = parseFloat(bottleAmount);
    if (!val || val <= 0) return;

    setLoading(true);
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
        // Update existing bottle
        updatedBottles = currentBottles.map(b => 
          b.id === editingBottle.id ? newBottle : b
        );
      } else {
        // Add new bottle
        updatedBottles = [...currentBottles, newBottle];
      }

      await firestore.updateDoc(userDocRef, {
        water_bottles: updatedBottles,
        updated_at: new Date()
      });

      // Sort and update local state
      const sorted = updatedBottles.sort((a, b) => {
        const aCount = a.useCount || 0;
        const bCount = b.useCount || 0;
        if (bCount !== aCount) return bCount - aCount;
        return (a.name || '').localeCompare(b.name || '');
      });
      setBottles(sorted);
      
      // Reset form
      setBottleName('');
      setBottleAmount('');
      setBottleUnit('oz');
      setEditingBottle(null);
      setShowBottleManager(false);
    } catch (e) {
      console.error('Failed to save bottle', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBottle = async (bottleId: string) => {
    if (!user?.uid) return;
    if (!confirm('Are you sure you want to delete this bottle?')) return;

    setLoading(true);
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
        
        setBottles(updatedBottles);
      }
    } catch (e) {
      console.error('Failed to delete bottle', e);
    } finally {
      setLoading(false);
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

  const totalOzToday = mlToOz(totalMlToday);
  const totalMlDisplay = totalMlToday;
  
  // Calculate progress
  const progressPercentage = useMemo(() => {
    if (dailyGoalMl <= 0) return 0;
    return Math.min((totalMlToday / dailyGoalMl) * 100, 100);
  }, [totalMlToday, dailyGoalMl]);
  
  const remainingMl = Math.max(0, dailyGoalMl - totalMlToday);
  const remainingOz = mlToOz(remainingMl);
  const goalOz = mlToOz(dailyGoalMl);
  const goalMl = dailyGoalMl;

  const handleStartEditGoal = () => {
    setIsEditingGoal(true);
    setGoalInput(unit === 'oz' ? goalOz.toString() : goalMl.toString());
    setGoalInputUnit(unit);
  };

  const handleSaveGoal = async () => {
    if (!user?.uid) return;
    const val = parseFloat(goalInput);
    if (!val || val <= 0) return;

    setLoading(true);
    try {
      const newGoalMl = goalInputUnit === 'oz' ? ozToMl(val) : Math.round(val);
      const { dbClient, firestore } = await resolveFirebase();
      const userDocRef = firestore.doc(dbClient, 'users', user.uid);
      await firestore.updateDoc(userDocRef, {
        water_goal_ml: newGoalMl,
        updated_at: new Date()
      });
      setDailyGoalMl(newGoalMl);
      setIsEditingGoal(false);
      setGoalInput('');
    } catch (e) {
      console.error('Failed to save water goal', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEditGoal = () => {
    setIsEditingGoal(false);
    setGoalInput('');
  };

  return (
    <div className="page water-intake-page">
      <div className="page-header">
        <div className="page-header-title">
          <div>
            <h1>Water Intake</h1>
            <p>Track your daily water consumption and stay hydrated</p>
          </div>
        </div>
        <div className="page-header-actions">
          <button
            className="water-unit-toggle-btn-header"
            onClick={() => setUnit(unit === 'oz' ? 'ml' : 'oz')}
            disabled={loading}
          >
            Switch to {unit === 'oz' ? 'ml' : 'oz'}
          </button>
        </div>
      </div>

      <main className="dashboard-content">
        <div className="water-intake-grid">
          {/* Left Column */}
          <div className="water-intake-column">
            <div className="card">
              <div className="section-header-with-tooltip">
                <h2>Today's Intake</h2>
              </div>
              <div className="water-tracker">
                {isEditingGoal ? (
                  <div className="water-goal-edit-container">
                    <div className="water-goal-edit-header">
                      <h3>Edit Daily Goal</h3>
                    </div>
                    <div className="water-goal-edit">
                      <div className="water-goal-edit-input-wrap">
                        <input
                          type="number"
                          min={1}
                          step={1}
                          className="water-goal-input"
                          value={goalInput}
                          onChange={(e) => setGoalInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSaveGoal();
                            }
                            if (e.key === 'Escape') {
                              handleCancelEditGoal();
                            }
                          }}
                          disabled={loading || !user}
                          autoFocus
                        />
                        <select
                          className="water-goal-unit"
                          value={goalInputUnit}
                          onChange={(e) => setGoalInputUnit(e.target.value as 'oz' | 'ml')}
                          disabled={loading}
                        >
                          <option value="oz">oz</option>
                          <option value="ml">ml</option>
                        </select>
                      </div>
                      <div className="water-goal-edit-actions">
                        <button
                          className="water-goal-save-btn"
                          onClick={handleSaveGoal}
                          disabled={loading || !goalInput || !user}
                        >
                          Save
                        </button>
                        <button
                          className="water-goal-cancel-btn"
                          onClick={handleCancelEditGoal}
                          disabled={loading}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="water-summary">
                    <div className="water-amount">
                      {unit === 'oz' ? `${totalOzToday} oz` : `${totalMlDisplay} ml`}
                    </div>
                    <div className="water-label">
                      <div className="water-goal-display">
                        of {unit === 'oz' ? `${goalOz} oz` : `${goalMl} ml`} goal
                        {user && (
                          <button
                            className="water-goal-edit-icon"
                            onClick={handleStartEditGoal}
                            disabled={loading}
                            title="Edit daily goal"
                          >
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Progress Bar - Only show when not editing goal */}
                {!isEditingGoal && (
                  <div className="water-progress-container">
                    <div className="water-progress-bar">
                      <div 
                        className="water-progress-fill"
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                    <div className="water-progress-info">
                      <span className="water-progress-percentage">
                        {Math.round(progressPercentage)}%
                      </span>
                      {remainingMl > 0 && (
                        <span className="water-progress-remaining">
                          {unit === 'oz' ? `${remainingOz} oz` : `${remainingMl} ml`} remaining
                        </span>
                      )}
                      {remainingMl <= 0 && (
                        <span className="water-progress-complete">
                          Goal achieved! 🎉
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

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
                      onClick={() => handleQuickAdd(8)} 
                      disabled={loading || !user}
                    >
                      +8 oz
                    </button>
                    <button 
                      className="water-btn" 
                      onClick={() => handleQuickAdd(12)} 
                      disabled={loading || !user}
                    >
                      +12 oz
                    </button>
                    <button 
                      className="water-btn" 
                      onClick={() => handleQuickAdd(16)} 
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
                        onChange={(e) => setInputAmount(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCustomAdd();
                          }
                        }}
                        disabled={loading || !user}
                      />
                      <select
                        className="water-custom-unit"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value as 'oz' | 'ml')}
                        disabled={loading}
                      >
                        <option value="oz">oz</option>
                        <option value="ml">ml</option>
                      </select>
                    </div>
                    <button 
                      className="water-add-btn-primary" 
                      onClick={handleCustomAdd} 
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
          </div>

          {/* Right Column */}
          <div className="water-intake-column">
            {/* Saved Bottles */}
            {bottles.length > 0 && (
              <div className="card">
                <div className="section-header-with-tooltip">
                  <h2>My Bottles</h2>
                  <button
                    className="water-bottle-manage-btn"
                    onClick={() => setShowBottleManager(true)}
                    disabled={loading || !user}
                  >
                    Manage
                  </button>
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
                          onClick={() => handleBottleAdd(bottle)}
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
            )}

            {/* Bottle Manager */}
            <div className="card">
              <div className="section-header-with-tooltip">
                <h2>{showBottleManager ? (editingBottle ? 'Edit Bottle' : 'Add Bottle') : 'Saved Bottles'}</h2>
                {!showBottleManager && (
                  <button
                    className="water-bottle-manage-btn"
                    onClick={() => setShowBottleManager(true)}
                    disabled={loading || !user}
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
                        disabled={loading || !user}
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
                          disabled={loading || !user}
                        />
                        <select
                          className="water-unit"
                          value={bottleUnit}
                          onChange={(e) => setBottleUnit(e.target.value as 'oz' | 'ml')}
                          disabled={loading}
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
                              disabled={loading || !user}
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
                        disabled={loading || !bottleName.trim() || !bottleAmount || !user}
                      >
                        {editingBottle ? 'Update' : 'Save'} Bottle
                      </button>
                      <button
                        className="water-btn"
                        onClick={handleCancelBottleEdit}
                        disabled={loading}
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
                                  disabled={loading || !user}
                                >
                                  Edit
                                </button>
                                <button
                                  className="water-bottle-delete-btn"
                                  onClick={() => handleDeleteBottle(bottle.id)}
                                  disabled={loading || !user}
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
          </div>
        </div>
      </main>
    </div>
  );
};

export default WaterIntakePage;

