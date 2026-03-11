/**
 * Timestamp utilities to handle timezone issues.
 * 
 * ISSUE: Backend is sending naive timestamps (no timezone info) in Montreal time,
 * but client is interpreting them as UTC, creating a ~4-hour offset.
 * 
 * Example:
 * - Server stores: 2026-03-11T20:10:07 (Montreal time, UTC-4)
 * - Server sends: "2026-03-11T20:10:07.361000" (no Z)
 * - Client parses as UTC: 2026-03-11T20:10:07Z
 * - Result: appears 4 hours in the future
 * 
 * WORKAROUND: Assume naive timestamps are in Montreal time (UTC-4/-5)
 * and convert them to UTC for consistent client-side handling.
 */

const MONTREAL_TIMEZONE_OFFSET_MS = -4 * 60 * 60 * 1000; // UTC-4 (during daylight saving)
const MONTREAL_TIMEZONE_OFFSET_WINTER_MS = -5 * 60 * 60 * 1000; // UTC-5 (during standard time)

/**
 * Detect if a timestamp string is naive (no timezone info)
 */
function isNaiveTimestamp(dateStr) {
  if (!dateStr) return false;
  // Check if it ends with Z or has timezone offset like +00:00 or -04:00
  const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(dateStr);
  return !hasTimezone;
}

/**
 * Detect if we're in daylight saving time (rough check for Montreal)
 * DST in North America: second Sunday in March to first Sunday in November
 */
function isMontrealDaylightTime(date) {
  const month = date.getMonth();
  // Clearly in DST: April-October
  if (month >= 3 && month <= 9) return true;
  // Clearly not in DST: November-February
  if (month === 0 || month === 1 || month === 11) return false;
  // March: DST starts second Sunday
  if (month === 2) {
    const secondSundayDate = getSecondSunday(date.getFullYear(), 2);
    return date.getDate() >= secondSundayDate;
  }
  // October: DST ends first Sunday
  if (month === 9) {
    const firstSundayDate = getFirstSunday(date.getFullYear(), 9);
    return date.getDate() < firstSundayDate;
  }
  return false;
}

function getFirstSunday(year, month) {
  const d = new Date(year, month, 1);
  const dayOfWeek = d.getDay();
  return dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
}

function getSecondSunday(year, month) {
  return getFirstSunday(year, month) + 7;
}

/**
 * Parse a timestamp, handling naive timestamps from Montreal timezone.
 * Returns a Date object interpreted as UTC for consistent handling.
 */
export function parseTimestamp(dateStr) {
  if (!dateStr) return null;

  // If it's a naive timestamp (no timezone), assume it's Montreal time
  if (isNaiveTimestamp(dateStr)) {
    const naiveDate = new Date(dateStr + 'Z'); // Parse as UTC first to get the values
    const isDST = isMontrealDaylightTime(naiveDate);
    const offsetMs = isDST ? MONTREAL_TIMEZONE_OFFSET_MS : MONTREAL_TIMEZONE_OFFSET_WINTER_MS;
    
    // Convert from Montreal local to UTC
    // If server sent 20:10 Montreal time, that's 00:10 UTC the next day
    return new Date(naiveDate.getTime() - offsetMs);
  }

  // If it has timezone info, parse normally
  return new Date(dateStr);
}

/**
 * Calculate age of a timestamp in milliseconds.
 * Handles timezone issues properly.
 */
export function getTimestampAge(dateStr, nowMs = Date.now()) {
  const parsed = parseTimestamp(dateStr);
  if (!parsed || isNaN(parsed.getTime())) {
    return null;
  }
  return nowMs - parsed.getTime();
}

/**
 * Check if timestamp is valid and not in the future
 */
export function isValidAndNotFuture(dateStr, nowMs = Date.now()) {
  const age = getTimestampAge(dateStr, nowMs);
  return age !== null && age >= 0;
}

export function isNaiveTimestampString(dateStr) {
  return isNaiveTimestamp(dateStr);
}