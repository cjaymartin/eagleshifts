import React, { useState } from 'react';
import { TimePicker } from './TimePicker';

export default {
    title: 'Components/TimePicker',
    component: TimePicker,
    argTypes: {
        intervalMinutes: {
            control: { type: 'number', min: 1, max: 60, step: 1 },
            defaultValue: 15,
        },
        showIncrement: { control: 'boolean', defaultValue: false },
        disabled: { control: 'boolean', defaultValue: false },
        placeholder: { control: 'text', defaultValue: 'Select time' },
        label: { control: 'text', defaultValue: 'Time' },
        timezone: { control: 'text', defaultValue: 'America/New_York' },
    },
};

export const Default = (args: any) => {
    const [value, setValue] = useState<Date | undefined>(undefined);
    return (
        <div style={{ padding: 40 }}>
            <TimePicker {...args} value={value} onChange={setValue} />
            <div style={{ marginTop: 16 }}>
                Selected:{' '}
                {value
                    ? value.toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                      })
                    : 'None'}
            </div>
        </div>
    );
};

Default.args = {
    intervalMinutes: 15,
    showIncrement: true,
    disabled: false,
    placeholder: 'Select time',
    label: 'Event Time',
    timezone: 'America/New_York',
};
