/**
 * Date handling utilities
 * Reduces decision complexity by centralizing date logic
 * Single Responsibility: Date parsing and calculations only
 */

/**
 * Parses YYYY-MM-DD date string as local date (avoiding UTC timezone issues)
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Formats Date object as YYYY-MM-DD string
 */
export function formatDateAsString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gets today's date as YYYY-MM-DD string
 */
export function getTodayAsString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Gets the Sunday of the week containing the given date
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day); // day 0 = Sunday
  return d;
}

/**
 * Gets the Saturday of the week containing the given date
 */
export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
}

/**
 * Gets the first day of the month containing the given date
 */
export function getMonthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Gets the last day of the month containing the given date
 */
export function getMonthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/**
 * Gets the date one year ago
 */
export function getOneYearAgo(fromDate: Date): Date {
  const d = new Date(fromDate);
  d.setFullYear(d.getFullYear() - 1);
  return d;
}

/**
 * Calculates date range for a given time period
 * Returns { start, end } as Date objects
 */
export function calculateDateRange(
  range: 'week' | 'month' | 'year' | 'all',
  referenceDate: Date
): { start: Date; end: Date } {
  const today = new Date();

  switch (range) {
    case 'week':
      return {
        start: getWeekStart(referenceDate),
        end: getWeekEnd(referenceDate),
      };
    case 'month':
      return {
        start: getMonthStart(referenceDate),
        end: getMonthEnd(referenceDate),
      };
    case 'year':
      return {
        start: getOneYearAgo(today),
        end: today,
      };
    case 'all':
      return {
        start: new Date(1900, 0, 1), // Arbitrary far past
        end: today,
      };
  }
}

/**
 * Formats a date range for display
 */
export function formatDateRange(
  start: Date,
  end: Date,
  format: 'short' | 'long' = 'short'
): string {
  const startMonth = start.toLocaleString('default', { month: format === 'short' ? 'short' : 'long' });
  const endMonth = end.toLocaleString('default', { month: format === 'short' ? 'short' : 'long' });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = end.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}, ${year}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}

/**
 * Formats a month and year for display
 */
export function formatMonthYear(date: Date): string {
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

/**
 * Formats a date for short display (e.g., "Mon, Jan 15")
 */
export function formatDateShort(date: Date): string {
  return date.toLocaleString('default', { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * Extracts year from YYYY-MM-DD date string
 */
export function extractYear(dateStr: string): string {
  return dateStr.split('-')[0];
}

/**
 * Extracts month from YYYY-MM-DD date string (YYYY-MM format)
 */
export function extractMonth(dateStr: string): string {
  return dateStr.substring(0, 7);
}
