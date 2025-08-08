import React, { useState, useMemo, useRef } from 'react';
import {
    Autocomplete,
    TextField,
    MenuItem,
    ListItemText,
    Typography,
} from '@mui/material';
import { Controller, useFormContext } from 'react-hook-form';
import dayjs from 'dayjs';

// Generate time options in 15-minute increments (12:00am to 11:45pm)
const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
            const time = dayjs().hour(hour).minute(minute).second(0);
            const formattedTime = time.format('h:mmA'); // e.g., "1:30PM"
            options.push({
                value: time.toDate(),
                label: formattedTime,
                hour,
                minute,
            });
        }
    }
    return options;
};

// All time options
const ALL_TIME_OPTIONS = generateTimeOptions();

type TimePickerProps = {
    name: string;
    label: string;
    disabled?: boolean;
};

export default function TimePicker({ name, label, disabled }: TimePickerProps) {
    const {
        control,
        formState: { errors },
    } = useFormContext();
    const error = errors[name];

    // State for the input value
    const [inputValue, setInputValue] = useState('');

    // State to track the highlighted option (best match)
    const [highlightedOption, setHighlightedOption] = useState<any>(null);

    // State to control dropdown open state
    const [isOpen, setIsOpen] = useState(false);

    // Ref to the autocomplete component
    const autocompleteRef = useRef<any>(null);

    // Find matching options based on input value without filtering
    const findMatchingOptions = (options: any, inputValue: any) => {
        if (!inputValue)
            return { matchingOptions: options, bestMatchIndex: -1 };

        const lowerInput = inputValue.toLowerCase();

        // Remove any colons from the input for easier parsing
        const cleanInput = lowerInput.replace(/:/g, '');

        let bestMatchIndex = -1;

        // Pattern 1: Up to 4 digits with a/am or p/pm suffix
        if (/^\d{1,4}[ap](?:m)?$/i.test(cleanInput)) {
            // Extract the digits and am/pm part
            const match = cleanInput.match(/^(\d{1,4})([ap](?:m)?)$/i);
            if (match) {
                const digits = match[1];
                const ampm = match[2].toLowerCase().startsWith('p')
                    ? 'pm'
                    : 'am';

                // Parse the time
                let hour = 0;
                let minute = 0;

                if (digits.length <= 2) {
                    // Just hours: "1p", "12a", etc.
                    hour = parseInt(digits, 10);
                    minute = 0;
                } else if (digits.length === 3) {
                    // Hour and minute: "130p" = 1:30pm
                    hour = parseInt(digits.substring(0, 1), 10);
                    minute = parseInt(digits.substring(1), 10);
                } else if (digits.length === 4) {
                    // Hour and minute: "1230p" = 12:30pm
                    hour = parseInt(digits.substring(0, 2), 10);
                    minute = parseInt(digits.substring(2), 10);
                }

                // Adjust hour for PM
                if (ampm === 'pm' && hour < 12) {
                    hour += 12;
                } else if (ampm === 'am' && hour === 12) {
                    hour = 0;
                }

                // Round minute to nearest 15
                minute = Math.round(minute / 15) * 15;
                if (minute === 60) {
                    minute = 0;
                    hour = (hour + 1) % 24;
                }

                // Find the matching option
                bestMatchIndex = options.findIndex(
                    (option: any) =>
                        option.hour === hour && option.minute === minute
                );
            }
        }
        // Pattern 2: Up to 4 digits (with or without colon) for military time
        else if (
            /^\d{1,4}$/.test(cleanInput) ||
            /^\d{1,2}:\d{1,2}$/.test(lowerInput)
        ) {
            let hour = 0;
            let minute = 0;

            if (lowerInput.includes(':')) {
                // Format with colon: "16:30", "6:45", etc.
                const parts = lowerInput.split(':');
                hour = parseInt(parts[0], 10);
                minute = parseInt(parts[1], 10);
            } else if (cleanInput.length <= 2) {
                // Just hours: "16", "5", etc.
                hour = parseInt(cleanInput, 10);
                minute = 0;
            } else if (cleanInput.length === 3) {
                // Remove leading zero if present: "045" -> "45" -> 4:30
                if (cleanInput[0] === '0') {
                    hour = parseInt(cleanInput[1], 10);
                    minute = parseInt(cleanInput[2] + '0', 10);
                } else {
                    hour = parseInt(cleanInput.substring(0, 1), 10);
                    minute = parseInt(cleanInput.substring(1), 10);
                }
            } else if (cleanInput.length === 4) {
                // Format: "1630" = 16:30
                hour = parseInt(cleanInput.substring(0, 2), 10);
                minute = parseInt(cleanInput.substring(2), 10);
            }

            // Ensure hour is valid (0-23)
            if (hour >= 0 && hour < 24) {
                // Round minute to nearest 15
                minute = Math.round(minute / 15) * 15;
                if (minute === 60) {
                    minute = 0;
                    hour = (hour + 1) % 24;
                }

                console.log(`Parsed military time: ${hour}:${minute}`);

                // Find the matching option
                bestMatchIndex = options.findIndex(
                    (option: any) =>
                        option.hour === hour && option.minute === minute
                );
            }
        }

        console.log(`Best match index: ${bestMatchIndex}`);
        return { matchingOptions: options, bestMatchIndex };
    };

    // Helper function to scroll to an option in the dropdown
    const scrollToOption = (index: any) => {
        // Increase timeout to ensure the dropdown is fully rendered
        setTimeout(() => {
            console.log('TOSCROLL');
            try {
                // Find the listbox element in the document
                // We need to look for the listbox that's currently open/visible
                const listbox = document.querySelector(
                    '.MuiAutocomplete-listbox'
                );
                console.log({ listbox, index });
                if (!listbox) {
                    console.log('Listbox element not found');
                    return;
                }

                if (index < 0) {
                    console.log('Invalid index:', index);
                    return;
                }

                console.log('IN2');
                const items = listbox.querySelectorAll('li');
                if (!items || !items[index]) {
                    console.log('Item not found at index:', index);
                    return;
                }

                // Get the target item and its dimensions
                const item = items[index];
                const itemHeight = item.offsetHeight;

                // Calculate the position of the item relative to the listbox
                const itemOffsetTop = item.offsetTop;

                // Calculate the position to scroll to (center the item in the listbox)
                const listboxHeight = listbox.clientHeight;
                const scrollTop =
                    itemOffsetTop - listboxHeight / 2 + itemHeight / 2;

                console.log({ listboxHeight, scrollTop });

                // Set the scroll position directly
                listbox.scrollTop = scrollTop;
            } catch (error) {
                console.error('Error in scrollToOption:', error);
            }
        }, 100); // Increased from 0ms to 100ms
    };

    return (
        <Controller
            name={name}
            control={control}
            render={({ field }) => {
                // Format the current value for display
                const displayValue = field.value
                    ? dayjs(field.value).format('h:mmA')
                    : '';

                // Find the best matching option based on input
                const { matchingOptions, bestMatchIndex } = findMatchingOptions(
                    ALL_TIME_OPTIONS,
                    inputValue
                );

                // Get all options and the index to scroll to
                const allOptions = ALL_TIME_OPTIONS;
                const scrollToIndex = bestMatchIndex;

                return (
                    <Autocomplete
                        ref={autocompleteRef}
                        disabled={disabled}
                        options={allOptions}
                        getOptionLabel={(option) => option.label}
                        value={
                            field.value
                                ? ALL_TIME_OPTIONS.find(
                                      (option) =>
                                          dayjs(option.value).format(
                                              'HH:mm'
                                          ) ===
                                          dayjs(field.value).format('HH:mm')
                                  )
                                : null
                        }
                        onChange={(_, newValue) => {
                            field.onChange(newValue ? newValue.value : null);
                        }}
                        blurOnSelect
                        selectOnFocus={false}
                        clearOnBlur={false}
                        open={isOpen}
                        onOpen={() => setIsOpen(true)}
                        onClose={() => setIsOpen(false)}
                        inputValue={inputValue}
                        onInputChange={(_, newInputValue) => {
                            setInputValue(newInputValue);

                            // Open the dropdown when typing
                            if (newInputValue) {
                                setIsOpen(true);
                            }

                            // Find the best match but don't select it - just highlight it
                            if (newInputValue) {
                                const { matchingOptions, bestMatchIndex } =
                                    findMatchingOptions(
                                        ALL_TIME_OPTIONS,
                                        newInputValue
                                    );
                                if (bestMatchIndex !== -1) {
                                    // Update the highlighted option (best match)
                                    setHighlightedOption(
                                        matchingOptions[bestMatchIndex]
                                    );

                                    // Scroll to the best match with a slight delay to ensure the dropdown is rendered
                                    // No need for an additional setTimeout here since scrollToOption already has one
                                    scrollToOption(bestMatchIndex);
                                }
                            } else {
                                setHighlightedOption(null);
                            }
                        }}
                        onBlur={(event) => {
                            // When the component loses focus, select the highlighted option
                            if (highlightedOption) {
                                field.onChange(highlightedOption.value);
                            }

                            // Close the popup when the component loses focus
                            // Use setTimeout to ensure this happens after any other event processing
                            setTimeout(() => {
                                setIsOpen(false);
                            }, 100);
                        }}
                        onKeyDown={(e) => {
                            // When Enter is pressed, select the highlighted option
                            if (e.key === 'Enter' && highlightedOption) {
                                e.preventDefault();
                                field.onChange(highlightedOption.value);
                                // Keep the dropdown open after selection
                                setTimeout(() => {
                                    if (autocompleteRef.current) {
                                        const input =
                                            autocompleteRef.current.querySelector(
                                                'input'
                                            );
                                        if (input) {
                                            input.focus();
                                        }
                                    }
                                }, 0);
                            } else if (e.key === 'Escape') {
                                // Close the dropdown on Escape
                                setIsOpen(false);
                            }
                        }}
                        // Don't filter options - show all and just scroll to the best match
                        filterOptions={(options) => options}
                        renderOption={(props, option) => {
                            // Check if this option is the highlighted one
                            const isHighlighted =
                                highlightedOption &&
                                option.hour === highlightedOption.hour &&
                                option.minute === highlightedOption.minute;

                            // Check if this option is the best match based on input
                            const isBestMatch =
                                scrollToIndex !== -1 &&
                                option.hour ===
                                    allOptions[scrollToIndex].hour &&
                                option.minute ===
                                    allOptions[scrollToIndex].minute;

                            return (
                                <MenuItem
                                    {...props}
                                    key={option.label}
                                    sx={{
                                        ...(isHighlighted && {
                                            backgroundColor:
                                                'rgba(25, 118, 210, 0.12)',
                                            fontWeight: 'bold',
                                        }),
                                        ...(isBestMatch && {
                                            backgroundColor:
                                                'rgba(25, 118, 210, 0.08)',
                                        }),
                                    }}
                                >
                                    <ListItemText>
                                        <Typography
                                            variant="body1"
                                            sx={{
                                                ...(isHighlighted && {
                                                    fontWeight: 'bold',
                                                }),
                                                ...(isBestMatch && {
                                                    fontWeight: 'bold',
                                                }),
                                            }}
                                        >
                                            {option.label}
                                        </Typography>
                                    </ListItemText>
                                </MenuItem>
                            );
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label={label}
                                error={!!error}
                                helperText={error?.message as string}
                            />
                        )}
                    />
                );
            }}
        />
    );
}
