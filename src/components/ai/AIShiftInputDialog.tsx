import React, { useState } from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Typography,
    Box,
    CircularProgress
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

interface AIShiftInputDialogProps {
    open: boolean;
    onClose: () => void;
    onParse: (text: string) => void;
    isParsing: boolean;
    defaultDate?: Date;
}

export default function AIShiftInputDialog({
    open,
    onClose,
    onParse,
    isParsing,
    defaultDate
}: AIShiftInputDialogProps) {
    const [text, setText] = useState('');

    const handleSubmit = () => {
        if (text.trim()) {
            onParse(text);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && e.metaKey) {
            handleSubmit();
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoAwesomeIcon color="primary" />
                Create Shift with AI
            </DialogTitle>
            <DialogContent>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        Describe your shift in natural language.
                        {defaultDate && (
                            <span>
                                {' '}Defaults to <strong>{defaultDate.toLocaleDateString()}</strong>.
                            </span>
                        )}
                    </Typography>
                </Box>
                <TextField
                    autoFocus
                    margin="dense"
                    id="shift-description"
                    label="Shift Description"
                    type="text"
                    fullWidth
                    multiline
                    minRows={4}
                    variant="outlined"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g., Bartender at Main Bar tomorrow 5pm-1am. Need 2 people."
                    disabled={isParsing}
                />
            </DialogContent>
            <DialogActions>
                <Button 
                    onClick={handleSubmit} 
                    variant="contained" 
                    disabled={!text.trim() || isParsing}
                    startIcon={isParsing ? <CircularProgress size={20} color="inherit" /> : <AutoAwesomeIcon />}
                >
                    {isParsing ? 'Parsing...' : 'Next'}
                </Button>
                <Button onClick={onClose} disabled={isParsing}>Cancel</Button>
            </DialogActions>
        </Dialog>
    );
}
