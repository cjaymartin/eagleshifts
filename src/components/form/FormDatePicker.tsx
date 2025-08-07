import React from 'react';
import { useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

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
    const dayjsDate = useMemo(
        () => (dateValue ? dayjs.utc(dateValue) : null),
        [dateValue]
    );

    return (
        <Controller
            name={name}
            control={control}
            render={({ field }) => (
                <DatePicker
                    {...field}
                    label={label}
                    disabled={disabled}
                    // Ensure value is a valid dayjs object or null
                    value={dayjsDate}
                    onChange={(date) =>
                        // Pass a standard JS Date object or null back to the form
                        field.onChange(date ? date.toDate() : null)
                    }
                    slotProps={{
                        textField: {
                            error: !!error,
                            helperText: error?.message as string | undefined,
                        },
                    }}
                />
            )}
        />
    );
}
