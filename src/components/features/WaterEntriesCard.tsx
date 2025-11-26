import React, { useMemo, useState } from 'react';
import type { WaterLog } from '../../types/water';
import { mlToOz, ozToMl } from '../../types/water';

// Load Firebase lazily
const resolveFirebase = async () => {
  const mod: any = await import('../../firebase');
  const authClient = await mod.getAuthClient();
  const dbClient = await mod.getFirestoreClient();
  const firestore = await import('firebase/firestore');
  return { authClient, dbClient, firestore };
};

interface WaterEntriesCardProps {
  logs: WaterLog[] | null;
  unit: 'oz' | 'ml';
  todayRange: { startMs: number; endMs: number };
  user: any | null;
  loading: boolean;
  onEntriesUpdate: () => void;
}

const WaterEntriesCard: React.FC<WaterEntriesCardProps> = ({
  logs,
  unit,
  todayRange,
  user,
  loading,
  onEntriesUpdate,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editUnit, setEditUnit] = useState<'oz' | 'ml'>('oz');
  const [localLoading, setLocalLoading] = useState(false);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  const toMillis = (val: any): number => {
    if (typeof val === 'number') return val;
    if (val && typeof val.seconds === 'number') return val.seconds * 1000 + Math.floor((val.nanoseconds || 0) / 1e6);
    if (val instanceof Date) return val.getTime();
    return 0;
  };

  const todayLogs = useMemo(() => {
    if (!logs) return [];
    return logs
      .filter((log) => {
        const ms = toMillis((log as any).createdAt);
        return ms >= todayRange.startMs && ms < todayRange.endMs;
      })
      .sort((a, b) => toMillis((a as any).createdAt) - toMillis((b as any).createdAt));
  }, [logs, todayRange.startMs, todayRange.endMs]);

  // Generate hour labels (6 AM to 11 PM)
  const hours = useMemo(() => {
    const h: number[] = [];
    for (let i = 6; i <= 23; i++) {
      h.push(i);
    }
    return h;
  }, []);

  const getHourPosition = (timestamp: any): number => {
    const ms = toMillis(timestamp);
    const date = new Date(ms);
    const hour = date.getHours();
    const minute = date.getMinutes();
    const totalMinutes = hour * 60 + minute;
    const startMinutes = 6 * 60; // 6 AM
    const endMinutes = 24 * 60; // Midnight
    const totalRange = endMinutes - startMinutes;
    const position = ((totalMinutes - startMinutes) / totalRange) * 100;
    // Clamp between 0 and 100
    return Math.max(0, Math.min(100, position));
  };

  // Group entries by hour and combine them
  const groupedEntries = useMemo(() => {
    const hourGroups: Map<number, { entries: WaterLog[]; totalMl: number }> = new Map();

    todayLogs.forEach((log) => {
      const ms = toMillis((log as any).createdAt);
      const date = new Date(ms);
      const hour = date.getHours();

      if (!hourGroups.has(hour)) {
        hourGroups.set(hour, { entries: [], totalMl: 0 });
      }

      const group = hourGroups.get(hour)!;
      group.entries.push(log);
      group.totalMl += log.amountMl;
    });

    // Convert to array and calculate positions
    return Array.from(hourGroups.entries()).map(([hour, group]) => {
      // Position at the middle of the hour
      const hourStartMinutes = hour * 60;
      const hourMiddleMinutes = hourStartMinutes + 30;
      const startMinutes = 6 * 60; // 6 AM
      const endMinutes = 24 * 60; // Midnight
      const totalRange = endMinutes - startMinutes;
      const position = ((hourMiddleMinutes - startMinutes) / totalRange) * 100;

      return {
        hour,
        position: Math.max(0, Math.min(100, position)),
        entries: group.entries,
        totalMl: group.totalMl,
      };
    });
  }, [todayLogs]);

  // Calculate max amount for scaling bars - use grouped totals
  const maxAmount = useMemo(() => {
    if (groupedEntries.length === 0) return 100;
    const maxGroupTotal = Math.max(...groupedEntries.map(group => group.totalMl));
    // Ensure minimum scale of 100ml, or use the max if it's larger
    return Math.max(maxGroupTotal, 100);
  }, [groupedEntries]);

  const getBarHeight = (amountMl: number): number => {
    // Scale to fit within 0-100% of container height
    // Add a small buffer (5%) so bars don't touch the top
    const maxHeight = 95;
    const height = (amountMl / maxAmount) * maxHeight;
    // Clamp between minimum visible height and max
    return Math.max(8, Math.min(maxHeight, height));
  };

  const formatTime = (timestamp: any) => {
    const ms = toMillis(timestamp);
    const date = new Date(ms);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatHour = (hour: number): string => {
    if (hour === 0) return '12 AM';
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return '12 PM';
    return `${hour - 12} PM`;
  };

  const handleEdit = (log: WaterLog) => {
    setEditingId(log.id || '');
    const amountOz = mlToOz(log.amountMl);
    setEditAmount(unit === 'oz' ? amountOz.toString() : log.amountMl.toString());
    setEditUnit(unit);
  };

  const handleSaveEdit = async () => {
    if (!user?.uid || !editingId || !editAmount) return;
    const val = parseFloat(editAmount);
    if (!val || val <= 0) {
      alert('Please enter a valid amount greater than 0');
      return;
    }

    setLocalLoading(true);
    try {
      const { dbClient, firestore } = await resolveFirebase();
      const logRef = firestore.doc(dbClient, 'water', editingId);
      const amountMl = editUnit === 'oz' ? ozToMl(val) : Math.round(val);
      
      await firestore.updateDoc(logRef, {
        amountMl,
        updated_at: new Date()
      });
      
      setEditingId(null);
      setEditAmount('');
      onEntriesUpdate();
    } catch (e) {
      console.error('Failed to update water log', e);
      alert('Failed to update entry. Please try again.');
    } finally {
      setLocalLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditAmount('');
  };

  const handleDelete = async (logId: string) => {
    if (!user?.uid || !logId) return;
    if (!confirm('Are you sure you want to delete this entry?')) return;

    setLocalLoading(true);
    try {
      const { dbClient, firestore } = await resolveFirebase();
      await firestore.deleteDoc(firestore.doc(dbClient, 'water', logId));
      onEntriesUpdate();
    } catch (e) {
      console.error('Failed to delete water log', e);
      alert('Failed to delete entry. Please try again.');
    } finally {
      setLocalLoading(false);
    }
  };

  const isLoading = loading || localLoading;

  return (
    <div className="card">
      <div className="section-header-with-tooltip">
        <h2>Today's Entries</h2>
      </div>
      <div className="water-tracker">
        {todayLogs.length === 0 ? (
          <div className="muted" style={{ textAlign: 'center', padding: '1rem' }}>
            No entries yet today. Start tracking your water intake!
          </div>
        ) : (
          <>
            <div className="water-timeline-container">
              <div className="water-timeline-chart">
                <div className="water-timeline-bars">
                  {groupedEntries.map((group) => {
                    const totalOz = mlToOz(group.totalMl);
                    const totalMl = group.totalMl;
                    const position = group.position;
                    const height = getBarHeight(totalMl);
                    const isHovered = group.entries.some(log => hoveredBar === log.id);
                    const isEditing = group.entries.some(log => editingId === log.id);
                    const entryCount = group.entries.length;
                    const hourLabel = formatHour(group.hour);
                    const isAtMax = totalMl >= maxAmount;

                    // Get time range for this hour group
                    const times = group.entries.map(log => formatTime((log as any).createdAt));
                    const timeRange = entryCount === 1 
                      ? times[0] 
                      : `${times[times.length - 1]} - ${times[0]}`;

                    return (
                      <div
                        key={group.hour}
                        className={`water-timeline-bar ${isHovered ? 'hovered' : ''} ${isEditing ? 'editing' : ''} ${isAtMax ? 'at-max' : ''}`}
                        style={{
                          left: `${position}%`,
                          height: `${height}%`,
                        }}
                        onMouseEnter={() => setHoveredBar(group.entries[0]?.id || null)}
                        onMouseLeave={() => setHoveredBar(null)}
                        onClick={() => {
                          // If multiple entries, show first one for editing, or allow selecting
                          if (group.entries.length > 0 && !isEditing) {
                            handleEdit(group.entries[0]);
                          }
                        }}
                      >
                        <div className="water-timeline-bar-content">
                          <div className="water-timeline-bar-amount">
                            {unit === 'oz' ? `${totalOz} oz` : `${totalMl} ml`}
                            {entryCount > 1 && (
                              <span className="water-timeline-bar-count"> ({entryCount} entries)</span>
                            )}
                            {isAtMax && (
                              <span className="water-timeline-bar-max-indicator"> (max)</span>
                            )}
                          </div>
                          <div className="water-timeline-bar-time">
                            {hourLabel} • {timeRange}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="water-timeline-axis">
                  {hours.map((hour) => (
                    <div key={hour} className="water-timeline-hour-marker">
                      <div className="water-timeline-hour-tick"></div>
                      <div className="water-timeline-hour-label">{formatHour(hour)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Edit Modal */}
            {editingId && (() => {
              const group = groupedEntries.find(g => g.entries.some(e => e.id === editingId));
              const editingGroup = group?.entries || [];
              
              return (
                <div className="water-entry-edit-modal">
                  <div className="water-entry-edit-form">
                    <h3>
                      {editingGroup.length > 1 
                        ? `Edit Hour (${editingGroup.length} entries)` 
                        : 'Edit Entry'}
                    </h3>
                    {editingGroup.length > 1 && (
                      <div className="water-entry-group-info">
                        <p>This hour has {editingGroup.length} entries. Editing will modify the first entry.</p>
                        <div className="water-entry-group-list">
                          {editingGroup.map((log) => {
                            const amountOz = mlToOz(log.amountMl);
                            const amountMl = log.amountMl;
                            return (
                              <div key={log.id} className="water-entry-group-item">
                                <span>{formatTime((log as any).createdAt)}</span>
                                <span>{unit === 'oz' ? `${amountOz} oz` : `${amountMl} ml`}</span>
                                <button
                                  className="water-bottle-delete-btn"
                                  onClick={() => handleDelete(log.id!)}
                                  disabled={isLoading}
                                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                >
                                  Delete
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="water-entry-edit-inputs">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        className="water-input"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        disabled={isLoading}
                        autoFocus
                      />
                      <select
                        className="water-unit"
                        value={editUnit}
                        onChange={(e) => setEditUnit(e.target.value as 'oz' | 'ml')}
                        disabled={isLoading}
                      >
                        <option value="oz">oz</option>
                        <option value="ml">ml</option>
                      </select>
                    </div>
                    <div className="water-entry-edit-actions">
                      <button
                        className="water-add"
                        onClick={handleSaveEdit}
                        disabled={isLoading || !editAmount}
                      >
                        Save
                      </button>
                      <button
                        className="water-btn"
                        onClick={handleCancelEdit}
                        disabled={isLoading}
                      >
                        Cancel
                      </button>
                      {editingGroup.length === 1 && (
                        <button
                          className="water-bottle-delete-btn"
                          onClick={() => handleDelete(editingId)}
                          disabled={isLoading}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
};

export default WaterEntriesCard;

