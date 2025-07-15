'use client';

import React from 'react';
import { TextField, MenuItem, SxProps, Theme } from '@mui/material';

interface DayOfWeekPickerProps {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  sx?: SxProps<Theme>;
  disabled?: boolean;
}

const days = [
  { value: 'sunday', label: 'Sunday' },
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
];

export default function DayOfWeekPicker({
  value,
  onChange,
  label = 'Day of Week',
  sx,
  disabled = false,
}: DayOfWeekPickerProps) {
  return (
    <TextField
      select
      label={label}
      value={value}
      onChange={onChange}
      sx={sx}
      disabled={disabled}
      variant="outlined"
    >
      {days.map((day) => (
        <MenuItem key={day.value} value={day.value}>
          {day.label}
        </MenuItem>
      ))}
    </TextField>
  );
}