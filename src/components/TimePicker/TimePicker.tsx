import React, { useState, useEffect } from 'react';
import { Autocomplete, TextField, IconButton, InputAdornment } from '@mui/material';
import { AccessTime, Add, Remove } from '@mui/icons-material';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(customParseFormat);
dayjs.extend(utc);
dayjs.extend(timezone);

export interface TimePickerProps {
    value?: string; // Expects 'HH:mm' format
    onChange?: (value: string) => void;
    intervalMinutes?: number;
    placeholder?: string;
    disabled?: boolean;
    showIncrement?: boolean;
    label?: string;
    timezone?: string;
}

// Utility to generate time options
function generateTimeOptions(interval: number): string[] {
    const options: string[] = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += interval) {
            options.push(dayjs().hour(h).minute(m).format('h:mm A'));
        }
    }
    return options;
}

// Utility to parse various time formats from user input
function parseTimeInput(input: string): string | null {
    if (!input) return null;
    const str = input.trim();

    // Handle 'now'
    if (str.toLowerCase() === 'now') {
        return dayjs().format('HH:mm');
    }

    // Handle numeric inputs like '345' or '1430'
    if (/^\d{3,4}$/.test(str)) {
        const len = str.length;
        const hour = parseInt(str.slice(0, len - 2), 10);
        const minute = parseInt(str.slice(len - 2), 10);
        if (hour < 24 && minute < 60) {
            return dayjs().hour(hour).minute(minute).format('HH:mm');
        }
    }

    // Handle other formats
    const formats = ['h:mm A', 'h:mmA', 'H:mm', 'ha', 'hA'];
    const parsed = dayjs(str, formats, true);
    if (parsed.isValid()) {
        return parsed.format('HH:mm');
    }

    return null;
}

// Utility to format 24h time string to 12h display
function formatTimeDisplay(time: string): string {
    if (!time) return '';
    const parsed = dayjs(time, 'HH:mm');
    return parsed.isValid() ? parsed.format('h:mm A') : '';
}

export const TimePicker: React.FC<TimePickerProps> = (props) => {
    const {
        value = '',
        onChange,
        intervalMinutes = 15,
        placeholder = 'Select time',
        disabled = false,
        showIncrement = false,
        label,
        timezone = 'UTC',
    } = props;

    const [inputValue, setInputValue] = useState(() => formatTimeDisplay(value));
    const options = generateTimeOptions(intervalMinutes);

    useEffect(() => {
        setInputValue(formatTimeDisplay(value));
    }, [value]);

    const handleValueChange = (newValue: string | null) => {
        const parsed = parseTimeInput(newValue || '');
        if (onChange && parsed) {
            onChange(parsed);
        }
    };

    const nudge = (direction: 'up' | 'down') => {
        const currentTime = parseTimeInput(inputValue) || dayjs().format('HH:mm');
        const currentDayjs = dayjs(currentTime, 'HH:mm');
        const minutes = currentDayjs.hour() * 60 + currentDayjs.minute();

        let newMinutes;
        if (direction === 'up') {
            newMinutes = (Math.floor(minutes / intervalMinutes) + 1) * intervalMinutes;
        } else { // down
            newMinutes = (Math.ceil(minutes / intervalMinutes) - 1) * intervalMinutes;
        }

        // Handle wrapping around midnight
        if (newMinutes >= 24 * 60) {
            newMinutes -= 24 * 60;
        }
        if (newMinutes < 0) {
            newMinutes += 24 * 60;
        }

        const newHour = Math.floor(newMinutes / 60);
        const newMinute = newMinutes % 60;

        const newTime = dayjs().hour(newHour).minute(newMinute).format('HH:mm');
        if (onChange) {
            onChange(newTime);
        }
    };

    return (
        <Autocomplete
            freeSolo
            options={options}
            value={formatTimeDisplay(value)}
            inputValue={inputValue}
            onInputChange={(event, newInputValue) => {
                setInputValue(newInputValue);
            }}
            onChange={(event, newValue) => {
                handleValueChange(newValue);
            }}
            onBlur={() => {
                const parsed = parseTimeInput(inputValue);
                if (parsed) {
                    if (onChange) onChange(parsed);
                    setInputValue(formatTimeDisplay(parsed));
                } else {
                    setInputValue(formatTimeDisplay(value)); // Revert if invalid
                }
            }}
            disabled={disabled}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={label}
                    placeholder={placeholder}
                    helperText={timezone}
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
                                        <IconButton onClick={() => nudge('down')} disabled={disabled} size="small">
                                            <Remove />
                                        </IconButton>
                                        <IconButton onClick={() => nudge('up')} disabled={disabled} size="small">
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
