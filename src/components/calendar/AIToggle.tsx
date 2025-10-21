import React from 'react';
import { 
  FormControlLabel, 
  Switch, 
  Tooltip, 
  Box, 
  Typography,
  CircularProgress
} from '@mui/material';
import { trpc } from '@/lib/trpc/client';
import SmartToyIcon from '@mui/icons-material/SmartToy';

interface AIToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

/**
 * A toggle component for enabling/disabling AI-assisted shift entry
 * Only visible to administrators and disabled if OpenAI API is not configured
 * or if the organization has reached its daily limit
 */
export default function AIToggle({ enabled, onChange }: AIToggleProps) {
  // Check if the AI feature is available
  const { data: aiAvailability, isLoading } = trpc.ai.isAvailable.useQuery();
  
  // If the data is loading, show a loading indicator
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" sx={{ ml: 1 }}>
          Checking AI availability...
        </Typography>
      </Box>
    );
  }
  
  // If the AI feature is not available, don't render the toggle
  if (!aiAvailability?.available) {
    return null;
  }
  
  const tooltipTitle = aiAvailability?.reason 
    ? `AI feature is disabled: ${aiAvailability.reason}`
    : "Toggle between AI-assisted and traditional shift creation";
  
  return (
    <Tooltip title={tooltipTitle}>
      <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
        <SmartToyIcon sx={{ mr: 1, color: enabled ? 'primary.main' : 'text.disabled' }} />
        <FormControlLabel
          control={
            <Switch
              checked={enabled}
              onChange={(e) => onChange(e.target.checked)}
              disabled={!aiAvailability?.available}
            />
          }
          label="AI Shift Entry"
        />
      </Box>
    </Tooltip>
  );
}