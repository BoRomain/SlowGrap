import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Box,
  Button,
  CssBaseline,
  Paper,
  Slider,
  Stack,
  Switch,
  ThemeProvider,
  Typography,
  createTheme,
} from "@mui/material";

const DEFAULTS = {
  enabled: true,
  speed: 1,
  preservePitch: false,
  reverb: 0,
  eq: [0, 0, 0, 0, 0],
};
const EQ_LABELS = ["60", "250", "1k", "4k", "12k"];
const ACCENT = "#6d72ff";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: ACCENT },
    background: { default: "#0c0c10", paper: "#15151b" },
    divider: "rgba(255,255,255,0.06)",
    text: { secondary: "rgba(255,255,255,0.5)" },
  },
  typography: {
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    fontSize: 13,
    button: { textTransform: "none", fontWeight: 500 },
  },
  shape: { borderRadius: 14 },
  components: {
    MuiSlider: {
      styleOverrides: {
        rail: { opacity: 0.12 },
        track: { border: "none" },
        thumb: {
          width: 14,
          height: 14,
          backgroundColor: "#fff",
          "&::before": { boxShadow: "0 1px 3px rgba(0,0,0,0.5)" },
          "&:hover, &.Mui-focusVisible, &.Mui-active": {
            boxShadow: "0 0 0 6px rgba(109,114,255,0.2)",
          },
        },
      },
    },
    // Compact iOS-style switch.
    MuiSwitch: {
      defaultProps: { disableRipple: true },
      styleOverrides: {
        root: { width: 34, height: 20, padding: 0 },
        switchBase: {
          padding: 2,
          "&.Mui-checked": {
            transform: "translateX(14px)",
            color: "#fff",
            "& + .MuiSwitch-track": { opacity: 1 },
          },
        },
        thumb: { width: 16, height: 16, boxShadow: "none" },
        track: { borderRadius: 10, opacity: 1, backgroundColor: "rgba(255,255,255,0.14)" },
      },
    },
  },
});

// Per-tab: settings are pushed to the active tab's content script, not stored globally.
const tabP =
  chrome.tabs?.query({ active: true, currentWindow: true }).then((t) => t[0]?.id) ??
  Promise.resolve(); // ?. so the page also renders outside the extension

function Section({ title, value, children }) {
  return (
    <Paper variant="outlined" sx={{ px: 2, py: 1.5 }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "baseline" }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}
        >
          {title}
        </Typography>
        <Typography sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {value}
        </Typography>
      </Stack>
      {children}
    </Paper>
  );
}

function App() {
  const [s, setS] = useState(DEFAULTS);

  useEffect(() => {
    tabP
      .then((id) => chrome.tabs.sendMessage(id, { type: "get" }, { frameId: 0 }))
      .then((r) => setS({ ...DEFAULTS, ...r }))
      .catch(() => {});
  }, []);

  const save = async (next) => {
    setS(next);
    chrome.tabs.sendMessage(await tabP, { type: "set", settings: next }).catch(() => {});
  };
  const set = (patch) => save({ ...s, ...patch });

  return (
    <Box sx={{ width: 300, p: 2 }}>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "center", mb: 2, px: 0.5 }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: 16, letterSpacing: "-0.01em" }}>
          SlowGrap
        </Typography>
        <Switch
          checked={s.enabled}
          onChange={(e) => set({ enabled: e.target.checked })}
        />
      </Stack>

      <Stack
        spacing={1}
        sx={{
          opacity: s.enabled ? 1 : 0.4,
          pointerEvents: s.enabled ? "auto" : "none",
          transition: "opacity .2s",
        }}
      >
        <Section title="Speed" value={s.speed.toFixed(2) + "×"}>
          <Slider
            value={s.speed}
            min={0.5}
            max={1.2}
            step={0.01}
            onChange={(_, v) => set({ speed: v })}
          />
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Preserve pitch
            </Typography>
            <Switch
              checked={s.preservePitch}
              onChange={(e) => set({ preservePitch: e.target.checked })}
            />
          </Stack>
        </Section>

        <Section title="Reverb" value={Math.round(s.reverb * 100) + "%"}>
          <Slider
            value={s.reverb}
            min={0}
            max={1}
            step={0.01}
            onChange={(_, v) => set({ reverb: v })}
          />
        </Section>

        <Section title="Equalizer" value="dB">
          <Stack direction="row" sx={{ justifyContent: "space-between", mt: 1.5 }}>
            {EQ_LABELS.map((label, i) => (
              <Stack key={label} spacing={1} sx={{ alignItems: "center", height: 136 }}>
                <Typography variant="caption" sx={{ fontVariantNumeric: "tabular-nums" }}>
                  {(s.eq[i] > 0 ? "+" : "") + s.eq[i]}
                </Typography>
                <Slider
                  orientation="vertical"
                  track={false}
                  value={s.eq[i]}
                  min={-12}
                  max={12}
                  step={1}
                  onChange={(_, v) => {
                    const eq = [...s.eq];
                    eq[i] = v;
                    set({ eq });
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {label}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Section>
      </Stack>

      <Button
        fullWidth
        size="small"
        color="inherit"
        sx={{ mt: 1, color: "text.secondary" }}
        onClick={() => save({ ...DEFAULTS })}
      >
        Reset
      </Button>
    </Box>
  );
}

createRoot(document.getElementById("root")).render(
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <App />
  </ThemeProvider>,
);
