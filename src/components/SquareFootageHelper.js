import React, { useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Divider, Stack, TextField, Typography } from "@mui/material";
import StraightenRoundedIcon from "@mui/icons-material/StraightenRounded";

const EXAMPLE_DIMENSIONS = [[5, 5], [5, 10], [10, 10], [10, 20], [20, 20]];

export default function SquareFootageHelper({ onUseEstimate, disabled = false }) {
  const [open, setOpen] = useState(false);
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const hasDimensions = length !== "" && width !== "";
  const area = Number(length) * Number(width);
  const estimate = Math.max(1, Math.round(area));
  const validEstimate = hasDimensions && Number(length) > 0 && Number(width) > 0 &&
    Number.isFinite(area) && area > 0 && estimate <= 2147483647;

  function applyEstimate(value) {
    onUseEstimate(value);
    setOpen(false);
  }

  return <>
    <Button type="button" size="small" startIcon={<StraightenRoundedIcon />} disabled={disabled}
      onClick={() => setOpen(true)} sx={{ alignSelf: "flex-start" }}>Help estimate square footage</Button>
    <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm" aria-labelledby="square-footage-help-title">
      <DialogTitle id="square-footage-help-title">Estimate your space</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Typography color="text.secondary">A rough estimate is fine. Use the usable floor area you plan to rent out, rather than the whole building.</Typography>
          <Box>
            <Typography sx={{ fontWeight: 800, mb: 0.5 }}>Length × width = square feet</Typography>
            <Typography variant="body2" color="text.secondary">Measure or estimate both sides in feet. For an irregular space, split it into rectangles and add their areas.</Typography>
          </Box>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
            <TextField label="Length (feet)" type="number" value={length} onChange={e => setLength(e.target.value)}
              slotProps={{ htmlInput: { min: 0, step: "any" } }} fullWidth />
            <TextField label="Width (feet)" type="number" value={width} onChange={e => setWidth(e.target.value)}
              slotProps={{ htmlInput: { min: 0, step: "any" } }} fullWidth />
          </Box>
          {validEstimate ? <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 2 }}>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>About {estimate.toLocaleString()} sq ft</Typography>
            <Typography variant="caption" color="text.secondary">Rounded to the nearest whole square foot, with a minimum of 1 sq ft.</Typography>
          </Box> : hasDimensions ? <Alert severity="info">Enter positive dimensions to calculate a usable estimate.</Alert> : null}
          <Button type="button" variant="contained" onClick={() => applyEstimate(estimate)} disabled={!validEstimate || disabled}>Use this estimate</Button>
          <Divider />
          <Box>
            <Typography sx={{ fontWeight: 800, mb: 0.5 }}>Example sizes</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Choose one if it is close to your space. You can adjust the square footage afterward.</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1 }}>
              {EXAMPLE_DIMENSIONS.map(([l, w]) => <Button key={`${l}-${w}`} type="button" variant="outlined" disabled={disabled}
                onClick={() => applyEstimate(l * w)} sx={{ py: 1, whiteSpace: "normal" }}>{l} × {w} ft · {l * w} sq ft</Button>)}
            </Box>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions><Button type="button" onClick={() => setOpen(false)}>Close</Button></DialogActions>
    </Dialog>
  </>;
}
