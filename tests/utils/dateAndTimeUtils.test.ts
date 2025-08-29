import { DateTime } from 'luxon';
import { castUtcDate, UtcDate } from '@/utils/dateAndTimeUtils';

// We'll use a more selective approach to testing instead of mocking Luxon globally
// This will allow us to test both the normal behavior and edge cases

// Helper function to create a Date object from an ISO string
function createUtcDate(isoString: string): Date {
  return new Date(isoString);
}


describe('dateAndTimeUtils', () => {
  describe('castUtcDate', () => {
    it('should return the same date if it is already in UTC', () => {
      // Create a date in UTC
      const utcDate = new Date('2024-01-15T12:00:00.000Z');
      const result = castUtcDate(utcDate);

      // Check that the result is the same as the input
      expect(result).toEqual(utcDate);

      // Verify it has UTC time values
      expect(result.getTime()).toEqual(utcDate.getTime());

      // Check UTC methods return expected values
      expect(result.getUTCHours()).toBe(12);
      expect(result.getUTCMinutes()).toBe(0);
    });

    it('should convert a non-UTC date to UTC', () => {
      // Create a date with a specific timezone offset
      // Note: This creates a date with the local timezone info
      const nonUtcDate = new Date('2024-01-15T12:00:00-05:00'); // EST timezone
      const result = castUtcDate(nonUtcDate);

      // The time should be adjusted to UTC (12:00 EST = 17:00 UTC)
      expect(result.getUTCHours()).toBe(17);
      expect(result.getUTCMinutes()).toBe(0);

      // Verify the timestamp is correct
      const expectedTimestamp = new Date('2024-01-15T17:00:00.000Z').getTime();
      expect(result.getTime()).toBe(expectedTimestamp);
    });

    it('should handle invalid dates by throwing an error', () => {
      // Create an invalid date
      const invalidDate = new Date('invalid');

      // Expect the function to throw an error
      expect(() => castUtcDate(invalidDate)).toThrow('Invalid Date provided to castUtcDate');
    });

    it('should work when called multiple times (chaining)', () => {
      // Create a date in UTC
      const utcDate = new Date('2024-01-15T12:00:00.000Z');

      // Call castUtcDate multiple times
      const result1 = castUtcDate(utcDate);
      const result2 = castUtcDate(result1);
      const result3 = castUtcDate(result2);

      // All results should be the same
      expect(result1).toEqual(utcDate);
      expect(result2).toEqual(utcDate);
      expect(result3).toEqual(utcDate);

      // Verify they all have the same timestamp
      expect(result1.getTime()).toBe(utcDate.getTime());
      expect(result2.getTime()).toBe(utcDate.getTime());
      expect(result3.getTime()).toBe(utcDate.getTime());

      // Verify they all have the same UTC time
      expect(result1.getUTCHours()).toBe(12);
      expect(result2.getUTCHours()).toBe(12);
      expect(result3.getUTCHours()).toBe(12);
    });

    it('should handle dates with different timezone offsets', () => {
      // Test with various timezone offsets
      const testCases = [
        { input: '2024-01-15T12:00:00+01:00', expectedUtcHour: 11 }, // CET
        { input: '2024-01-15T12:00:00-08:00', expectedUtcHour: 20 }, // PST
        { input: '2024-01-15T12:00:00+05:30', expectedUtcHour: 6, expectedUtcMinute: 30 }, // IST
        { input: '2024-01-15T12:00:00+00:00', expectedUtcHour: 12 }, // UTC
      ];

      testCases.forEach(({ input, expectedUtcHour, expectedUtcMinute = 0 }) => {
        const date = new Date(input);
        const result = castUtcDate(date);

        expect(result.getUTCHours()).toBe(expectedUtcHour);
        expect(result.getUTCMinutes()).toBe(expectedUtcMinute);

        // Verify the timestamp matches what we'd expect from a UTC conversion
        const expectedDate = new Date(input);
        const expectedTimestamp = expectedDate.getTime();
        expect(result.getTime()).toBe(expectedTimestamp);
      });
    });

    it('should handle edge case: date at midnight', () => {
      const midnightDate = new Date('2024-01-15T00:00:00.000Z');
      const result = castUtcDate(midnightDate);

      expect(result.getUTCHours()).toBe(0);
      expect(result.getUTCMinutes()).toBe(0);
      expect(result.getUTCSeconds()).toBe(0);
    });

    it('should handle edge case: date at end of day', () => {
      const endOfDayDate = new Date('2024-01-15T23:59:59.999Z');
      const result = castUtcDate(endOfDayDate);

      expect(result.getUTCHours()).toBe(23);
      expect(result.getUTCMinutes()).toBe(59);
      expect(result.getUTCSeconds()).toBe(59);
    });
  });

});
