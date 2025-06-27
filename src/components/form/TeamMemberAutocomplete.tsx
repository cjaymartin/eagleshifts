import { styled } from '@mui/system';
import {
    Autocomplete,
    InputLabelProps,
    ListItemIcon,
    ListItemText,
    MenuItem,
    TextField,
    Typography,
} from '@mui/material';
//import { useTeamUsers } from '../../../store/TeamUser';
//import useUserAvailabilityList from '../../hooks/useUserAvailabilityList';
import React, { useCallback, useMemo } from 'react';
import { EventAvailable, EventBusy } from '@mui/icons-material';
import { useTeamUsersLookupQuery, useTeamUsersQuery } from '@/queries/users';
import { trpc } from '@/lib/trpc/client';
import {
    useAvailabilityByDate,
    useAvailabilityByDateLookupQuery,
} from '@/queries/availability';

const AvailableTextTypography = styled(Typography)(({ theme }) => {
    return {
        color: 'grey[700]', //theme.palette.available.main,
        '& .MuiSvgIcon-root': {
            color: 'grey[700]', //theme.palette.available.main,
        },
    };
});

const UnavailableTextTypography = styled(Typography)(({ theme }) => {
    return {
        color: 'grey[400]', //theme.palette.unavailable.main,
        '& .MuiSvgIcon-root': {
            color: 'grey[400]', //theme.palette.unavailable.main,
        },
    };
});

export type TeamMemberAutocompleteProps = Omit<
    React.ComponentProps<typeof Autocomplete>,
    'onChange' | 'options' | 'renderInput' | 'renderOption'
> & {
    date: Date; // Optional date for availability filtering
    exclude?: string[]; // Array of user IDs to exclude
    label?: string; // Label for the autocomplete input
    onChange?: (user: { id: string }) => void;
    //InputLabelProps?: Partial<InputLabelProps>;
};

export default function TeamMemberAutocomplete(
    props: TeamMemberAutocompleteProps
) {
    const { exclude, date, ...acProps } = props;

    const { data: teamUsers } = useTeamUsersQuery();
    const { data: userLookup } = useTeamUsersLookupQuery();

    const { data: userAvailabilityListLookup } =
        useAvailabilityByDateLookupQuery(date);

    const excludeLookup = useMemo(() => {
        const lookup: Record<string, boolean> = {};
        if (!exclude) return lookup;
        return exclude.reduce((acc, id) => {
            acc[id] = true;
            return acc;
        }, lookup);
    }, [exclude]);

    const userOptions = useMemo(() => {
        if (!teamUsers || !userLookup) return [];

        return teamUsers
            .filter((user) => !excludeLookup[user.id])
            .map((user) => {
                const isAvailable =
                    userAvailabilityListLookup?.[user.id]?.isAvailable ?? true;
                return {
                    ...user,
                    label: user.name,
                    isAvailable,
                };
            });
    }, [excludeLookup, teamUsers, userAvailabilityListLookup, userLookup]);

    //const userAvailabilityList = useUserAvailabilityList(props.date); //.filter(x => !excludeLookup[props.id]);
    //const userOptions = rawUserOptions.filter((x) => !excludeLookup[x.id]);

    function isAvailable(userId: string) {
        const availData = userAvailabilityListLookup?.[userId];
        return availData?.isAvailable ?? true;
    }

    const label = props.label || 'Team Member';
    return (
        <Autocomplete
            {...acProps}
            onChange={(_, v) => {
                if (props.onChange) {
                    props.onChange((v as { id: string }) ?? null);
                }
            }}
            options={userOptions}
            renderOption={(props, rawOption, state) => {
                const option = rawOption as (typeof userOptions)[0];

                const userAvailable = option.isAvailable;
                const Typ = userAvailable
                    ? AvailableTextTypography
                    : UnavailableTextTypography;
                const availIcon = userAvailable ? (
                    <ListItemIcon key={props.key + '-icon'}>
                        <EventAvailable color="available" />
                    </ListItemIcon>
                ) : (
                    <ListItemIcon>
                        <EventBusy
                            key={props.key + '-icon'}
                            color="unavailable"
                        />
                    </ListItemIcon>
                );
                return (
                    <MenuItem {...props} key={props.key} value={option.id}>
                        {availIcon}
                        <ListItemText key={props.key + '-text'}>
                            <Typ>{option.label}</Typ>
                        </ListItemText>
                    </MenuItem>
                );
            }}
            // getOptionLabel={(option) => option?.label || ''}
            // isOptionEqualToValue={(option, value) => option.id === value}
            renderInput={(params) => (
                <TextField
                    {...params}
                    label={props.value ? ' ' : label}
                    placeholder={label}
                />
            )}
        />
    );
}
