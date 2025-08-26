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
import { EventAvailable, EventBusy, Event } from '@mui/icons-material';
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

const TentativeTextTypography = styled(Typography)(({ theme }) => {
    return {
        color: 'grey[600]', // Between available (700) and unavailable (400)
        '& .MuiSvgIcon-root': {
            color: 'grey[600]',
        },
    };
});

export type TeamMemberAutocompleteProps = Omit<
    React.ComponentProps<typeof Autocomplete>,
    'onChange' | 'options' | 'renderInput' | 'renderOption'
> & {
    date: Date; // Optional date for availability filtering
    exclude?: string[]; // Array of member IDs to exclude
    label?: string; // Label for the autocomplete input
    onChange?: (member: { id: string }) => void;
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

    // Query to check if members have shifts on the same day
    console.log({ date });
    // Check if date is valid before using it
    const isValidDate = date instanceof Date && !isNaN(date.getTime());
    const { data: memberShifts } = trpc.shifts.list.useQuery(
        {
            startDate: isValidDate
                ? date.toISOString().split('T')[0]
                : undefined,
            endDate: isValidDate ? date.toISOString().split('T')[0] : undefined,
        } as any,
        {
            enabled: !!date && isValidDate,
        }
    );

    // Create a lookup to check if a member has shifts on the same day
    const memberShiftsLookup = useMemo(() => {
        const lookup: Record<string, boolean> = {};
        if (!memberShifts) return lookup;

        // Check all shift assignments
        memberShifts.forEach((shift) => {
            if (shift.shiftAssignments) {
                shift.shiftAssignments.forEach((assignment) => {
                    if (assignment.memberId) {
                        lookup[assignment.memberId] = true;
                    }
                });
            }
        });

        return lookup;
    }, [memberShifts]);

    const excludeLookup = useMemo(() => {
        const lookup: Record<string, boolean> = {};
        if (!exclude) return lookup;
        return exclude.reduce((acc, id) => {
            acc[id] = true;
            return acc;
        }, lookup);
    }, [exclude]);

    const memberOptions = useMemo(() => {
        if (!teamUsers || !userLookup) return [];

        // Flatten all members from all users
        const allMembers = teamUsers.flatMap((user) =>
            (user.members || []).map((member) => ({
                ...member,
                user,
            }))
        );

        return allMembers
            .filter((member) => !excludeLookup[member.id])
            .map((member) => {
                const isAvailable =
                    userAvailabilityListLookup?.[member.id]?.isAvailable ??
                    false;

                // Check if member has shifts on the same day
                const hasShifts = memberShiftsLookup[member.id] || false;

                // Determine availability status:
                // - available: isAvailable is true and no shifts
                // - tentative: isAvailable is true but has shifts
                // - unavailable: isAvailable is false
                const availabilityStatus = isAvailable
                    ? hasShifts
                        ? 'tentative'
                        : 'available'
                    : 'unavailable';

                return {
                    ...member,
                    label: member.name || member.user.name,
                    isAvailable,
                    hasShifts,
                    availabilityStatus,
                };
            });
    }, [
        excludeLookup,
        teamUsers,
        userAvailabilityListLookup,
        userLookup,
        memberShiftsLookup,
    ]);

    //const userAvailabilityList = useUserAvailabilityList(props.date); //.filter(x => !excludeLookup[props.id]);
    //const userOptions = rawUserOptions.filter((x) => !excludeLookup[x.id]);

    function isAvailable(memberId: string) {
        const availData = userAvailabilityListLookup?.[memberId];
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
            options={memberOptions}
            renderOption={(props, rawOption, state) => {
                const option = rawOption as (typeof memberOptions)[0];

                // Determine typography and icon based on availability status
                let Typ;
                let availIcon;

                console.log({ option });

                switch (option.availabilityStatus) {
                    case 'available':
                        Typ = AvailableTextTypography;
                        availIcon = (
                            <ListItemIcon key={props.key + '-icon'}>
                                <EventAvailable color="available" />
                            </ListItemIcon>
                        );
                        break;
                    case 'tentative':
                        Typ = TentativeTextTypography;
                        availIcon = (
                            <ListItemIcon key={props.key + '-icon'}>
                                <Event color={'tentative' as any} />
                            </ListItemIcon>
                        );
                        break;
                    case 'unavailable':
                    default:
                        Typ = UnavailableTextTypography;
                        availIcon = (
                            <ListItemIcon key={props.key + '-icon'}>
                                <EventBusy
                                    key={props.key + '-icon'}
                                    color="unavailable"
                                />
                            </ListItemIcon>
                        );
                        break;
                }
                return (
                    <MenuItem {...props} key={props.key} value={option.id}>
                        {availIcon}
                        <ListItemText
                            key={props.key + '-text'}
                            color={option.availabilityStatus}
                        >
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
