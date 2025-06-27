import { FormControl, MenuItem, Select, SelectProps } from '@mui/material';
import { Pending, ThumbDown, ThumbUp } from '@mui/icons-material';
import React from 'react';

type OutcomeSelectProps = Omit<SelectProps, 'children' | 'onChange'> & {
    value: 'waiting' | 'assigned' | 'refused';
    onChange?: (value: 'waiting' | 'assigned' | 'refused') => void;
};

export default function OutcomeSelect(props: OutcomeSelectProps) {
    const { value: value, onChange, ...rest } = props;
    //const value = _value === '' ? null : _value;

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
                    <ThumbUp color="green" />
                </MenuItem>
                <MenuItem value="refused">
                    <ThumbDown color="red" />
                </MenuItem>
            </Select>
        </FormControl>
    );
}
