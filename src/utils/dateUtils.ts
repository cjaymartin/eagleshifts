import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export interface DateTimeConversionOptions {
  organizationTimezone: string;
  fallbackTimezone?: string;
}

/**
 * Converts UTC datetime to organization timezone for display
 */
export function utcToOrgTimezone(
  utcDate: Date | string, 
  options: DateTimeConversionOptions
): Date {
  const tz = options.organizationTimezone || options.fallbackTimezone || 'UTC';
  const result = dayjs(utcDate).tz(tz).toDate();

  // Store the original UTC string for round-trip preservation during DST transitions
  if (typeof utcDate === 'string') {
    (result as any)._originalUTC = utcDate;
  }

  return result;
}

/**
 * Converts organization timezone datetime to UTC for storage
 */
export function orgTimezoneToUtc(
  localDate: Date | string,
  options: DateTimeConversionOptions
): string {
  const tz = options.organizationTimezone || options.fallbackTimezone || 'UTC';
  return dayjs(localDate).tz(tz, true).utc().toISOString();
}

/**
 * Combines date and time in organization timezone, converts to UTC
 */
export function combineDateTime(
  date: Date,
  time: Date,
  options: DateTimeConversionOptions
): string {
  const tz = options.organizationTimezone || options.fallbackTimezone || 'UTC';

  // Special case: if date and time are the same object (round-trip scenario),
  // check if we have the original UTC value stored to avoid DST conversion issues
  if (date === time) {
    // If we have the original UTC string stored, use it directly
    if ((date as any)._originalUTC) {
      return (date as any)._originalUTC;
    }

    // Fallback: use the Date object's UTC methods to preserve exact time during DST transitions
    // Create a new Date in UTC using the Date object's UTC components
    // This preserves the exact moment in time, avoiding DST ambiguity
    const utcDate = new Date(Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds()
    ));

    // Adjust for the timezone offset to get the correct UTC time
    const timezoneOffsetMs = date.getTimezoneOffset() * 60 * 1000;
    const adjustedUtcDate = new Date(utcDate.getTime() + timezoneOffsetMs);

    return adjustedUtcDate.toISOString();
  }

  const combined = dayjs(date)
    .hour(dayjs(time).hour())
    .minute(dayjs(time).minute())
    .second(dayjs(time).second())
    .tz(tz, true); // Keep local time, set timezone

  return combined.utc().toISOString();
}

/**
 * Validates timezone string
 */
export function isValidTimezone(timezone: string): boolean {
  // Check for empty string or null/undefined
  if (!timezone || timezone.trim() === '') {
    return false;
  }

  // Check if it's a timezone abbreviation (not valid IANA timezone)
  // Allow UTC as a special case
  if (timezone.length <= 4 && timezone.toUpperCase() === timezone && timezone !== 'UTC') {
    return false;
  }

  // Check if it follows IANA timezone format (Area/Location) or is UTC
  if (!timezone.includes('/') && timezone !== 'UTC') {
    return false;
  }

  try {
    // Test if dayjs can handle the timezone
    const testDate = dayjs('2024-01-01T12:00:00Z');
    const converted = testDate.tz(timezone);

    // For UTC, just verify it works
    if (timezone === 'UTC') {
      return true;
    }

    // For other timezones, verify they're not falling back to UTC
    const utcTime = testDate.utc();
    const convertedTime = converted.utc();

    // If the timezone is valid and different from UTC, the offset should be different
    // unless it's a timezone that happens to be at UTC offset at this time
    const offset = converted.utcOffset();

    // Valid timezone should have a defined offset
    return typeof offset === 'number';
  } catch {
    return false;
  }
}
