import { DateTime } from 'luxon';

// Hours from "00" to "23"
type HourIso =
    | '00'
    | '01'
    | '02'
    | '03'
    | '04'
    | '05'
    | '06'
    | '07'
    | '08'
    | '09'
    | '10'
    | '11'
    | '12'
    | '13'
    | '14'
    | '15'
    | '16'
    | '17'
    | '18'
    | '19'
    | '20'
    | '21'
    | '22'
    | '23';

// Minutes from "00" to "59"
type MinuteIso =
    | '00'
    | '01'
    | '02'
    | '03'
    | '04'
    | '05'
    | '06'
    | '07'
    | '08'
    | '09'
    | '10'
    | '11'
    | '12'
    | '13'
    | '14'
    | '15'
    | '16'
    | '17'
    | '18'
    | '19'
    | '20'
    | '21'
    | '22'
    | '23'
    | '24'
    | '25'
    | '26'
    | '27'
    | '28'
    | '29'
    | '30'
    | '31'
    | '32'
    | '33'
    | '34'
    | '35'
    | '36'
    | '37'
    | '38'
    | '39'
    | '40'
    | '41'
    | '42'
    | '43'
    | '44'
    | '45'
    | '46'
    | '47'
    | '48'
    | '49'
    | '50'
    | '51'
    | '52'
    | '53'
    | '54'
    | '55'
    | '56'
    | '57'
    | '58'
    | '59';

// Final TimeIso type: HH:mm where HH is 00-23 and mm is 00-59
export type UnkDate = Date;
export type UtcDate = Date & { utcDateBrand: void };
export type TimeIso = `${HourIso}:${MinuteIso}`;

export function castUtcDate(date: Date): UtcDate {
    const incomingDateTime = DateTime.fromJSDate(date);
    if (incomingDateTime.isValid) {
        // If the date contains timezone info, convert and enforce UTC
        if (
            incomingDateTime.zone.type === 'fixed' ||
            incomingDateTime.offset !== 0
        ) {
            return DateTime.fromJSDate(date).toUTC().toJSDate() as UtcDate;
        }

        // If no timezone info is present, assume it's already UTC
        return date as UtcDate;
    } else {
        throw new Error('Invalid Date provided to castUtcDate');
    }
}

// utcToTimezone function has been removed as it's no longer needed

export function getTimeInZone(dateInTimezone: Date, timezone: string): TimeIso {
    // Convert the date to a Luxon DateTime object with the specified timezone
    const dateTime = DateTime.fromJSDate(dateInTimezone).setZone(timezone);

    // Format the time as "HH:mm" to match the TimeIso type
    const formattedTime = dateTime.toFormat('HH:mm');

    // Return the formatted time as TimeIso
    return formattedTime as TimeIso;
}

export function combineDateAndTime(
    date: Date,
    timeIso: string, //would be TimeIso but that's crazy
    timezone: string
): string {
    // Parse the provided UTC date to a Luxon DateTime in the requested timezone
    const dateInTimezone = DateTime.fromJSDate(date, {
        zone: timezone,
    });

    // Extract hours and minutes from the timeIso string
    const [hours, minutes] = timeIso.split(':').map(Number);

    // Set the time on the DateTime instance
    const dateAndTimeInZone = dateInTimezone.set({
        hour: hours,
        minute: minutes,
    });

    const combinedDateTime = dateAndTimeInZone.toUTC();

    return combinedDateTime.toString();
}

// export function combineDateTime(
//     date: Date,
//     timeStr: TimeIso,
//     timezone: string
// ): DateTime {
//     //const tzDate =
// }
