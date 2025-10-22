import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    CircularProgress,
    Alert,
    Box,
} from '@mui/material';
import { trpc } from '@/lib/trpc/client';
import AIShiftConfirmationDialog from './AIShiftConfirmationDialog';

interface AIShiftTextModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (parsedShift: any) => void;
    date: Date;
}

/**
 * A modal dialog for entering shift details in free-form text
 * Uses AI to parse the text and extract shift details
 */
export default function AIShiftTextModal({
    open,
    onClose,
    onSubmit,
    date,
}: AIShiftTextModalProps) {
    // State for the text input
    const [text, setText] = useState('');

    // State for error handling
    const [error, setError] = useState<string | null>(null);

    // State for confirmation dialog
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [parsedShiftData, setParsedShiftData] = useState<any>(null);

    // Get the parseShiftText mutation
    const parseShiftTextMutation = trpc.ai.parseShiftText.useMutation({
        onSuccess: (data) => {
            // Clear any previous errors
            setError(null);

            // Store the parsed shift data and show the confirmation dialog
            setParsedShiftData(data);
            setShowConfirmation(true);
        },
        onError: (err) => {
            // Set the error message
            setError(err.message || 'Failed to parse shift text');
        },
    });

    // Handle form submission
    const handleSubmit = () => {
        // Clear any previous errors
        setError(null);

        // Call the mutation to parse the text
        parseShiftTextMutation.mutate({
            text,
            date: date.toISOString(),
        });
    };

    // Handle dialog close
    const handleClose = () => {
        // Reset the form state
        setText('');
        setError(null);
        parseShiftTextMutation.reset();

        // Call the onClose callback
        onClose();
    };

    // Handle confirmation dialog close
    const handleConfirmationClose = () => {
        setShowConfirmation(false);
        setParsedShiftData(null);
    };

    // Example text for the placeholder
    const placeholderText =
        'Enter shift details in plain text. For example:\n' +
        'John works at Downtown Store from 9am to 5pm on break from 12-1pm.\n' +
        'Or: Shift at Main Office needs 3 people from 2-10pm.';

    return (
        <>
            <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
                <DialogTitle>Enter Shift Details</DialogTitle>

                <DialogContent>
                    {/* Show error message if there is one */}
                    {error && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    <TextField
                        autoFocus
                        multiline
                        rows={6}
                        fullWidth
                        variant="outlined"
                        placeholder={placeholderText}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        disabled={parseShiftTextMutation.isPending}
                        margin="normal"
                    />

                    {/* Show a loading indicator during processing */}
                    {parseShiftTextMutation.isPending && (
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'center',
                                mt: 2,
                            }}
                        >
                            <CircularProgress size={24} data-testid="loading-indicator" />
                        </Box>
                    )}
                </DialogContent>

                <DialogActions>
                    <Button
                        onClick={handleClose}
                        disabled={parseShiftTextMutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!text.trim() || parseShiftTextMutation.isPending}
                        variant="contained"
                    >
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirmation Dialog */}
            {parsedShiftData && (
                <AIShiftConfirmationDialog
                    open={showConfirmation}
                    onClose={handleConfirmationClose}
                    parsedShift={parsedShiftData}
                    entityMatches={parsedShiftData.entityMatches}
                />
            )}
        </>
    );
}
