import { DateTime } from 'luxon';
import { SlopDateTimeConversionOptions } from '@/utils/slopDateUtils';

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


export function utcToTimezone(utcDate: Date | string, timezone: string): Date {
    // Handle string input (ISO format)
    if (typeof utcDate === 'string') {
        return DateTime.fromISO(utcDate, {
            zone: 'UTC',
        })
            .setZone(timezone)
            .toJSDate();
    }

    // Handle Date object
    return DateTime.fromJSDate(utcDate, {
        zone: 'UTC',
    })
        .setZone(timezone)
        .toJSDate();
}

// export function combineDateTime(
//     date: Date,
//     timeStr: TimeIso,
//     timezone: string
// ): DateTime {
//     //const tzDate =
// }
