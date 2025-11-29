import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '../../ui/Icons';

interface WeeklyCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  plannedMealsCount: Record<string, number>; // date string -> count
  projectedCalories: Record<string, number>; // date string -> calories
  targetCalories: number;
}

const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  selectedDate,
  onDateSelect,
  plannedMealsCount,
  projectedCalories,
  targetCalories,
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get start of week (Sunday)
  const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const [weekStart, setWeekStart] = React.useState(() => getWeekStart(selectedDate));

  const weekDays = React.useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      days.push(date);
    }
    return days;
  }, [weekStart]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeekStart = new Date(weekStart);
    newWeekStart.setDate(newWeekStart.getDate() + (direction === 'next' ? 7 : -7));
    setWeekStart(newWeekStart);
  };

  const goToToday = () => {
    setWeekStart(getWeekStart(today));
    onDateSelect(today);
  };

  const formatDateKey = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const isPastDate = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
  };

  const getStatusColor = (date: Date): string => {
    // Past dates are always grayed out
    if (isPastDate(date)) {
      return 'rgba(255, 255, 255, 0.05)'; // Very dim gray for past dates
    }

    const dateKey = formatDateKey(date);
    const calories = projectedCalories[dateKey] || 0;
    const meals = plannedMealsCount[dateKey] || 0;

    if (meals === 0) {
      return 'rgba(255, 255, 255, 0.1)'; // Gray - no meals
    }

    const percent = targetCalories > 0 ? calories / targetCalories : 0;
    if (percent >= 0.9 && percent <= 1.1) {
      return 'rgba(34, 197, 94, 0.3)'; // Green - meets goals
    } else if (percent >= 0.7 && percent < 1.3) {
      return 'rgba(234, 179, 8, 0.3)'; // Yellow - close
    } else {
      return 'rgba(239, 68, 68, 0.3)'; // Red - over/under
    }
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.03)',
      borderRadius: '8px',
      padding: '1rem',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      {/* Header with navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem'
      }}>
        <button
          onClick={() => navigateWeek('prev')}
          style={{
            padding: '0.5rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <ChevronLeftIcon size={20} />
        </button>

        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '1rem' }}>
            {monthNames[weekStart.getMonth()]} {weekStart.getFullYear()}
          </div>
          <button
            onClick={goToToday}
            style={{
              marginTop: '0.25rem',
              padding: '0.25rem 0.75rem',
              background: 'rgba(99, 102, 241, 0.2)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '4px',
              color: '#a5b4fc',
              fontSize: '0.75rem',
              cursor: 'pointer'
            }}
          >
            Today
          </button>
        </div>

        <button
          onClick={() => navigateWeek('next')}
          style={{
            padding: '0.5rem',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <ChevronRightIcon size={20} />
        </button>
      </div>

      {/* Calendar grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '0.5rem'
      }}>
        {weekDays.map((date, index) => {
          const dateKey = formatDateKey(date);
          const isSelected = formatDateKey(selectedDate) === dateKey;
          const isToday = formatDateKey(today) === dateKey;
          const isPast = isPastDate(date);
          const meals = plannedMealsCount[dateKey] || 0;
          const calories = projectedCalories[dateKey] || 0;

          return (
            <button
              key={index}
              onClick={() => {
                if (!isPast) {
                  onDateSelect(date);
                }
              }}
              disabled={isPast}
              style={{
                padding: '0.75rem 0.5rem',
                background: isSelected
                  ? 'rgba(99, 102, 241, 0.3)'
                  : getStatusColor(date),
                border: isSelected
                  ? '2px solid rgba(99, 102, 241, 0.8)'
                  : isToday
                  ? '2px solid rgba(99, 102, 241, 0.5)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                cursor: isPast ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.25rem',
                opacity: isPast ? 0.4 : 1,
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (!isSelected && !isPast) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected && !isPast) {
                  e.currentTarget.style.background = getStatusColor(date);
                }
              }}
            >
              <div style={{
                fontSize: '0.75rem',
                color: isPast ? 'rgba(156, 163, 175, 0.5)' : 'var(--muted, #9aa7bf)',
                fontWeight: 500
              }}>
                {dayNames[index]}
              </div>
              <div style={{
                fontSize: '1.125rem',
                fontWeight: isToday ? 700 : isSelected ? 600 : 500,
                color: isPast ? 'rgba(255, 255, 255, 0.4)' : '#fff'
              }}>
                {date.getDate()}
              </div>
              {isPast && (
                <div style={{
                  fontSize: '0.625rem',
                  color: 'rgba(156, 163, 175, 0.6)',
                  marginTop: '0.25rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                </div>
              )}
              {!isPast && meals > 0 && (
                <div style={{
                  fontSize: '0.6875rem',
                  color: 'var(--muted, #9aa7bf)',
                  marginTop: '0.25rem'
                }}>
                  {meals} meal{meals !== 1 ? 's' : ''}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{
        marginTop: '1rem',
        paddingTop: '1rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        gap: '1rem',
        justifyContent: 'center',
        fontSize: '0.75rem',
        color: 'var(--muted, #9aa7bf)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '3px',
            background: 'rgba(34, 197, 94, 0.3)'
          }} />
          <span>Meets goals</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '3px',
            background: 'rgba(234, 179, 8, 0.3)'
          }} />
          <span>Close</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '3px',
            background: 'rgba(239, 68, 68, 0.3)'
          }} />
          <span>Over/Under</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '3px',
            background: 'rgba(255, 255, 255, 0.1)'
          }} />
          <span>No meals</span>
        </div>
      </div>
    </div>
  );
};

export default WeeklyCalendar;

