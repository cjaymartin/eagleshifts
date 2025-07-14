import React from 'react';
import { Grid, IconButton, TableCell, TableRow } from '@mui/material';
import { AddBox } from '@mui/icons-material';
import TeamMemberAutocomplete from '@/components/form/TeamMemberAutocomplete';

export type NewTeamMemberRowProps = {
    exclude?: string[];
    onAdd: (memberId: string) => void;
    date?: Date;
};

export default function NewTeamMemberRow(props: NewTeamMemberRowProps) {
    const { exclude, onAdd, date } = props;
    const [member, setMember] = React.useState(null as { id: string } | null);

    const onSubmit = () => {
        if (member?.id) {
            onAdd(member.id);
            setMember(null);
        }
    };

    return (
        <TableRow>
            <TableCell colSpan={3}>
                <Grid container>
                    <Grid size={6}>
                        {!!date && (
                            <TeamMemberAutocomplete
                                value={member}
                                onChange={(member) => {
                                    setMember(member ?? null);
                                }}
                                // variant="standard"
                                size="small"
                                exclude={exclude}
                                date={date}
                            />
                        )}
                    </Grid>
                    <Grid>
                        {member && (
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
