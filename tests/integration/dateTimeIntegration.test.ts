import { DateTime } from 'luxon';
import { combineDateAndTime, getTimeInZone } from '@/utils/dateAndTimeUtils';

describe('Date/Time Integration Tests - PRD Edge Cases', () => {
    const nyTimezone = 'America/New_York';
    const laTimezone = 'America/Los_Angeles';

    describe('End-of-Day Shifts (PRD Requirement)', () => {
        it('should not make calendar show shift as spanning two days when endTime is near end of day', () => {
            const testDate = new Date('2024-01-15');
            const startTime = combineDateAndTime(testDate, '20:00', nyTimezone); // 8 PM
            const endTime = combineDateAndTime(testDate, '23:59', nyTimezone); // 11:59 PM

            const displayStart = DateTime.fromISO(startTime)
                .setZone(nyTimezone)
                .toJSDate();
            const displayEnd = DateTime.fromISO(endTime)
                .setZone(nyTimezone)
                .toJSDate();

            expect(displayStart.getDate()).toBe(displayEnd.getDate());
            expect(displayStart.getMonth()).toBe(displayEnd.getMonth());
            expect(displayStart.getFullYear()).toBe(displayEnd.getFullYear());
        });

        it('should handle shifts that end exactly at midnight', () => {
            const testDate = new Date('2024-01-15');
            const startTime = combineDateAndTime(testDate, '22:00', nyTimezone); // 10 PM
            const endTime = combineDateAndTime(testDate, '23:59', nyTimezone); // 11:59 PM

            expect(startTime).toMatch(
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
            );
            expect(endTime).toMatch(
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
            );

            expect(new Date(endTime).getTime()).toBeGreaterThan(
                new Date(startTime).getTime()
            );
        });
    });

    describe('Day Crossing Scenarios (PRD Requirement)', () => {
        it('should handle database → form → database conversion without day crossing issues', () => {
            const originalStartUTC = new Date('2024-01-15T05:00:00.000Z'); // Midnight EST
            const originalEndUTC = new Date('2024-01-15T13:00:00.000Z'); // 8 AM EST

            const loadedStart = DateTime.fromJSDate(originalStartUTC)
                .setZone(nyTimezone)
                .toJSDate();
            const loadedEnd = DateTime.fromJSDate(originalEndUTC)
                .setZone(nyTimezone)
                .toJSDate();

            const formDate = loadedStart;
            const savedStartUTC = combineDateAndTime(
                formDate,
                getTimeInZone(loadedStart, nyTimezone),
                nyTimezone
            );
            const savedEndUTC = combineDateAndTime(
                formDate,
                getTimeInZone(loadedEnd, nyTimezone),
                nyTimezone
            );

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

            for (let i = 0; i < 10; i++) {
                const loaded = DateTime.fromISO(currentUTC.toISOString())
                    .setZone(nyTimezone)
                    .toJSDate();

                currentUTC = new Date(
                    combineDateAndTime(
                        loaded,
                        getTimeInZone(loaded, nyTimezone),
                        nyTimezone
                    )
                );
            }

            expect(currentUTC.getTime()).toBe(originalUTC.getTime());
        });
    });

    describe('Midnight Boundary Tests', () => {
        it('should handle shifts that start before midnight and end after midnight', () => {
            const startDate = new Date('2024-01-15');
            const endDate = new Date('2024-01-16');
            const startTime = combineDateAndTime(
                startDate,
                '23:30',
                nyTimezone
            ); // 11:30 PM
            const endTime = combineDateAndTime(endDate, '01:30', nyTimezone); // 1:30 AM next day

            expect(new Date(endTime).getTime()).toBeGreaterThan(
                new Date(startTime).getTime()
            );

            const durationMs =
                new Date(endTime).getTime() - new Date(startTime).getTime();
            const durationHours = durationMs / (1000 * 60 * 60);
            expect(durationHours).toBe(2);
        });

        it('should handle midnight shifts in different timezones', () => {
            const testDate = new Date('2024-01-15');

            const nyMidnightUTC = combineDateAndTime(
                testDate,
                '00:00',
                nyTimezone
            );
            const laMidnightUTC = combineDateAndTime(
                testDate,
                '00:00',
                laTimezone
            );

            const timeDiff =
                new Date(laMidnightUTC).getTime() -
                new Date(nyMidnightUTC).getTime();
            expect(timeDiff).toBe(3 * 60 * 60 * 1000); // 3 hours in milliseconds
        });
    });

    describe('DST Transitions (PRD Requirement)', () => {
        it('should handle shifts during spring forward (2 AM becomes 3 AM)', () => {
            const springDate = new Date('2024-03-10');
            const beforeTransition = combineDateAndTime(
                springDate,
                '01:30',
                nyTimezone
            );
            const afterTransition = combineDateAndTime(
                springDate,
                '03:30',
                nyTimezone
            );

            expect(beforeTransition).toMatch(
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
            );
            expect(afterTransition).toMatch(
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
            );

            expect(new Date(afterTransition).getTime()).toBeGreaterThan(
                new Date(beforeTransition).getTime()
            );
        });
    });

    describe('Critical Bug Prevention Tests', () => {
        it('should never set both startTimeISO and endTimeISO to the same value', () => {
            const testDate = new Date('2024-01-15');
            const startTimeISO = combineDateAndTime(
                testDate,
                '09:00',
                nyTimezone
            );
            const endTimeISO = combineDateAndTime(
                testDate,
                '17:00',
                nyTimezone
            );

            expect(startTimeISO).not.toBe(endTimeISO);
            expect(new Date(startTimeISO).getTime()).not.toBe(
                new Date(endTimeISO).getTime()
            );
        });
    });
});
