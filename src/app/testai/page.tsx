'use client';

import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Container,
  Grid,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { useParseShiftMutation } from '@/queries/ai';

export default function TestAiPage() {
  const [text, setText] = useState('Opening shift tomorrow 8am-4pm at Main Store. Need 2 people.');
  
  const { mutate, data, isPending, error } = useParseShiftMutation();

  const pretty = useMemo(() => {
    if (data === undefined) return '';
    try {
      return JSON.stringify(data, null, 2);
    } catch (e) {
      return String(data);
    }
  }, [data]);

  const onSubmit = () => {
    mutate({ input: text });
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        AI Parse Shift Tester
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Enter freeform shift text below, then click Parse. The result from tRPC `ai.parseShift` will be shown as formatted JSON.
      </Typography>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <TextField
            label="Shift text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            fullWidth
            minRows={4}
            multiline
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Box display="flex" gap={2}>
            <Button variant="contained" onClick={onSubmit} disabled={isPending}>
              {isPending ? 'Parsing…' : 'Parse'}
            </Button>
          </Box>
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Typography variant="h6" gutterBottom>
            Result
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.paper' }}>
            {error ? (
              <Typography color="error">{error.message}</Typography>
            ) : pretty ? (
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{pretty}</pre>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No result yet. Submit some text to parse.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
}
