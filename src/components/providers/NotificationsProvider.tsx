'use client';

import React from 'react';
import { SnackbarProvider as NotistackProvider, useSnackbar, SnackbarKey } from 'notistack';
import { SnackbarOrigin } from '@mui/material';

// Create a context to mimic the toolpad useNotifications API
type NotificationsContextType = {
  show: (message: string, options?: {
    severity?: 'success' | 'info' | 'warning' | 'error';
    autoHideDuration?: number;
  }) => SnackbarKey;
};

const NotificationsContext = React.createContext<NotificationsContextType | null>(null);

// Custom hook that mimics the toolpad useNotifications API
export function useNotifications() {
  const context = React.useContext(NotificationsContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationsProvider');
  }
  return context;
}

type NotificationsProviderProps = {
  children: React.ReactNode;
  slotProps?: {
    snackbar?: {
      anchorOrigin?: SnackbarOrigin;
    };
  };
};

// NotificationsProvider component that wraps notistack's SnackbarProvider
export function NotificationsProvider({ children, slotProps }: NotificationsProviderProps) {
  // Default anchor origin to match the original toolpad provider
  const anchorOrigin = slotProps?.snackbar?.anchorOrigin || {
    vertical: 'bottom',
    horizontal: 'left',
  };

  return (
    <NotistackProvider
      maxSnack={3}
      anchorOrigin={anchorOrigin}
      autoHideDuration={3000}
    >
      <NotificationsProviderContent>
        {children}
      </NotificationsProviderContent>
    </NotistackProvider>
  );
}

// Inner component that provides the context value
function NotificationsProviderContent({ children }: { children: React.ReactNode }) {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  // Create the context value that mimics the toolpad useNotifications API
  const contextValue = React.useMemo(() => {
    return {
      show: (message: string, options?: {
        severity?: 'success' | 'info' | 'warning' | 'error';
        autoHideDuration?: number;
      }) => {
        return enqueueSnackbar(message, {
          variant: options?.severity || 'default',
          autoHideDuration: options?.autoHideDuration || 3000,
        });
      }
    };
  }, [enqueueSnackbar]);

  return (
    <NotificationsContext.Provider value={contextValue}>
      {children}
    </NotificationsContext.Provider>
  );
}