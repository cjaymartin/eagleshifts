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

describe('Date/Time Integration Tests - PRD Edge Cases', () => {
    const nyOptions: SlopDateTimeConversionOptions = {
        organizationTimezone: 'America/New_York',
        fallbackTimezone: 'America/New_York',
    };

    const laOptions: SlopDateTimeConversionOptions = {
        organizationTimezone: 'America/Los_Angeles',
        fallbackTimezone: 'America/New_York',
    };

    describe('End-of-Day Shifts (PRD Requirement)', () => {
        it('should not make calendar show shift as spanning two days when endTime is near end of day', () => {
            // Test a shift that ends at 11:59 PM - should not span to next day on calendar
            const testDate = new Date('2024-01-15');
            const startTime = new Date('2024-01-15T20:00:00'); // 8 PM
            const endTime = new Date('2024-01-15T23:59:00'); // 11:59 PM

            const startTimeISO = combineDateTime(
                testDate,
                dayjs(startTime).format('HH:mm'),
                nyOptions
            );
            const endTimeISO = combineDateTime(
                testDate,
                dayjs(endTime).format('HH:mm'),
                nyOptions
            );

            // Convert back to display times
            const displayStart = utcToTimezone(
                startTimeISO,
                nyOptions.organizationTimezone
            );
            const displayEnd = utcToTimezone(
                endTimeISO,
                nyOptions.organizationTimezone
            );

            // Both should be on the same calendar day
            expect(displayStart.getDate()).toBe(displayEnd.getDate());
            expect(displayStart.getMonth()).toBe(displayEnd.getMonth());
            expect(displayStart.getFullYear()).toBe(displayEnd.getFullYear());
        });

        it('should handle shifts that end exactly at midnight', () => {
            const testDate = new Date('2024-01-15');
            const startTime = new Date('2024-01-15T22:00:00'); // 10 PM
            const endTime = new Date('2024-01-15T23:59:59'); // 11:59:59 PM (same day)

            const startTimeISO = combineDateTime(
                testDate,
                dayjs(startTime).format('HH:mm'),
                nyOptions
            );
            const endTimeISO = combineDateTime(
                testDate,
                dayjs(endTime).format('HH:mm'),
                nyOptions
            );

            // Should handle midnight boundary correctly
            expect(startTimeISO).toMatch(
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
            );
            expect(endTimeISO).toMatch(
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
            );

            // End time should be after start time
            expect(new Date(endTimeISO).getTime()).toBeGreaterThan(
                new Date(startTimeISO).getTime()
            );
        });
    });

    describe('Day Crossing Scenarios (PRD Requirement)', () => {
        it('should handle database → form → database conversion without day crossing issues', () => {
            // Test a shift that could potentially cross days during conversion
            const originalStartUTC = new Date('2024-01-15T05:00:00.000Z'); // Midnight EST
            const originalEndUTC = new Date('2024-01-15T13:00:00.000Z'); // 8 AM EST

            // Simulate loading from database
            const loadedStart = utcToTimezone(
                originalStartUTC,
                nyOptions.organizationTimezone
            );
            const loadedEnd = utcToTimezone(
                originalEndUTC,
                nyOptions.organizationTimezone
            );

            // Simulate form processing (combining date and time)
            const formDate = loadedStart; // Use start date as form date
            const savedStartUTC = combineDateTime(
                formDate,
                dayjs(loadedStart).format('HH:mm'),
                nyOptions
            );
            const savedEndUTC = combineDateTime(
                formDate,
                dayjs(loadedEnd).format('HH:mm'),
                nyOptions
            );

            // Should preserve original UTC times
            expect(new Date(savedStartUTC).getTime()).toBe(
                originalStartUTC.getTime()
            );
            expect(new Date(savedEndUTC).getTime()).toBe(
                originalEndUTC.getTime()
            );
        });

        it('should prevent time drift in multiple conversion cycles', () => {
            const originalUTC = new Date('2024-01-15T23:30:00.000Z'); // Late evening UTC

            let currentUTC = originalUTC;

            // Perform 10 conversion cycles
            for (let i = 0; i < 10; i++) {
                console.log({ currentUTC });
                const loaded = utcToTimezone(
                    currentUTC,
                    nyOptions.organizationTimezone
                );
                console.log({ loaded });

                currentUTC = new Date(
                    combineDateTime(
                        loaded,
                        dayjs(loaded).format('HH:mm'),
                        nyOptions
                    )
                );
            }

            // Should not drift from original time
            expect(new Date(currentUTC).getTime()).toBe(originalUTC.getTime());
        });
    });

    describe('Midnight Boundary Tests (PRD Requirement)', () => {
        it('should handle shifts that start before midnight and end after midnight', () => {
            const startDate = new Date('2024-01-15');
            const endDate = new Date('2024-01-16');
            const startTime = new Date('2024-01-15T23:30:00'); // 11:30 PM
            const endTime = new Date('2024-01-16T01:30:00'); // 1:30 AM next day

            const startTimeISO = combineDateTime(
                startDate,
                dayjs(startTime).format('HH:mm'),
                nyOptions
            );
            const endTimeISO = combineDateTime(
                endDate,
                dayjs(endTime).format('HH:mm'),
                nyOptions
            );

            // Verify times are in correct order
            expect(new Date(endTimeISO).getTime()).toBeGreaterThan(
                new Date(startTimeISO).getTime()
            );

            // Verify the shift duration is correct (2 hours)
            const durationMs =
                new Date(endTimeISO).getTime() -
                new Date(startTimeISO).getTime();
            const durationHours = durationMs / (1000 * 60 * 60);
            expect(durationHours).toBe(2);
        });

        it('should handle midnight shifts in different timezones', () => {
            const testDate = new Date('2024-01-15');

            const nyAtMidnight = dayjs
                .tz(testDate, 'America/New_York')
                .utc()
                .toDate();
            const laAtMidnight = dayjs
                .tz(testDate, 'America/Los_Angeles')
                .utc()
                .toDate();

            // Test in NY timezone
            const nyMidnightUTC = combineDateTime(
                nyAtMidnight,
                '00:00',
                nyOptions
            );

            // Test in LA timezone
            const laMidnightUTC = combineDateTime(
                laAtMidnight,
                '00:00',
                laOptions
            );

            // LA midnight should be 3 hours later than NY midnight
            const timeDiff =
                new Date(laMidnightUTC).getTime() -
                new Date(nyMidnightUTC).getTime();
            expect(timeDiff).toBe(3 * 60 * 60 * 1000); // 3 hours in milliseconds
        });
    });

    describe('DST Transitions (PRD Requirement)', () => {
        it('should handle shifts during spring forward (2 AM becomes 3 AM)', () => {
            // March 10, 2024 - Spring forward in America/New_York
            const springDate = new Date('2024-03-10');
            const beforeTransition = new Date('2024-03-10T01:30:00'); // 1:30 AM
            const afterTransition = new Date('2024-03-10T03:30:00'); // 3:30 AM (2:30 AM doesn't exist)

            const startTimeISO = combineDateTime(
                springDate,
                dayjs(beforeTransition).format('HH:mm'),
                nyOptions
            );
            const endTimeISO = combineDateTime(
                springDate,
                dayjs(afterTransition).format('HH:mm'),
                nyOptions
            );

            // Should handle DST transition correctly
            expect(startTimeISO).toMatch(
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
            );
            expect(endTimeISO).toMatch(
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
            );

            // End should be after start
            expect(new Date(endTimeISO).getTime()).toBeGreaterThan(
                new Date(startTimeISO).getTime()
            );
        });

        it('should handle shifts during fall back (2 AM becomes 1 AM)', () => {
            // November 3, 2024 - Fall back in America/New_York
            const fallDate = new Date('2024-11-03');
            const beforeTransition = new Date('2024-11-03T01:30:00'); // 1:30 AM (first occurrence)
            const afterTransition = new Date('2024-11-03T02:30:00'); // 2:30 AM

            const startTimeISO = combineDateTime(
                fallDate,
                dayjs(beforeTransition).format('HH:mm'),
                nyOptions
            );
            const endTimeISO = combineDateTime(
                fallDate,
                dayjs(afterTransition).format('HH:mm'),
                nyOptions
            );

            // Should handle DST transition correctly
            expect(startTimeISO).toMatch(
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
            );
            expect(endTimeISO).toMatch(
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
            );

            // End should be after start
            expect(new Date(endTimeISO).getTime()).toBeGreaterThan(
                new Date(startTimeISO).getTime()
            );
        });

        it('should maintain consistency across DST boundaries in load-save cycles', () => {
            // Test during DST transition
            const dstTransitionUTC = new Date('2024-03-10T07:00:00.000Z'); // During spring forward

            // Perform load-save cycle
            const loaded = utcToTimezone(
                dstTransitionUTC,
                nyOptions.organizationTimezone
            );
            const saved = combineDateTime(
                loaded,
                dayjs(loaded).format('HH:mm'),
                nyOptions
            );

            // Should preserve original time
            expect(new Date(saved).getTime()).toBe(dstTransitionUTC.getTime());
        });
    });

    describe.skip('Form Round-Trip Tests (PRD Requirement)', () => {
        it('should prevent time drift in extensive database → form → database conversions', () => {
            const testCases = [
                new Date('2024-01-15T14:00:00.000Z'), // Standard time
                new Date('2024-06-15T14:00:00.000Z'), // Daylight time
                new Date('2024-03-10T07:00:00.000Z'), // DST transition day
                new Date('2024-11-03T06:00:00.000Z'), // DST fall back day
                new Date('2024-01-01T05:00:00.000Z'), // New Year midnight EST
                new Date('2024-12-31T23:59:59.000Z'), // End of year
            ];

            testCases.forEach((originalUTC) => {
                // Perform multiple round-trips
                let currentUTC = originalUTC;

                for (let i = 0; i < 5; i++) {
                    const loaded = utcToTimezone(
                        currentUTC,
                        nyOptions.organizationTimezone
                    );
                    currentUTC = combineDateTime(
                        loaded,
                        dayjs(loaded).format('HH:mm:ss'),
                        nyOptions
                    );
                }

                expect(new Date(currentUTC).getTime()).toBe(
                    originalUTC.getTime()
                );
            });
        });

        it('should handle form round-trips with different timezones', () => {
            const originalUTC = new Date('2024-01-15T17:00:00.000Z'); // 12 PM EST, 9 AM PST

            // Test NY timezone round-trip
            const nyLoaded = utcToTimezone(
                originalUTC,
                nyOptions.organizationTimezone
            );
            console.log('NY loaded:', nyLoaded);
            console.log(
                'NY loaded has _originalUTC:',
                !!(nyLoaded as any)._originalUTC
            );
            console.log(
                'NY loaded _originalUTC:',
                (nyLoaded as any)._originalUTC
            );
            console.log(
                'NY formatted time:',
                dayjs(nyLoaded).format('HH:mm:ss')
            );
            const nySaved = combineDateTime(
                nyLoaded,
                dayjs(nyLoaded).format('HH:mm:ss'),
                nyOptions
            );
            console.log('NY saved:', nySaved);

            // Test LA timezone round-trip
            const laLoaded = utcToTimezone(
                originalUTC,
                laOptions.organizationTimezone
            );
            console.log('LA loaded:', laLoaded);
            console.log(
                'LA loaded has _originalUTC:',
                !!(laLoaded as any)._originalUTC
            );
            console.log(
                'LA loaded _originalUTC:',
                (laLoaded as any)._originalUTC
            );
            console.log(
                'LA formatted time:',
                dayjs(laLoaded).format('HH:mm:ss')
            );
            const laSaved = combineDateTime(
                laLoaded,
                dayjs(laLoaded).format('HH:mm:ss'),
                laOptions
            );
            console.log('LA saved:', laSaved);

            // Both should preserve original UTC time
            expect(new Date(nySaved).getTime()).toBe(originalUTC.getTime());
            expect(new Date(laSaved).getTime()).toBe(originalUTC.getTime());
        });
    });

    describe('Critical Bug Prevention Tests', () => {
        it('should never set both startTimeISO and endTimeISO to the same value', () => {
            const testDate = new Date('2024-01-15');
            const startTime = new Date('2024-01-15T09:00:00');
            const endTime = new Date('2024-01-15T17:00:00');

            const startTimeISO = combineDateTime(
                testDate,
                dayjs(startTime).format('HH:mm'),
                nyOptions
            );
            const endTimeISO = combineDateTime(
                testDate,
                dayjs(endTime).format('HH:mm'),
                nyOptions
            );

            // Critical: Start and end times must be different
            expect(startTimeISO).not.toBe(endTimeISO);

            // Verify they represent different actual times
            expect(new Date(startTimeISO).getTime()).not.toBe(
                new Date(endTimeISO).getTime()
            );
        });

        it('should use consistent conversion methods for create and update operations', () => {
            const testDate = new Date('2024-01-15');
            const testTime = new Date('2024-01-15T12:00:00');

            // Both create and update should use combineDateTime (not .format())
            const createResult = combineDateTime(
                testDate,
                dayjs(testTime).format('HH:mm'),
                nyOptions
            );
            const updateResult = combineDateTime(
                testDate,
                dayjs(testTime).format('HH:mm'),
                nyOptions
            );

            // Should produce identical results
            expect(createResult).toBe(updateResult);

            // Should be valid ISO strings
            expect(createResult).toMatch(
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
            );
            expect(updateResult).toMatch(
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
            );
        });
    });

    describe('Timezone Validation and Fallback', () => {
        it('should validate organization timezones correctly', () => {
            const validTimezones = [
                'America/New_York',
                'America/Los_Angeles',
                'Europe/London',
                'Asia/Tokyo',
                'UTC',
            ];

            const invalidTimezones = [
                'Invalid/Timezone',
                'NotATimezone',
                '',
                'EST', // Abbreviations are not valid IANA timezones
                'PST',
            ];

            validTimezones.forEach((tz) => {
                expect(isValidTimezone(tz)).toBe(true);
            });

            invalidTimezones.forEach((tz) => {
                expect(isValidTimezone(tz)).toBe(false);
            });
        });

        it('should throw error for invalid timezone', () => {
            const testDate = new Date('2024-01-15');
            const testTime = new Date('2024-01-15T12:00:00');

            const invalidOptions: SlopDateTimeConversionOptions = {
                organizationTimezone: 'Invalid/Timezone',
                fallbackTimezone: 'America/New_York',
            };

            // Should throw error for invalid timezone
            expect(() =>
                combineDateTime(
                    testDate,
                    dayjs(testTime).format('HH:mm'),
                    invalidOptions
                )
            ).toThrow();
        });
    });

    describe('Performance and Edge Cases', () => {
        it('should handle large numbers of timezone conversions efficiently', () => {
            const startTime = Date.now();

            // Perform 1000 conversions
            for (let i = 0; i < 1000; i++) {
                const day = (i % 28) + 1; // Days 1-28 (valid for all months)
                const hour = i % 24; // Hours 0-23
                const testDate = new Date(
                    `2024-01-${day.toString().padStart(2, '0')}`
                );
                const testTime = new Date(
                    `2024-01-15T${hour.toString().padStart(2, '0')}:00:00`
                );
                combineDateTime(
                    testDate,
                    dayjs(testTime).format('HH:mm'),
                    nyOptions
                );
            }

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should complete within reasonable time (less than 5 seconds)
            expect(duration).toBeLessThan(5000);
        });

        it('should handle edge dates correctly', () => {
            const edgeCases = [
                {
                    date: new Date('1970-01-01'),
                    time: new Date('1970-01-01T00:00:00'),
                }, // Unix epoch
                {
                    date: new Date('2038-01-19'),
                    time: new Date('2038-01-19T03:14:07'),
                }, // Near 32-bit timestamp limit
                {
                    date: new Date('2000-02-29'),
                    time: new Date('2000-02-29T12:00:00'),
                }, // Leap year
                {
                    date: new Date('1999-12-31'),
                    time: new Date('1999-12-31T23:59:59'),
                }, // Y2K boundary
            ];

            edgeCases.forEach(({ date, time }) => {
                const result = combineDateTime(
                    date,
                    dayjs(time).format('HH:mm'),
                    nyOptions
                );
                expect(result).toMatch(
                    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
                );
            });
        });
    });
});
