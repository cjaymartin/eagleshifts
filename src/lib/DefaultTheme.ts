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

declare module '@mui/material/styles' {
    interface Palette {
        yellow: Palette['primary'];
        green: Palette['primary'];
        red: Palette['primary'];
        available: Palette['primary'];
        unavailable: Palette['primary'];
    }
    interface PaletteOptions {
        yellow?: PaletteOptions['primary'];
        green?: PaletteOptions['primary'];
        red?: PaletteOptions['primary'];
        available?: PaletteOptions['primary'];
        unavailable?: PaletteOptions['primary'];
    }
}

declare module '@mui/material/SvgIcon' {
    interface SvgIconPropsColorOverrides {
        yellow: true;
        green: true;
        red: true;
        available: true;
        unavailable: true;
    }
}

export default theme;
