import React from 'react';
import { Grid, IconButton, TableCell, TableRow } from '@mui/material';
import { AddBox } from '@mui/icons-material';
import TeamMemberAutocomplete from '@/components/form/TeamMemberAutocomplete';

export type NewTeamMemberRowProps = {
    exclude?: string[];
    onAdd: (userId: string) => void;
    date?: Date;
};

export default function NewTeamMemberRow(props: NewTeamMemberRowProps) {
    const { exclude, onAdd, date } = props;
    const [user, setUser] = React.useState(null as { id: string } | null);

    const onSubmit = () => {
        if (user?.id) {
            onAdd(user.id);
            setUser(null);
        }
    };

    return (
        <TableRow>
            <TableCell colSpan={3}>
                <Grid container>
                    <Grid size={6}>
                        {!!date && (
                            <TeamMemberAutocomplete
                                value={user}
                                onChange={(user) => {
                                    setUser(user ?? null);
                                }}
                                // variant="standard"
                                size="small"
                                exclude={exclude}
                                date={date}
                            />
                        )}
                    </Grid>
                    <Grid>
                        {user && (
                            <IconButton onClick={() => onSubmit()}>
                                <AddBox color="primary" />
                            </IconButton>
                        )}
                    </Grid>
                </Grid>
            </TableCell>
        </TableRow>
    );
}
