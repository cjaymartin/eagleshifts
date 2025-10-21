import { PrismaClient } from '@/generated/prisma';

/**
 * Interface for the result of parsing shift text
 */
interface ParseShiftTextResult {
  parsedShift: {
    title: string;
    startTime: string | null;
    endTime: string | null;
    date: string;
    locationId?: string;
    notes?: string;
    slots?: number;
  };
  tokensUsed: number;
}

/**
 * Parses shift text using AI to extract structured shift data
 * 
 * @param text The free-form text describing the shift
 * @param date Optional ISO string date for the shift
 * @param organizationId The organization ID
 * @param prisma Prisma client instance
 * @returns The parsed shift data and tokens used
 */
export async function parseShiftText(
  text: string,
  date?: string,
  organizationId?: string,
  prisma?: PrismaClient
): Promise<ParseShiftTextResult> {
  // This is a placeholder implementation
  // In a real implementation, this would call OpenAI API to parse the text

  // For now, we'll just extract some basic information from the text
  // and return a simple shift object

  // Extract time patterns like "9am to 5pm" or "9-5"
  const timePattern = /(\d{1,2}(?::\d{2})?(?:am|pm)?)\s*(?:to|-)\s*(\d{1,2}(?::\d{2})?(?:am|pm)?)/i;
  const timeMatch = text.match(timePattern);

  let startTime = null;
  let endTime = null;

  if (timeMatch && timeMatch.length >= 3) {
    // Very basic time parsing - in a real implementation, this would be more robust
    startTime = timeMatch[1];
    endTime = timeMatch[2];

    // Convert to ISO string if possible
    if (date) {
      try {
        const dateObj = new Date(date);

        // Parse start time
        const startParts = startTime.match(/(\d{1,2})(?::(\d{2}))?(?:(am|pm))?/i);
        if (startParts) {
          let hours = parseInt(startParts[1]);
          const minutes = startParts[2] ? parseInt(startParts[2]) : 0;
          const ampm = startParts[3]?.toLowerCase();

          // Adjust hours for AM/PM
          if (ampm === 'pm' && hours < 12) hours += 12;
          if (ampm === 'am' && hours === 12) hours = 0;

          const startDate = new Date(dateObj);
          startDate.setHours(hours, minutes, 0, 0);
          startTime = startDate.toISOString();
        }

        // Parse end time
        const endParts = endTime.match(/(\d{1,2})(?::(\d{2}))?(?:(am|pm))?/i);
        if (endParts) {
          let hours = parseInt(endParts[1]);
          const minutes = endParts[2] ? parseInt(endParts[2]) : 0;
          const ampm = endParts[3]?.toLowerCase();

          // Adjust hours for AM/PM
          if (ampm === 'pm' && hours < 12) hours += 12;
          if (ampm === 'am' && hours === 12) hours = 0;

          const endDate = new Date(dateObj);
          endDate.setHours(hours, minutes, 0, 0);
          endTime = endDate.toISOString();
        }
      } catch (error) {
        // Silently handle time parsing errors and continue with unparsed times
        startTime = null;
        endTime = null;
      }
    }
  }

  // Extract location if mentioned
  let locationId = undefined;
  let locationName = undefined;

  // If prisma and organizationId are provided, try to match location names
  if (prisma && organizationId) {
    try {
      // Get all locations for the organization
      const locations = await prisma.location.findMany({
        where: { organizationId },
        select: { id: true, name: true },
      });

      // Try to find a location mentioned in the text
      for (const location of locations) {
        if (text.toLowerCase().includes(location.name.toLowerCase())) {
          locationId = location.id;
          locationName = location.name;
          break;
        }
      }
    } catch (error) {
      // Silently handle database errors and continue without a location
      locationId = undefined;
      locationName = undefined;
    }
  }

  // Extract number of slots/people needed
  const slotsPattern = /(\d+)\s*(?:people|person|staff|employee|slot|position)/i;
  const slotsMatch = text.match(slotsPattern);
  const slots = slotsMatch ? parseInt(slotsMatch[1]) : undefined;

  // Generate a title based on the extracted information
  let title = 'New Shift';
  if (locationName) {
    title = `Shift at ${locationName}`;
  }
  if (startTime && endTime) {
    // For display purposes only, not using the ISO strings
    const displayStart = timeMatch ? timeMatch[1] : 'TBD';
    const displayEnd = timeMatch ? timeMatch[2] : 'TBD';
    title += ` (${displayStart}-${displayEnd})`;
  }

  // Return the parsed shift
  return {
    parsedShift: {
      title,
      startTime,
      endTime,
      date: date || new Date().toISOString(),
      locationId,
      notes: `Generated from text: "${text}"`,
      slots,
    },
    tokensUsed: 100, // Placeholder value
  };
}
