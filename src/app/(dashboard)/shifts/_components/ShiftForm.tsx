import {
    Autocomplete,
    Button,
    Chip,
    Container,
    Grid,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DatePicker, DateTimePicker, TimePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { useForm, Controller } from 'react-hook-form';

import AssignmentIcon from '@mui/icons-material/Assignment';
// import { useFilteredShiftRequests } from '../../store/ShiftRequest';

// Placeholder for useFilteredShiftRequests
const useFilteredShiftRequests = ({
    userId,
    shiftId,
}: {
    userId: string;
    shiftId: string;
}) => ({
    shiftRequests: [],
    ShiftRequest: function (data: any) {
        this.create = async () => ({});
        return this;
    },
});

// import { useLogEntryClass } from '../../store/LogEntry';
// Placeholder for useLogEntryClass
const useLogEntryClass = () => ({
    create: async () => ({}),
    update: async () => ({}),
});
// import { useShiftClass } from '../../store/Shift';
// Placeholder for useShiftClass
const useShiftClass = () => ({
    fromForm: (formData: any) => ({
        validate: () => [],
        create: async () => ({}),
        update: async () => ({}),
        getUnaltered: async () => ({}),
    }),
});
// import {
//     sendShiftCreateLog,
//     sendShiftUpdateLog,
// } from '../../helpers/shiftLogs';
//import useUserAvailabilityList from '../hooks/useUserAvailabilityList';
//import { useShiftDialogHelpers } from '../../context/DialogContext';
//import ShiftAssignmentTool from '../ShiftAssignmentTool/ShiftAssignmentTool';
//import { useFilteredShiftOffers } from '../../store/ShiftOffer';
import {
    useAuthQuery,
    useTeamUsersLookupQuery,
    useTeamUsersQuery,
} from '@/queries/user';

dayjs.extend(customParseFormat);

function sendShiftCreateLog() {}
function sendShiftUpdateLog() {}

// const times = [];
// const ampm = ['am','pm'];
// const hrs = Array(12).fill(0).map((_,i) => i ? i : 12);
// const min = ['00','15','30','45'];
// ampm.forEach(s => {
//     hrs.forEach(h => {
//         min.forEach(m => {
//             //times.push(`${h}:${m}${s}`)
//         })
//     })
// })

// function onlyFifteenMinutesTimepicker() {
//     return (timeValue, clockType) => {
//         if (clockType === 'minutes' && timeValue % 15) {
//             return true;
//         }
//         return false;
//     };
// }

// Placeholder for useUserAvailabilityList hook
function useUserAvailabilityList(date: Date | null) {
    return {}; // Return mock data structure if needed
}

// Placeholder for useShiftDialogHelpers from DialogContext
const useShiftDialogHelpers = () => ({
    reset: () => {
        console.log('Dialog reset called');
    },
});

// Placeholder for ShiftAssignmentTool component
function ShiftAssignmentTool(props: any) {
    return <div>ShiftAssignmentTool Placeholder</div>;
}
// Placeholder for useFilteredShiftOffers hook
const useFilteredShiftOffers = ({ shiftId }: { shiftId: string }) => ({
    shiftOffers: [], // Replace with mock data if necessary
    ShiftOffer: {
        fromForm: (data: any) => ({
            create: async () => {},
            update: async () => {},
            delete: async () => {},
        }),
    },
});

type ShiftFormProps = {
    shiftId?: string;
    shift?: any; // Replace with actual type if available
};

export default function ShiftForm(props: ShiftFormProps) {
    const { reset: handleClose } = useShiftDialogHelpers();
    const { shiftId, shift } = props;

    const LogEntry = useLogEntryClass();

    const defaultValues = {
        id: '',
        title: '',
        location: '',
        date: null,
        startTime: null,
        endTime: null,
        slots: '1',
        notes: '',
        adminNotes: '',
        assignments: [],
    };

    const {
        control,
        handleSubmit,
        formState: { errors },
        setValue,
        getValues,
        watch,
        reset,
        setError,
    } = useForm({
        defaultValues: shift ?? defaultValues,
    });

    const foo = watch();
    console.log({ foo });

    // Helper for setting form errors
    const setErrors = (errorList) => {
        errorList.forEach((err) => {
            setError(err.field, {
                type: 'manual',
                message: err.message,
            });
        });
    };

    const Shift = useShiftClass();

    //const { isNew, user, role } = useAuth();
    const { data: session } = useAuthQuery();
    const user = session?.user;

    const isNew = false;
    const role = user?.role || 'member';

    const isAdmin = ['admin', 'owner'].includes(role);

    const { shiftOffers, ShiftOffer } = useFilteredShiftOffers({ shiftId });
    const [offers, setOffers] = useState([]);
    useEffect(() => {
        if (!offers.length && shiftOffers) {
            setOffers(shiftOffers);
        }
    }, [JSON.stringify(shiftOffers)]);

    const offerLookup = {};
    const shiftOfferLookup = {};

    async function submitShiftOffers() {
        // const offerLookup = {};
        // offers.forEach((x) => (offerLookup[x.id] = true));
        // const shiftOfferLookup = {};
        // shiftOffers.forEach((x) => (shiftOfferLookup[x.id] = true));
        //
        // const deleteOffers = shiftOffers.filter((x) => !offerLookup[x.id]);
        // const addOffers = offers.filter((x) => !shiftOfferLookup[x.id]);
        // const saveOffers = offers.filter((x) => shiftOfferLookup[x.id]);
        //
        // const aProm = addOffers.map((x) =>
        //     ShiftOffer.fromForm({ ...x, shiftId }).create()
        // );
        // const dProm = deleteOffers.map((x) => x.delete());
        // const sProm = saveOffers.map((x) => x.update());
        //
        // await Promise.all([...aProm, ...dProm, ...sProm]);
    }

    async function onNewFormSubmit(formData) {
        const shift = translateFormToData(formData, shiftId);
        const errors = shift.validate();

        if (errors.length) {
            setErrors(errors);
            return;
        }

        const result = await shift.create();

        await sendShiftCreateLog(LogEntry, user, result, shift);
        handleClose();
    }

    async function onUpdateFormSubmit(formData) {
        const shift = translateFormToData(formData);
        const errors = shift.validate();

        if (errors.length) {
            setErrors(errors);
            return;
        }

        shift.id = shiftId;

        await submitShiftOffers(shiftId);

        const before = await shift.getUnaltered();
        await shift.update();
        await sendShiftUpdateLog(LogEntry, user, shiftId, before, shift);

        handleClose();
    }
    const onSubmit = handleSubmit(
        !shiftId || isNew ? onNewFormSubmit : onUpdateFormSubmit
    );

    const { data: teamMembers } = useTeamUsersQuery();
    const { data: userLookup } = useTeamUsersLookupQuery();

    const userId = user?.uid;
    const { shiftRequests, ShiftRequest } = useFilteredShiftRequests({
        userId,
        shiftId,
    });
    //const assignments = getValues('assignments');
    const setAssignments = function (newAssignments) {
        setValue('assignments', newAssignments, { shouldValidate: true });
    };

    const userAvailabilityList = []; //useUserAvailabilityList(form?.date);

    const isAvailable = useCallback(
        (userId) => {
            //const defaultAvail =
            const availData = userAvailabilityList[userId];

            if (availData?.filter((x) => x?.isAvailable === false).length)
                return false;
            if (availData?.filter((x) => x?.isAvailable === true).length)
                return true;

            const user = userLookup && userLookup[userId];
            return user?.isAvailableByDefault;
        },
        [userAvailabilityList, userLookup]
    );
    teamMembers.forEach((tm) => (tm.isAvailable = isAvailable(tm.id)));

    // function translateDataToForm(rawdata) {
    //     const data = { ...rawdata };
    //     data.slots = data.slots || '1';
    //     return data?.toForm ? data.toForm() : data;
    // }
    function translateFormToData(form) {
        return Shift.fromForm(form);
    }

    // useEffect(() => {
    //     if (dialogForm) {
    //         const formData = translateDataToForm(dialogForm);
    //         reset(formData);
    //     }
    // }, [dialogForm, reset]);

    const isAssigned = (getValues('assignments') || []).indexOf(user.uid) >= 0;

    const slots = getValues('slots') || '1';
    const assignments = getValues('assignments') || [];
    const hasAvailableSlots =
        assignments.length === 0 || assignments.length < parseInt(slots);
    const hasRequests = shiftRequests.length > 0;

    async function handleShiftRequest() {
        const newRequest = new ShiftRequest({ userId, shiftId });
        await newRequest.create();
    }

    const date = getValues('date');

    return (
        <Container>
            <form onSubmit={onSubmit}>
                <Stack spacing={2}>
                    {!isAdmin && isAssigned && (
                        <Container>You are assigned to this shift!</Container>
                    )}
                    {!isAdmin &&
                        !isAssigned &&
                        hasAvailableSlots &&
                        hasRequests && (
                            <Container>
                                You have already requested to be considered for
                                this shift.
                            </Container>
                        )}
                    {!isAdmin &&
                        !isAssigned &&
                        hasAvailableSlots &&
                        !hasRequests && (
                            <Container>
                                <Button onClick={handleShiftRequest}>
                                    <AssignmentIcon />
                                    Click here to request this shift!
                                </Button>
                            </Container>
                        )}
                    <Controller
                        name="title"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                disabled={!isAdmin}
                                label="Title"
                                variant="outlined"
                                error={!!errors.title}
                                helperText={errors.title?.message}
                            />
                        )}
                    />
                    <Controller
                        name="location"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                disabled={!isAdmin}
                                label="Location"
                                variant="outlined"
                                error={!!errors.location}
                                helperText={errors.location?.message}
                            />
                        )}
                    />
                    {/*<TextField name="date" label="Date" variant="outlined" onChange={handleInputChange} value={form.date} />*/}
                    <Controller
                        name="date"
                        control={control}
                        render={({ field }) => (
                            <DatePicker
                                disabled={!isAdmin}
                                label="Date"
                                value={
                                    field.value ? dayjs(field.value) : dayjs()
                                }
                                onChange={(date) =>
                                    field.onChange(date ? date.toDate() : null)
                                }
                                slotProps={{
                                    textField: {
                                        error: !!errors.date,
                                        helperText: errors.date?.message,
                                    },
                                }}
                            />
                        )}
                    />
                    <Controller
                        name="startTime"
                        control={control}
                        render={({ field }) => (
                            <TimePicker
                                {...field}
                                disabled={!isAdmin}
                                label="Start Time"
                                value={field.value ? dayjs(field.value) : null}
                                onChange={(date) =>
                                    field.onChange(date ? date.toDate() : null)
                                }
                                //type="time"
                                error={!!errors.startTime}
                                helperText={errors.startTime?.message}
                            />
                        )}
                    />
                    <Controller
                        name="endTime"
                        control={control}
                        render={({ field }) => (
                            <TimePicker
                                {...field}
                                disabled={!isAdmin}
                                label="End Time"
                                value={field.value ? dayjs(field.value) : null}
                                onChange={(date) =>
                                    field.onChange(date ? date.toDate() : null)
                                }
                                //type="time"
                                error={!!errors.endTime}
                                helperText={errors.endTime?.message}
                            />
                        )}
                    />
                    <Grid container spacing={2}>
                        <Grid>
                            <Typography variant="h4">
                                {getValues('assignments')?.length || 0}
                            </Typography>
                        </Grid>
                        <Grid>
                            <div
                                style={{
                                    height: '37px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                of
                            </div>
                        </Grid>

                        <Grid>
                            <Controller
                                name="slots"
                                control={control}
                                render={({ field }) => (
                                    <TextField
                                        {...field}
                                        disabled={!isAdmin}
                                        label="Slots"
                                        variant="outlined"
                                        type="number"
                                        error={!!errors.slots}
                                        helperText={errors.slots?.message}
                                    />
                                )}
                            />
                        </Grid>
                    </Grid>
                    <ShiftAssignmentTool
                        assignments={getValues('assignments')}
                        setAssignments={setAssignments}
                        offers={offers}
                        setOffers={setOffers}
                        readOnly={!isAdmin}
                        date={date}
                    />
                    {/* false && isAdmin && <Autocomplete
                    disabled={!isAdmin}
                    multiple
                    id="assignments"
                    name="assignments"

                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    value={assignments || []}
                    onChange={(event, newValue) => {
                        setAssignments(newValue)
                    }}

                    options={teamMembers}

                    filterOptions={(options) => {
                        return options;
                        return options?.filter(x => form?.assignments?.indexOf(x.id) === -1)
                    }}

                    filterSelectedOptions

                    renderInput={(params) => (
                        <TextField {...params}
                            // variant="filled"
                            label="Assigned Team Members"
                            placeholder="Assigned Team Members"
                        />

                    )}
                    renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                            <Chip variant="outlined" label={option.label} {...getTagProps({ index })} />
                        ))
                    }

                    getOptionDisabled={(option) =>
                        !option.isAvailable
                    }

                /> */}
                    <Controller
                        name="notes"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                multiline
                                disabled={!isAdmin}
                                label="Notes"
                                variant="outlined"
                                error={!!errors.notes}
                                helperText={errors.notes?.message}
                            />
                        )}
                    />
                    {isAdmin && (
                        <Controller
                            name="adminNotes"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    multiline
                                    label="Admin Notes"
                                    variant="outlined"
                                    error={!!errors.adminNotes}
                                    helperText={errors.adminNotes?.message}
                                />
                            )}
                        />
                    )}

                    <Stack direction="row" spacing={2}>
                        {isAdmin && (
                            <Button variant="contained" type="submit">
                                Submit
                            </Button>
                        )}
                        <Button
                            variant="contained"
                            color="secondary"
                            onClick={handleClose}
                        >
                            {isAdmin ? 'Cancel' : 'Close'}
                        </Button>
                    </Stack>
                </Stack>
            </form>
        </Container>
    );
}
