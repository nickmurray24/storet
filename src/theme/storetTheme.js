import { createTheme } from "@mui/material/styles";

const storetTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#2563eb",
      dark: "#1d4ed8",
      light: "#60a5fa",
    },
    secondary: {
      main: "#14b8a6",
      dark: "#0f766e",
      light: "#5eead4",
    },
    background: {
      default: "#f8fafc",
      paper: "#ffffff",
    },
    text: {
      primary: "#0f172a",
      secondary: "#64748b",
    },
    success: {
      main: "#16a34a",
    },
    warning: {
      main: "#f59e0b",
    },
    error: {
      main: "#dc2626",
    },
  },
  typography: {
    fontFamily: `"Roboto", "Inter", "Arial", sans-serif`,
    h1: {
      fontWeight: 800,
      letterSpacing: "-0.04em",
    },
    h2: {
      fontWeight: 800,
      letterSpacing: "-0.035em",
    },
    h3: {
      fontWeight: 700,
      letterSpacing: "-0.03em",
    },
    h4: {
      fontWeight: 700,
      letterSpacing: "-0.025em",
    },
    h5: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 700,
    },
    button: {
      textTransform: "none",
      fontWeight: 700,
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          boxShadow: "none",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
      },
    },
  },
});

export default storetTheme;