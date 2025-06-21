"use client";

import {createTheme, PaletteOptions, TypographyVariantsOptions} from "@mui/material";
import {green, grey, indigo, red, teal, yellow} from "@mui/material/colors";

export const theme = createTheme({
  cssVariables: true,
  palette: {
    //mode: 'dark',
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
      main: grey[700]
    },
    unavailable: {
      main: grey[400]
    },
  } as PaletteOptions,
  components: {
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 'bold',
        }
      }
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: indigo[100],
        },
      }
    },
  },
  typography: {
    available: {
      main: grey[800]
    },
    unavailable: {
      main: grey[200]
    },
  } as TypographyVariantsOptions
});