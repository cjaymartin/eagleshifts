'use client';

import {
    createTheme,
    PaletteOptions,
    TypographyVariantsOptions,
} from '@mui/material';
import { green, grey, indigo, red, teal, yellow } from '@mui/material/colors';

console.log('LET US BUILD THE THEME');

export const theme = createTheme({
    cssVariables: true,
    colorSchemes: {
        light: true,
        dark: false,
    },
    // Force light mode at all times
    palette: {
        mode: 'light',
        primary: {
            // Purple and green play nicely together.
            main: indigo[700],
        },
        secondary: {
            // This is green.A700 as hex.
            main: teal[600],
        },
        green: {
            main: green[800],
        },
        yellow: {
            main: yellow[700],
        },
        red: {
            main: red.A700,
        },

        available: {
            main: grey[700],
        },
        unavailable: {
            main: grey[400],
        },
    } as PaletteOptions,
    components: {
        MuiTableCell: {
            styleOverrides: {
                head: {
                    fontWeight: 'bold',
                },
            },
        },
        MuiTableHead: {
            styleOverrides: {
                root: {
                    backgroundColor: indigo[100],
                },
            },
        },
    },
    typography: {
        available: {
            main: grey[800],
        },
        unavailable: {
            main: grey[200],
        },
    } as TypographyVariantsOptions,
});

console.log('BUILT THEME');
console.dir({ theme });

export default theme;
