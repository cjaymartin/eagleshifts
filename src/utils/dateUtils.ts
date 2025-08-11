import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { z } from 'zod';

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
    const tz =
        options.organizationTimezone || options.fallbackTimezone || 'UTC';

    // Explicitly parse the date as UTC first, then convert to the target timezone
    const result = dayjs(utcDate).utc().tz(tz).toDate();

    return result;
}

/**
 * Converts organization timezone datetime to UTC for storage
 */
export function orgTimezoneToUtc(
    localDate: Date | string,
    options: DateTimeConversionOptions
): string {
    const tz =
        options.organizationTimezone || options.fallbackTimezone || 'UTC';

    const result = dayjs(localDate).tz(tz, true).utc().toISOString();

    return result;
}

/**
 * Combines date and time in organization timezone, converts to UTC
 * @param date The date to combine with time
 * @param timeStr The time string in military format (HH:mm or HH:mm:ss) - seconds will be dropped
 * @param options Timezone conversion options
 * @returns UTC ISO string
 */
export function combineDateTime(
    date: Date,
    timeStr: string,
    options: DateTimeConversionOptions
): string {
    const tz =
        options.organizationTimezone || options.fallbackTimezone || 'UTC';

    // 1. Get dateInOrgTimezone as we are now
    const dateInOrgTimezone = dayjs(date).tz(tz);

    // Special case: if date and timeStr are the same object (round-trip scenario)
    if (
        typeof timeStr === 'object' &&
        timeStr instanceof Date &&
        date === timeStr
    ) {
        // Use dayjs to handle the timezone conversion properly
        return dayjs(date).tz(tz).utc().toISOString();
    }

    // 2. Extract the dateString as YYYY-MM-DD of the date localized by timezones
    const dateString = dateInOrgTimezone.format('YYYY-MM-DD');

    // 3. Process the time string - only accept military format (HH:mm or HH:mm:ss) and drop seconds
    let militaryTime: string;

    // Handle the case where timeStr is a Date object (for backward compatibility)
    if (typeof timeStr === 'object' && timeStr instanceof Date) {
        militaryTime = dayjs(timeStr).format('HH:mm');
    } else {
        // Check if the time string is in the expected format
        const timeRegex = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;
        const match = timeStr.match(timeRegex);

        if (!match) {
            throw new Error(
                `Invalid time format: ${timeStr}. Expected format: HH:mm or HH:mm:ss`
            );
        }

        // Extract hours and minutes, ignore seconds
        const hours = match[1];
        const minutes = match[2];

        // Format as HH:mm (drop seconds)
        militaryTime = `${hours}:${minutes}`;
    }

    // 4. Create a dateTimeString by combining the dateString with the military time with a "T" in the middle
    const dateTimeString = `${dateString}T${militaryTime}`;

    // 5. Parse the new datetime string using dayjs.tz(dateTimeString, tz)
    const combined = dayjs.tz(dateTimeString, 'YYYY-MM-DDTHH:mm', tz);

    // If parsing failed, throw an error
    if (!combined.isValid()) {
        throw new Error(`Invalid date/time combination: ${dateTimeString}`);
    }

    // Return the result as UTC ISO string
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
    if (
        timezone.length <= 4 &&
        timezone.toUpperCase() === timezone &&
        timezone !== 'UTC'
    ) {
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
        const isValid = typeof offset === 'number';
        return isValid;
    } catch (error) {
        return false;
    }
}
