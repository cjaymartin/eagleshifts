import * as React from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { useState } from 'react';

interface ForgotPasswordProps {
  open: boolean;
  handleClose: () => void;
}

export default function ForgotPassword({ open, handleClose }: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setEmailError(true);
      setEmailErrorMessage('Please enter a valid email address.');
      return;
    }

    setEmailError(false);
    setEmailErrorMessage('');
    setSubmitted(true);

    // Here you would typically call your password reset API
    console.log('Password reset request for:', email);

    // Close dialog after 3 seconds
    setTimeout(() => {
      handleClose();
      setSubmitted(false);
      setEmail('');
    }, 3000);
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Reset Password</DialogTitle>
      <DialogContent>
        {!submitted ? (
          <React.Fragment>
            <DialogContentText>
              To reset your password, please enter your email address here.
              We will send you a link to create a new password.
            </DialogContentText>
            <TextField
              autoFocus
              margin="dense"
              id="reset-email"
              label="Email Address"
              type="email"
              fullWidth
              variant="outlined"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailError}
              helperText={emailErrorMessage}
            />
          </React.Fragment>
        ) : (
          <DialogContentText>
            If an account exists with this email, we&apos;ve sent you instructions on how to reset your password.
          </DialogContentText>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        {!submitted && (
          <Button onClick={handleSubmit} variant="contained">
            Reset Password
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
