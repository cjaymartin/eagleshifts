import React from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Autocomplete,
    Button,
    Container,
    Grid,
    TextField,
    Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useForm, Controller } from 'react-hook-form';
import dayjs from 'dayjs';
import { useAuthQuery, useTeamUsersQuery } from '@/queries/user';
import { PickerValue } from '@mui/x-date-pickers/internals';

const defaultFilters: ShiftFormFilterSchema = {
    title: '',
    location: '',
    startDate: null as Date | null,
    endDate: null as Date | null,
    assigned: null,
    unfilled: { label: 'Any', id: 'any' },
};

type ShiftFormFilterSchema = {
    title: string;
    location: string;
    startDate: Date | null;
    endDate: Date | null;
    assigned: { id: string; name: string } | null;
    unfilled: { label: string; id: string };
};

export type ShiftFilterSchema = {
    title: string;
    location: string;
    startDate: Date | undefined;
    endDate: Date | undefined;
    assigned: string | undefined;
    unfilled: string;
};

export function ShiftFilters({
    filters = defaultFilters,
    setFilters,
}: {
    filters?: ShiftFormFilterSchema;
    setFilters: (filters: ShiftFilterSchema) => void;
}) {
    const { data: session } = useAuthQuery();
    const role = session?.user?.role ?? 'guest';
    const isAdmin = ['admin', 'owner'].includes(role);

    const { data: teamMembers } = useTeamUsersQuery();

    const { control, handleSubmit, reset, formState } =
        useForm<ShiftFormFilterSchema>({
            defaultValues: filters,
        });

    const onSubmit = (data: ShiftFormFilterSchema) => {
        // Format date fields
        const formattedFilters: ShiftFilterSchema = {
            ...data,
            startDate: data.startDate
                ? dayjs(data.startDate).toDate()
                : undefined,
            endDate: data.endDate ? dayjs(data.endDate).toDate() : undefined,
            assigned: data.assigned?.id ?? undefined,
            unfilled: data.unfilled?.id,
        };
        setFilters(formattedFilters);
        setTimeout(() => {
            reset(
                {},
                { keepValues: true, keepDirty: false, keepSubmitCount: true }
            );
        }, 50);
    };

    const handleRemoveFilters = () => {
        reset(defaultFilters);
        onSubmit(defaultFilters);
    };

    //todo: WHY does formState.isDirty not work?  It sets false, but then comes back and sets true on its own
    const isFormDirty = Object.keys(formState.dirtyFields).length > 0;
    const isFormEmpty = formState.submitCount == 0;

    return (
        <Container sx={{ p: 2 }}>
            <Accordion sx={{ m: 4, ml: 0, mr: 0, background: '#ffffee' }}>
                <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="panel2a-content"
                    id="panel2a-header"
                >
                    <Typography>Filters</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <Grid container spacing={2}>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <Controller
                                    name="title"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Title"
                                            variant="outlined"
                                            fullWidth
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <Controller
                                    name="location"
                                    control={control}
                                    render={({ field }) => (
                                        <TextField
                                            {...field}
                                            label="Location"
                                            variant="outlined"
                                            fullWidth
                                        />
                                    )}
                                />
                            </Grid>
                            {isAdmin && (
                                <Grid size={{ xs: 12, sm: 4 }}>
                                    <Controller
                                        name="assigned"
                                        control={control}
                                        render={({ field }) => (
                                            <Autocomplete
                                                {...field}
                                                options={teamMembers || []}
                                                isOptionEqualToValue={(
                                                    option,
                                                    value
                                                ) => option.id === value.id}
                                                getOptionLabel={(option) =>
                                                    option.name || ''
                                                }
                                                onChange={(_, value) =>
                                                    field.onChange(value)
                                                }
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label="Assigned"
                                                        placeholder="Choose One"
                                                    />
                                                )}
                                            />
                                        )}
                                    />
                                </Grid>
                            )}
                            <Grid size={{ xs: 12, sm: 4 }}>
                                <Controller
                                    name="unfilled"
                                    control={control}
                                    render={({ field }) => (
                                        <Autocomplete
                                            {...field}
                                            options={[
                                                { label: 'Any', id: 'any' },
                                                {
                                                    label: 'Open',
                                                    id: 'unfilled',
                                                },
                                                isAdmin
                                                    ? {
                                                          label: 'Filled',
                                                          id: 'filled',
                                                      }
                                                    : {
                                                          label: 'Mine',
                                                          id: 'mine',
                                                      },
                                            ]}
                                            isOptionEqualToValue={(
                                                option,
                                                value
                                            ) => option.id === value.id}
                                            getOptionLabel={(option) =>
                                                option?.label || ''
                                            }
                                            onChange={(_, value) =>
                                                field.onChange(value)
                                            }
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="Status"
                                                    placeholder="Choose One"
                                                />
                                            )}
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 6, sm: 4 }}>
                                <Controller
                                    name="startDate"
                                    control={control}
                                    render={({ field }) => (
                                        <DatePicker
                                            {...field}
                                            value={
                                                field.value
                                                    ? dayjs(field.value)
                                                    : null
                                            }
                                            onChange={(date) =>
                                                field.onChange(date?.toDate())
                                            }
                                            slotProps={{
                                                field: { clearable: true },
                                            }}
                                            label="Start Date"
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={{ xs: 6, sm: 4 }}>
                                <Controller
                                    name="endDate"
                                    control={control}
                                    render={({ field }) => (
                                        <DatePicker
                                            {...field}
                                            value={
                                                (field.value || null) as
                                                    | PickerValue
                                                    | undefined
                                            }
                                            onChange={(date) =>
                                                field.onChange(date)
                                            }
                                            slotProps={{
                                                field: { clearable: true },
                                            }}
                                            label="End Date"
                                        />
                                    )}
                                />
                            </Grid>
                            <Grid size={4}>
                                <Grid container spacing={1}>
                                    <Grid>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            type="submit"
                                        >
                                            Apply
                                        </Button>
                                    </Grid>
                                    {isFormDirty && (
                                        <Grid>
                                            <Button
                                                variant="contained"
                                                color="secondary"
                                                onClick={() =>
                                                    reset(filters, {
                                                        keepDirty: false,
                                                        keepSubmitCount: true,
                                                    })
                                                }
                                            >
                                                Cancel
                                            </Button>
                                        </Grid>
                                    )}
                                    {!isFormEmpty && !isFormDirty && (
                                        <Grid>
                                            <Button
                                                variant="contained"
                                                color="secondary"
                                                onClick={handleRemoveFilters}
                                            >
                                                Remove Filters
                                            </Button>
                                        </Grid>
                                    )}
                                </Grid>
                            </Grid>
                        </Grid>
                    </form>
                </AccordionDetails>
            </Accordion>
        </Container>
    );
}
