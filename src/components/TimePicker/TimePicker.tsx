import React, { useState, useEffect } from 'react';
import {
    Autocomplete,
    TextField,
    IconButton,
    InputAdornment,
} from '@mui/material';
import { AccessTime, Add, Remove } from '@mui/icons-material';
import { DateTime } from 'luxon';

export interface TimePickerProps {
    value?: Date; // JS Date object
    onChange?: (value: Date) => void;
    intervalMinutes?: number;
    placeholder?: string;
    disabled?: boolean;
    showIncrement?: boolean;
    label?: string;
    timezone?: string; // IANA or offset TZ string
}

// Utility to generate time options in 12h format for the given timezone
function generateTimeOptions(interval: number, timezone: string): string[] {
    const options: string[] = [];
    // Use a fixed date for all options, e.g., 2020-01-01
    const base = DateTime.fromObject(
        { year: 2020, month: 1, day: 1 },
        { zone: timezone }
    );
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += interval) {
            const dt = base.set({ hour: h, minute: m });
            options.push(dt.toFormat('h:mm a'));
        }
    }
    return options;
}

// Parse user input as a time in the given timezone, return a Date object (UTC)
function parseTimeInput(
    input: string,
    timezone: string,
    baseDate: Date
): Date | null {
    if (!input) return null;
    const str = input.trim();
    const base = DateTime.fromJSDate(baseDate, { zone: timezone });

    // Handle 'now'
    if (str.toLowerCase() === 'now') {
        return DateTime.now().setZone(timezone).toJSDate();
    }

    // Handle numeric inputs like '345' or '1430'
    if (/^\d{3,4}$/.test(str)) {
        const len = str.length;
        const hour = parseInt(str.slice(0, len - 2), 10);
        const minute = parseInt(str.slice(len - 2), 10);
        if (hour < 24 && minute < 60) {
            return base
                .set({ hour, minute, second: 0, millisecond: 0 })
                .toJSDate();
        }
    }

    // Try various time formats
    const formats = ['h:mm a', 'h:mma', 'H:mm', 'ha', 'hA'];
    for (const fmt of formats) {
        const dt = DateTime.fromFormat(str, fmt, { zone: timezone });
        if (dt.isValid) {
            return base
                .set({
                    hour: dt.hour,
                    minute: dt.minute,
                    second: 0,
                    millisecond: 0,
                })
                .toJSDate();
        }
    }
    return null;
}

// Format a JS Date to 12h display in the given timezone
function formatTimeDisplay(date: Date | undefined, timezone: string): string {
    if (!date) return '';
    const dt = DateTime.fromJSDate(date, { zone: timezone });
    return dt.isValid ? dt.toFormat('h:mm a') : '';
}

export const TimePicker: React.FC<TimePickerProps> = (props) => {
    const {
        value,
        onChange,
        intervalMinutes = 15,
        placeholder = 'Select time',
        disabled = false,
        showIncrement = false,
        label,
        timezone = 'UTC',
    } = props;

    // Use today as the base date for time picking
    const baseDate = value || new Date();
    const [inputValue, setInputValue] = useState(() =>
        formatTimeDisplay(value, timezone)
    );
    const options = generateTimeOptions(intervalMinutes, timezone);

    useEffect(() => {
        setInputValue(formatTimeDisplay(value, timezone));
    }, [value, timezone]);

    const handleValueChange = (newValue: string | null) => {
        const parsed = parseTimeInput(newValue || '', timezone, baseDate);
        if (onChange && parsed) {
            onChange(parsed);
        }
    };

    const nudge = (direction: 'up' | 'down') => {
        // Get current time in the selected timezone
        const currentDT = value
            ? DateTime.fromJSDate(value, { zone: timezone })
            : DateTime.now().setZone(timezone);
        const minutes = currentDT.hour * 60 + currentDT.minute;
        let newMinutes;
        if (direction === 'up') {
            newMinutes =
                (Math.floor(minutes / intervalMinutes) + 1) * intervalMinutes;
        } else {
            newMinutes =
                (Math.ceil(minutes / intervalMinutes) - 1) * intervalMinutes;
        }
        // Wrap around midnight
        if (newMinutes >= 24 * 60) newMinutes -= 24 * 60;
        if (newMinutes < 0) newMinutes += 24 * 60;
        const newDT = currentDT.set({
            hour: Math.floor(newMinutes / 60),
            minute: newMinutes % 60,
            second: 0,
            millisecond: 0,
        });
        if (onChange) {
            onChange(newDT.toJSDate());
        }
    };

    return (
        <Autocomplete
            freeSolo
            options={options}
            value={formatTimeDisplay(value, timezone)}
            inputValue={inputValue}
            onInputChange={(event, newInputValue) => {
                setInputValue(newInputValue);
            }}
            onChange={(event, newValue) => {
                handleValueChange(newValue);
            }}
            onBlur={() => {
                const parsed = parseTimeInput(inputValue, timezone, baseDate);
                if (parsed) {
                    if (onChange) onChange(parsed);
                    setInputValue(formatTimeDisplay(parsed, timezone));
                } else {
                    setInputValue(formatTimeDisplay(value, timezone)); // Revert if invalid
                }
            }}
            disabled={disabled}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={label}
                    placeholder={placeholder}
                    // No helperText for timezone
                    InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                            <InputAdornment position="start">
                                <AccessTime />
                            </InputAdornment>
                        ),
                        endAdornment: (
                            <InputAdornment position="end">
                                {showIncrement && (
                                    <>
                                        <IconButton
                                            onClick={() => nudge('down')}
                                            disabled={disabled}
                                            size="small"
                                            tabIndex={-1} // Exclude from tab order
                                        >
                                            <Remove />
                                        </IconButton>
                                        <IconButton
                                            onClick={() => nudge('up')}
                                            disabled={disabled}
                                            size="small"
                                            tabIndex={-1} // Exclude from tab order
                                        >
                                            <Add />
                                        </IconButton>
                                    </>
                                )}
                                {params.InputProps.endAdornment}
                            </InputAdornment>
                        ),
                    }}
                />
            )}
        />
    );
};
