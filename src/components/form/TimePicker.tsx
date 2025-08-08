import React, { useState, useMemo, useRef, useEffect } from 'react';
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
    // Initialize to false to ensure dropdowns are closed by default
    const [isOpen, setIsOpen] = useState(false);

    // Ref to the autocomplete component
    const autocompleteRef = useRef<any>(null);

    // Ref to track the latest selected value from onChange
    const latestSelectedValueRef = useRef<string | null>(null);

    // Ensure dropdowns are closed when the component is first rendered
    useEffect(() => {
        setIsOpen(false);
    }, []);

    // Track if this is the initial render
    const isInitialRender = useRef(true);

    // Update the input value only on initial render
    useEffect(() => {
        if (isInitialRender.current) {
            const { field } = control._fields[name] || {};
            if (field && field.value) {
                const formattedTime = dayjs(field.value).format('h:mmA');
                setInputValue(formattedTime);
            }
            isInitialRender.current = false;
        }
    }, [control, name]);

    // Helper function to parse time input and return hour and minute
    const parseTimeInput = (input: string): { hour: number; minute: number; parsed: boolean } => {
        const lowerInput = input.toLowerCase();
        const cleanInput = lowerInput.replace(/:/g, '');
        let hour = 0;
        let minute = 0;
        let parsed = false;

        // Pattern 1: Up to 4 digits with a/am or p/pm suffix
        if (/^\d{1,4}[ap](?:m)?$/i.test(cleanInput)) {
            const match = cleanInput.match(/^(\d{1,4})([ap](?:m)?)$/i);
            if (match) {
                const digits = match[1];
                const ampm = match[2].toLowerCase().startsWith('p') ? 'pm' : 'am';

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

                parsed = true;
            }
        }
        // Pattern 2: Up to 4 digits (with or without colon) for military time
        else if (/^\d{1,4}$/.test(cleanInput) || /^\d{1,2}:\d{1,2}$/.test(lowerInput)) {
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

            parsed = true;
        }

        // Ensure hour and minute are valid
        if (parsed && (hour < 0 || hour >= 24 || minute < 0 || minute >= 60)) {
            parsed = false;
        }

        return { hour, minute, parsed };
    };

    // Find matching options based on input value without filtering
    const findMatchingOptions = (options: any, inputValue: any) => {
        if (!inputValue)
            return { matchingOptions: options, bestMatchIndex: -1 };

        // Use the helper function to parse the input
        const { hour, minute, parsed } = parseTimeInput(inputValue);

        let bestMatchIndex = -1;

        // If parsing was successful, find the closest matching option
        if (parsed) {
            // For dropdown display, find the closest 15-minute interval option
            // This is only for highlighting in the dropdown, not for the actual value
            const closestMinute = Math.round(minute / 15) * 15;
            const adjustedHour = closestMinute === 60 ? (hour + 1) % 24 : hour;
            const adjustedMinute = closestMinute === 60 ? 0 : closestMinute;

            // Find the matching option for display in dropdown
            bestMatchIndex = options.findIndex(
                (option: any) =>
                    option.hour === adjustedHour && option.minute === adjustedMinute
            );

            console.log(`Parsed time: ${hour}:${minute}, Closest option: ${adjustedHour}:${adjustedMinute}`);
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
                                  ) || {
                                      // Create a custom option for non-15-minute times
                                      value: field.value,
                                      label: dayjs(field.value).format('h:mmA'),
                                      hour: dayjs(field.value).hour(),
                                      minute: dayjs(field.value).minute(),
                                  }
                                : null
                        }
                        onChange={(_, newValue) => {
                            console.log('onChange triggered', { newValue });
                            field.onChange(newValue ? newValue.value : null);
                            // Update the inputValue to match the selected option's label
                            if (newValue) {
                                console.log('Setting inputValue in onChange to:', newValue.label);
                                setInputValue(newValue.label);
                                // Store the latest selected value in the ref
                                latestSelectedValueRef.current = newValue.label;
                            } else {
                                latestSelectedValueRef.current = null;
                            }
                        }}
                        blurOnSelect
                        selectOnFocus={false}
                        clearOnBlur={false}
                        open={isOpen}
                        onOpen={() => setIsOpen(true)}
                        onClose={() => setIsOpen(false)}
                        inputValue={inputValue}
                        onInputChange={(_, newInputValue) => {
                            console.log('onInputChange triggered', { 
                                newInputValue, 
                                currentInputValue: inputValue,
                                fieldValue: field.value ? dayjs(field.value).format('h:mmA') : null
                            });

                            setInputValue(newInputValue);

                            // Clear the field value when the user starts typing
                            // This allows setting a new value without having to click the "X" first
                            if (newInputValue && field.value) {
                                console.log('Clearing field value because user started typing');
                                field.onChange(null);
                            }

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
                            console.log('onBlur triggered', { 
                                relatedTarget: event.relatedTarget,
                                relatedTargetTagName: event.relatedTarget ? event.relatedTarget.tagName : null,
                                relatedTargetClassName: event.relatedTarget ? event.relatedTarget.className : null,
                                inputValue,
                                latestSelectedValue: latestSelectedValueRef.current
                            });

                            // Skip parsing if the dropdown was just clicked (selection was made)
                            // This is determined by checking if the related target is a menu item
                            const isMenuItemClick = event.relatedTarget && 
                                (event.relatedTarget.closest('.MuiAutocomplete-option') || 
                                 event.relatedTarget.closest('.MuiMenuItem-root'));

                            console.log('isMenuItemClick:', isMenuItemClick);

                            // If we have a latest selected value from onChange, use that instead of parsing
                            if (latestSelectedValueRef.current) {
                                console.log('Using latest selected value from onChange:', latestSelectedValueRef.current);
                                // We don't need to do anything here as the onChange handler has already set the field value
                                // Just reset the ref
                                latestSelectedValueRef.current = null;
                            } else if (!isMenuItemClick) {
                                // When the component loses focus (not due to menu item click), parse the input
                                if (inputValue) {
                                    // Use the helper function to parse the input
                                    const { hour, minute, parsed } = parseTimeInput(inputValue);
                                    console.log('Parsing input in onBlur:', { hour, minute, parsed });

                                    // If parsing was successful, create a custom time value
                                    if (parsed) {
                                        const customTime = dayjs().hour(hour).minute(minute).second(0).toDate();
                                        console.log('Parsed successfully in onBlur, setting field value to:', dayjs(customTime).format('h:mmA'));
                                        field.onChange(customTime);

                                        // Update the input value to show the formatted time
                                        const formattedTime = dayjs(customTime).format('h:mmA');
                                        console.log('Setting inputValue in onBlur to:', formattedTime);
                                        setInputValue(formattedTime);
                                    } else if (highlightedOption) {
                                        // Fallback to highlighted option if parsing failed
                                        console.log('Parsing failed in onBlur, using highlighted option:', highlightedOption.label);
                                        field.onChange(highlightedOption.value);

                                        // Update the input value to show the formatted time
                                        console.log('Setting inputValue in onBlur to highlighted option:', highlightedOption.label);
                                        setInputValue(highlightedOption.label);
                                    }
                                } else if (highlightedOption) {
                                    // If no input but there's a highlighted option, use that
                                    console.log('No input in onBlur, using highlighted option:', highlightedOption.label);
                                    field.onChange(highlightedOption.value);

                                    // Update the input value to show the formatted time
                                    console.log('Setting inputValue in onBlur to highlighted option (no input):', highlightedOption.label);
                                    setInputValue(highlightedOption.label);
                                }
                            }

                            // Close the popup when the component loses focus
                            // Use setTimeout to ensure this happens after any other event processing
                            setTimeout(() => {
                                setIsOpen(false);
                            }, 100);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();

                                // Parse the input to get hour and minute using the helper function
                                if (inputValue) {
                                    // Use the helper function to parse the input
                                    const { hour, minute, parsed } = parseTimeInput(inputValue);

                                    // If parsing was successful, create a custom time value
                                    if (parsed) {
                                        const customTime = dayjs().hour(hour).minute(minute).second(0).toDate();
                                        field.onChange(customTime);

                                        // Update the input value to show the formatted time
                                        const formattedTime = dayjs(customTime).format('h:mmA');
                                        setInputValue(formattedTime);
                                    } else if (highlightedOption) {
                                        // Fallback to highlighted option if parsing failed
                                        field.onChange(highlightedOption.value);

                                        // Update the input value to show the formatted time
                                        setInputValue(highlightedOption.label);
                                    }
                                } else if (highlightedOption) {
                                    // If no input but there's a highlighted option, use that
                                    field.onChange(highlightedOption.value);

                                    // Update the input value to show the formatted time
                                    setInputValue(highlightedOption.label);
                                }

                                // Keep the dropdown open after selection
                                setTimeout(() => {
                                    if (autocompleteRef.current) {
                                        const input = autocompleteRef.current.querySelector('input');
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
