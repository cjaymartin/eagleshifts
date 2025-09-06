'use client';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';

export function ClientLocalizationProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <LocalizationProvider dateAdapter={AdapterLuxon}>
            {children}
        </LocalizationProvider>
    );
}
