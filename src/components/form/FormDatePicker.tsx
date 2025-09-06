import React from 'react';
import { useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';
import { DateTime } from 'luxon';

// Debug function to safely log date objects
const logDateInfo = (label: string, value: any) => {
  console.log(`[FormDatePicker] ${label}:`, {
    value,
    type: value ? typeof value : 'null/undefined',
    isDate: value instanceof Date,
    isLuxon: value && typeof value === 'object' && 'toJSDate' in value,
    toISOString: value instanceof Date ? value.toISOString() : 'not a Date',
    valueJSON: JSON.stringify(value, (key, val) => 
      val instanceof Date ? val.toISOString() : val
    )
  });
};

type FormDatePickerProps = {
    name: string;
    label: string;
    disabled?: boolean;
};

// We wrap the component in React.memo to prevent unnecessary re-renders
export default function FormDatePicker({
    name,
    label,
    disabled,
}: FormDatePickerProps) {
    // useFormContext allows us to access the parent form's control
    const {
        control,
        formState: { errors },
        watch,
    } = useFormContext();
    const error = errors[name];

    const dateValue = watch('date');
    console.log(`[FormDatePicker] Component ${name} rendering with dateValue:`, dateValue);
    logDateInfo('dateValue from watch', dateValue);

    const luxonDate = useMemo(
        () => {
            const result = dateValue ? DateTime.fromJSDate(dateValue, { zone: 'utc' }) : null;
            logDateInfo('luxonDate from useMemo', result);
            return result;
        },
        [dateValue]
    );

    return (
        <Controller
            name={name}
            control={control}
            render={({ field }) => {
                console.log(`[FormDatePicker] Controller render for ${name}`);
                logDateInfo(`field.value for ${name} before DatePicker`, field.value);

                return (
                    <LocalizationProvider dateAdapter={AdapterLuxon}>
                        <DatePicker
                            {...field}
                            label={label}
                            disabled={disabled}
                            // Ensure value is a valid DateTime object or null
                            value={field.value}
                            timezone="UTC"
                            onChange={(date) => {
                                // Log the date received from DatePicker
                                console.log(`[FormDatePicker] onChange triggered for ${name}`);
                                logDateInfo(`date from onChange for ${name}`, date);

                                // Pass a standard JS Date object or null back to the form
                                field.onChange(date);

                                // Log after onChange
                                console.log(`[FormDatePicker] After onChange for ${name}`);
                            }}
                            slotProps={{
                                textField: {
                                    error: !!error,
                                    helperText: error?.message as string | undefined,
                                },
                            }}
                        />
                    </LocalizationProvider>
                );
            }}
        />
    );
}
