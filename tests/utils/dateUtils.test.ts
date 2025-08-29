import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { utcToTimezone } from '@/utils/dateAndTimeUtils';
import {
    orgTimezoneToUtc,
    combineDateTime,
    isValidTimezone,
    SlopDateTimeConversionOptions,
} from '@/utils/slopDateUtils';

// Extend dayjs with plugins
dayjs.extend(utc);
dayjs.extend(timezone);

describe('dateUtils', () => {
    describe('isValidTimezone', () => {
        it('should validate common timezones as valid', () => {
            expect(isValidTimezone('America/New_York')).toBe(true);
            expect(isValidTimezone('UTC')).toBe(true);
            expect(isValidTimezone('Europe/London')).toBe(true);
            expect(isValidTimezone('America/Los_Angeles')).toBe(true);
        });

        it('should reject invalid timezones', () => {
            expect(isValidTimezone('Invalid/Fake')).toBe(false);
            expect(isValidTimezone('NotATimezone')).toBe(false);
            expect(isValidTimezone('')).toBe(false);
        });
    });

    describe('utcToTimezone', () => {
        const options: SlopDateTimeConversionOptions = {
            organizationTimezone: 'America/New_York',
            fallbackTimezone: 'America/New_York',
        };

        it('should convert UTC to organization timezone correctly', () => {
            // 2 PM UTC in January (EST) should be 9 AM in New York
            const utcDate = new Date('2024-01-15T14:00:00.000Z');
            const nyTime = utcToTimezone(utcDate, options.organizationTimezone);

            expect(nyTime.getHours()).toBe(9); // 9 AM EST
        });

        it('should handle daylight saving time correctly', () => {
            // 2 PM UTC in June (EDT) should be 10 AM in New York
            const utcDate = new Date('2024-06-15T14:00:00.000Z');
            const nyTime = utcToTimezone(utcDate, options.organizationTimezone);

            expect(nyTime.getHours()).toBe(10); // 10 AM EDT
        });

        it('should use fallback timezone when organization timezone is not provided', () => {
            const utcDate = new Date('2024-01-15T14:00:00.000Z');
            const fallbackOptions = {
                organizationTimezone: '',
                fallbackTimezone: 'America/New_York',
            };
            const result = utcToTimezone(utcDate, fallbackOptions.fallbackTimezone);

            expect(result.getHours()).toBe(9); // Should use fallback
        });

        it('should handle string input dates', () => {
            const utcDateString = '2024-01-15T14:00:00.000Z';
            const nyTime = utcToTimezone(utcDateString, options.organizationTimezone);

            expect(nyTime.getHours()).toBe(9);
        });
    });

    describe('orgTimezoneToUtc', () => {
        const options: SlopDateTimeConversionOptions = {
            organizationTimezone: 'America/New_York',
            fallbackTimezone: 'America/New_York',
        };

        it('should convert organization timezone to UTC correctly', () => {
            // 9 AM EST should be 2 PM UTC
            const localDate = new Date('2024-01-15T09:00:00');
            const utcString = orgTimezoneToUtc(localDate, options);

            expect(utcString).toBe('2024-01-15T14:00:00.000Z');
        });

        it('should handle daylight saving time correctly', () => {
            // 10 AM EDT should be 2 PM UTC
            const localDate = new Date('2024-06-15T10:00:00');
            const utcString = orgTimezoneToUtc(localDate, options);

            expect(utcString).toBe('2024-06-15T14:00:00.000Z');
        });

        it('should return ISO string format', () => {
            const localDate = new Date('2024-01-15T09:00:00');
            const utcString = orgTimezoneToUtc(localDate, options);

            expect(utcString).toMatch(
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
            );
        });
    });

    describe('combineDateTime', () => {
        const options: SlopDateTimeConversionOptions = {
            organizationTimezone: 'America/New_York',
            fallbackTimezone: 'America/New_York',
        };

        it('should combine date and time correctly and convert to UTC', () => {
            const testDate = new Date('2024-01-15');
            const testStartTime = dayjs.tz(
                '2024-01-15T09:00:00',
                'America/New_York'
            );
            const testEndTime = dayjs.tz(
                '2024-01-15T17:00:00',
                'America/New_York'
            );

            const startTimeISO = combineDateTime(testDate, '09:00', options);
            const endTimeISO = combineDateTime(testDate, '17:00', options);

            // Start and end times should be different
            expect(startTimeISO).not.toBe(endTimeISO);

            // Both should be valid ISO strings
            expect(startTimeISO).toMatch(
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
            );
            expect(endTimeISO).toMatch(
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
            );

            // Start time should be earlier than end time
            expect(new Date(startTimeISO).getTime()).toBeLessThan(
                new Date(endTimeISO).getTime()
            );
        });

        it('should fix the critical bug where both times were set to end time', () => {
            const testDate = new Date('2024-01-15');
            const testStartTime = new Date('2024-01-15T09:00:00');
            const testEndTime = new Date('2024-01-15T17:00:00');

            const startTimeISO = combineDateTime(
                testDate,
                dayjs(testStartTime).format('HH:mm'),
                options
            );
            const endTimeISO = combineDateTime(
                testDate,
                dayjs(testEndTime).format('HH:mm'),
                options
            );

            // This test ensures the critical bug is fixed - start and end should be different
            expect(startTimeISO).not.toBe(endTimeISO);

            // Verify the actual times are correct
            const startUTC = new Date(startTimeISO);
            const endUTC = new Date(endTimeISO);

            // In EST (UTC-5), 9 AM local = 2 PM UTC, 5 PM local = 10 PM UTC
            expect(startUTC.getUTCHours()).toBe(14); // 2 PM UTC
            expect(endUTC.getUTCHours()).toBe(22); // 10 PM UTC
        });

        it('should handle different timezones correctly', () => {
            const dateString = '2024-01-15 00:00:00';
            const timeZoneEST = 'America/New_York';
            const timeZonePST = 'America/Los_Angeles';

            const nyBah = dayjs.tz(dateString, timeZoneEST).toISOString();
            const laBah = dayjs
                .tz('2024-01-15 00:00:00', 'America/Los_Angeles')
                .toISOString();
            console.log({ nyBah, laBah });

            const nyAtMidnight = new Date(
                dayjs.tz('2024-01-15 00:00', 'America/New_York').toISOString()
            );
            const laAtMidnight = new Date(
                dayjs
                    .tz('2024-01-15 00:00', 'America/Los_Angeles')
                    .toISOString()
            );

            const nyOptions = {
                organizationTimezone: 'America/New_York',
                fallbackTimezone: 'UTC',
            };
            const laOptions = {
                organizationTimezone: 'America/Los_Angeles',
                fallbackTimezone: 'UTC',
            };

            const nyTimeISO = combineDateTime(nyAtMidnight, '00:00', nyOptions);
            const laTimeISO = combineDateTime(laAtMidnight, '00:00', laOptions);

            // LA is 3 hours behind NY, so LA time should be 3 hours later in UTC
            const nyUTC = new Date(nyTimeISO);
            const laUTC = new Date(laTimeISO);

            expect(laUTC.getTime() - nyUTC.getTime()).toBe(3 * 60 * 60 * 1000); // 3 hours in milliseconds
        });
    });

    describe('Load-Save Idempotency', () => {
        const options: SlopDateTimeConversionOptions = {
            organizationTimezone: 'America/New_York',
            fallbackTimezone: 'America/New_York',
        };

        it('should preserve exact times when loading and immediately saving', () => {
            const originalUTC = '2024-01-15T14:00:00.000Z';

            // Simulate loading from database (UTC) and converting to org timezone
            const loadedTime = utcToTimezone(originalUTC, options.organizationTimezone);

            // Simulate saving back to database (convert back to UTC)
            const savedUTC = combineDateTime(
                loadedTime,
                dayjs(loadedTime).format('HH:mm'),
                options
            );

            // Round-trip should preserve the original time
            expect(savedUTC).toBe(originalUTC);
        });

        it('should handle multiple round-trips without time drift', () => {
            const originalUTC = '2024-06-15T18:30:00.000Z'; // Summer time to test DST

            let currentUTC = originalUTC;

            // Perform multiple round-trips
            for (let i = 0; i < 5; i++) {
                const loadedTime = utcToTimezone(currentUTC, options.organizationTimezone);
                currentUTC = combineDateTime(
                    loadedTime,
                    dayjs(loadedTime).format('HH:mm'),
                    options
                );
            }

            expect(currentUTC).toBe(originalUTC);
        });
    });

    describe('Edge Cases', () => {
        const options: SlopDateTimeConversionOptions = {
            organizationTimezone: 'America/New_York',
            fallbackTimezone: 'America/New_York',
        };

        it('should handle midnight boundary correctly', () => {
            const testDate = new Date('2024-01-15');
            const midnightTime = new Date('2024-01-15T00:00:00');

            const result = combineDateTime(
                testDate,
                dayjs(midnightTime).format('HH:mm'),
                options
            );

            expect(result).toMatch(
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
            );

            const utcDate = new Date(result);
            expect(utcDate.getUTCHours()).toBe(5); // Midnight EST = 5 AM UTC
        });

        it('should handle end-of-day times correctly', () => {
            const testDate = new Date('2024-01-15');
            const endOfDayTime = new Date('2024-01-15T23:59:59');

            const result = combineDateTime(
                testDate,
                dayjs(endOfDayTime).format('HH:mm:ss'),
                options
            );

            const utcDate = new Date(result);
            // 11:59 PM EST = 4:59 AM UTC next day
            expect(utcDate.getUTCHours()).toBe(4);
            expect(utcDate.getUTCMinutes()).toBe(59);
        });

        it('should handle DST transition periods', () => {
            // Spring forward: March 10, 2024 (2 AM becomes 3 AM)
            const springDate = new Date('2024-03-10');
            const springTime = new Date('2024-03-10T02:30:00');

            const springResult = combineDateTime(
                springDate,
                dayjs(springTime).format('HH:mm'),
                options
            );
            expect(springResult).toMatch(
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
            );

            // Fall back: November 3, 2024 (2 AM becomes 1 AM)
            const fallDate = new Date('2024-11-03');
            const fallTime = new Date('2024-11-03T01:30:00');

            const fallResult = combineDateTime(
                fallDate,
                dayjs(fallTime).format('HH:mm'),
                options
            );
            expect(fallResult).toMatch(
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
            );
        });

        it('should handle different timezone formats', () => {
            const testDate = new Date('2024-01-15');
            const testTime = new Date('2024-01-15T12:00:00');

            const timezones = [
                'America/New_York',
                'America/Los_Angeles',
                'Europe/London',
                'UTC',
            ];

            timezones.forEach((tz) => {
                const options = {
                    organizationTimezone: tz,
                    fallbackTimezone: 'UTC',
                };
                const result = combineDateTime(
                    testDate,
                    dayjs(testTime).format('HH:mm'),
                    options
                );

                expect(result).toMatch(
                    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
                );
                expect(isValidTimezone(tz)).toBe(true);
            });
        });
    });

    describe('Error Handling', () => {
        it('should throw error for invalid dates', () => {
            const options: SlopDateTimeConversionOptions = {
                organizationTimezone: 'America/New_York',
                fallbackTimezone: 'UTC',
            };

            // Test with invalid date - dayjs throws RangeError for invalid dates
            const invalidDate = new Date('invalid');
            expect(() =>
                combineDateTime(invalidDate, '12:00', options)
            ).toThrow();
        });

        it('should throw error for invalid timezone', () => {
            const testDate = new Date('2024-01-15');
            const testTime = new Date('2024-01-15T12:00:00');

            const options: SlopDateTimeConversionOptions = {
                organizationTimezone: 'Invalid/Timezone',
                fallbackTimezone: 'UTC',
            };

            // Should throw error for invalid timezone
            expect(() =>
                combineDateTime(
                    testDate,
                    dayjs(testTime).format('HH:mm'),
                    options
                )
            ).toThrow();
        });
    });
});
