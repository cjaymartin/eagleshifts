import { FormControl, MenuItem, Select, SelectProps } from '@mui/material';
import { Pending, ThumbDown, ThumbUp } from '@mui/icons-material';
import React from 'react';

type OutcomeSelectProps = Omit<SelectProps, 'children' | 'onChange'> & {
    value: 'waiting' | 'assigned' | 'refused';
    onChange?: (value: 'waiting' | 'assigned' | 'refused') => void;
    readOnly?: boolean;
};

export default function OutcomeSelect(props: OutcomeSelectProps) {
    const { value: value, onChange, readOnly, ...rest } = props;
    //const value = _value === '' ? null : _value;

    // If readOnly, just render the icon without the dropdown
    if (readOnly) {
        return (
            <>
                {value === 'waiting' && <Pending color="yellow" />}
                {value === 'assigned' && <ThumbUp color="success" />}
                {value === 'refused' && <ThumbDown color="error" />}
            </>
        );
    }

    // Otherwise, render the full dropdown
    return (
        <FormControl>
            <Select
                variant="standard"
                disableUnderline={true}
                labelId="demo-simple-select-label"
                id="demo-simple-select"
                {...rest}
                onChange={(event) => {
                    if (onChange) {
                        onChange(
                            event.target.value as
                                | 'waiting'
                                | 'assigned'
                                | 'refused'
                        );
                    }
                }}
                value={value}
            >
                <MenuItem value="waiting">
                    <Pending color="yellow" />
                </MenuItem>
                <MenuItem value="assigned">
                    <ThumbUp color="success" />
                </MenuItem>
                <MenuItem value="refused">
                    <ThumbDown color="error" />
                </MenuItem>
            </Select>
        </FormControl>
    );
}
