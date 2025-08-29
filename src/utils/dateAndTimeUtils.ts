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
export type TimeIso = `${HourIso}:${MinuteIso}`;

export function utcToTimezone(utcDate: Date, timezone: string): Date {
    return DateTime.fromJSDate(utcDate, {
        zone: 'UTC',
    })
        .setZone(timezone)
        .toJSDate();
}

export function combineDateTime(
    date: Date,
    timeStr: TimeIso,
    timezone: string
): DateTime {
    //const tzDate =
}
