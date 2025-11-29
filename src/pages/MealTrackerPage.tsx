import React, { useState, useMemo } from 'react';
import MealForm from '../components/features/MealForm';
import YourMealsList from '../components/features/YourMealsList';
import TodaySummaryCard from '../components/features/TodaySummaryCard';
import { SearchIcon } from '../components/ui/Icons';

type DateFilterType = 'all' | 'today' | 'thisWeek' | 'thisMonth' | 'custom';
type SortByType = 'date' | 'calories' | 'name';
type SortOrderType = 'asc' | 'desc';

const MealTrackerPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortBy, setSortBy] = useState<SortByType>('date');
  const [sortOrder, setSortOrder] = useState<SortOrderType>('desc');

  // Calculate date range based on filter type
  const dateRange = useMemo(() => {
    const now = new Date();
    const start = new Date();
    let end = new Date();

    switch (dateFilter) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { startMs: start.getTime(), endMs: end.getTime() };
      
      case 'thisWeek':
        const dayOfWeek = now.getDay();
        // Get Monday of current week (Monday = 1, Sunday = 0)
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days; otherwise go to Monday
        start.setDate(now.getDate() + diff);
        start.setHours(0, 0, 0, 0);
        // Set end to Sunday of same week (6 days after Monday)
        end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return { startMs: start.getTime(), endMs: end.getTime() };
      
      case 'thisMonth':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0); // Last day of current month
        end.setHours(23, 59, 59, 999);
        return { startMs: start.getTime(), endMs: end.getTime() };
      
      case 'custom':
        if (customStartDate && customEndDate) {
          const customStart = new Date(customStartDate);
          const customEnd = new Date(customEndDate);
          customStart.setHours(0, 0, 0, 0);
          customEnd.setHours(23, 59, 59, 999);
          return { startMs: customStart.getTime(), endMs: customEnd.getTime() };
        }
        return null;
      
      default:
        return null; // 'all' - no date filtering
    }
  }, [dateFilter, customStartDate, customEndDate]);

  return (
    <div className="page meal-tracker-page">
      <main className="dashboard-content">
        <div className="dashboard-grid">
          <div className="dashboard-left">
            <TodaySummaryCard />
            
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <h2>Add a Meal</h2>
              <p style={{ color: 'var(--muted, #9aa7bf)', marginTop: 6 }}>
                Provide nutrition facts for a meal you ate. Required fields are marked with an asterisk (*).
              </p>
              <div style={{ marginTop: 16 }}>
                <MealForm onMealAdded={() => { /* no-op; list auto updates via snapshot */ }} />
              </div>
            </div>
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ margin: 0 }}>Your Meals</h2>
                  <p style={{ color: 'var(--muted, #9aa7bf)', marginTop: 6, marginBottom: 0 }}>
                    Previously saved meals with basic macro details.
                  </p>
                </div>
              </div>

              {/* Search and Filter Controls */}
              <div style={{ 
                marginBottom: '1rem', 
                padding: '1rem', 
                background: 'rgba(255, 255, 255, 0.03)', 
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem'
              }}>
                {/* Search Input */}
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Search meals by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      paddingLeft: '2.5rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '0.875rem',
                      outline: 'none',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                  />
                  <SearchIcon
                    size={18}
                    style={{
                      position: 'absolute',
                      left: '0.75rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--muted, #9aa7bf)',
                      pointerEvents: 'none'
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--muted, #9aa7bf)',
                        cursor: 'pointer',
                        fontSize: '1.2rem',
                        padding: '0.25rem',
                        lineHeight: 1
                      }}
                      title="Clear search"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Date Filter */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--muted, #9aa7bf)' }}>
                    Filter by Date
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {(['all', 'today', 'thisWeek', 'thisMonth', 'custom'] as DateFilterType[]).map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => {
                          setDateFilter(filter);
                          if (filter !== 'custom') {
                            setCustomStartDate('');
                            setCustomEndDate('');
                          }
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          background: dateFilter === filter 
                            ? 'rgba(99, 102, 241, 0.3)' 
                            : 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${dateFilter === filter ? 'rgba(99, 102, 241, 0.5)' : 'rgba(255, 255, 255, 0.1)'}`,
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          textTransform: 'capitalize',
                          whiteSpace: 'nowrap'
                        }}
                        onMouseEnter={(e) => {
                          if (dateFilter !== filter) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (dateFilter !== filter) {
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                          }
                        }}
                      >
                        {filter === 'all' ? 'All Time' : 
                         filter === 'today' ? 'Today' :
                         filter === 'thisWeek' ? 'This Week' :
                         filter === 'thisMonth' ? 'This Month' :
                         'Custom'}
                      </button>
                    ))}
                  </div>

                  {/* Custom Date Range Inputs */}
                  {dateFilter === 'custom' && (
                    <div style={{ 
                      display: 'flex', 
                      gap: '0.75rem', 
                      flexWrap: 'wrap',
                      padding: '0.75rem',
                      background: 'rgba(99, 102, 241, 0.1)',
                      borderRadius: '6px'
                    }}>
                      <div style={{ flex: 1, minWidth: '150px' }}>
                        <label style={{ 
                          display: 'block', 
                          fontSize: '0.75rem', 
                          marginBottom: '0.25rem',
                          color: 'var(--muted, #9aa7bf)'
                        }}>
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '0.875rem',
                            outline: 'none'
                          }}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: '150px' }}>
                        <label style={{ 
                          display: 'block', 
                          fontSize: '0.75rem', 
                          marginBottom: '0.25rem',
                          color: 'var(--muted, #9aa7bf)'
                        }}>
                          End Date
                        </label>
                        <input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          min={customStartDate}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '6px',
                            color: '#fff',
                            fontSize: '0.875rem',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Sort Options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--muted, #9aa7bf)' }}>
                    Sort by
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortByType)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        outline: 'none',
                        minWidth: '120px'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'rgba(99, 102, 241, 0.5)'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                    >
                      <option value="date">Date</option>
                      <option value="calories">Calories</option>
                      <option value="name">Name</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      style={{
                        padding: '0.5rem 1rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '0.875rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                      }}
                      title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                    >
                      <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      <span>{sortOrder === 'asc' ? 'Ascending' : 'Descending'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <YourMealsList 
                  searchQuery={searchQuery}
                  dateRange={dateRange}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MealTrackerPage;
