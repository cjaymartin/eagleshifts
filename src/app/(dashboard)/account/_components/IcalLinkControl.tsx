'use client';

import React from 'react';
import { Button, TextField, Box, Typography, Paper, IconButton } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useUserIcalLinkQuery, useRegenerateUserIcalLinkMutation } from '@/queries/team';
import { useNotifications } from '@toolpad/core';

export default function IcalLinkControl() {
  const { data: icalData, isLoading } = useUserIcalLinkQuery();
  const regenerateIcalMutation = useRegenerateUserIcalLinkMutation();
  const notifications = useNotifications();

  const handleCopyLink = () => {
    if (icalData?.icalLink) {
      navigator.clipboard.writeText(icalData.icalLink);
      notifications.show('iCal link copied to clipboard', {
        severity: 'success',
        autoHideDuration: 3000,
      });
    }
  };

  const handleRegenerateLink = async () => {
    try {
      await regenerateIcalMutation.mutateAsync();
      notifications.show('iCal link regenerated successfully', {
        severity: 'success',
        autoHideDuration: 3000,
      });
    } catch (error) {
      notifications.show('Failed to regenerate iCal link', {
        severity: 'error',
        autoHideDuration: 3000,
      });
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Box sx={{ mt: 2, mb: 4 }}>
      <Typography variant="body1" sx={{ mb: 2 }}>
        Use this link to subscribe to your shifts in calendar applications like Google Calendar, 
        Apple Calendar, or Microsoft Outlook.
      </Typography>
      
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TextField
            fullWidth
            value={icalData?.icalLink || ''}
            InputProps={{
              readOnly: true,
            }}
            variant="outlined"
            size="small"
          />
          <IconButton onClick={handleCopyLink} color="primary" sx={{ ml: 1 }}>
            <ContentCopyIcon />
          </IconButton>
        </Box>
      </Paper>
      
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Button 
          variant="outlined" 
          startIcon={<RefreshIcon />}
          onClick={handleRegenerateLink}
          disabled={regenerateIcalMutation.isPending}
        >
          Regenerate Link
        </Button>
        <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
          Warning: Regenerating will invalidate the previous link.
        </Typography>
      </Box>
    </Box>
  );
}