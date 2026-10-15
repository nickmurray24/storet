import React, { useState } from "react";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";
import AvailabilityCalendar from "./AvailabilityCalendar";
import useListingAvailability from "../hooks/useListingAvailability";
import { useOptionalStoretApp } from "../context/StoretAppContext";
import { listingAvailabilityService, availabilityError } from "../services/listingAvailabilityService";
import { addCalendarMonth, addDateDays, isDateKey, rentalDays, todayKey, validateRentalAvailability } from "../utils/rentalDates";
export default function ListingCalendarManager({ listing }) {
  const [open, setOpen] = useState(false);
  return <><Button size="small" variant="outlined" onClick={() => setOpen(true)}>Calendar</Button>
    {open && <CalendarDialog listing={listing} onClose={() => setOpen(false)} />}</>;
}
function CalendarDialog({ listing, onClose }) {
  const app = useOptionalStoretApp();
  const availability = useListingAvailability(listing.id, app?.bookingRequests || []);
  const [blocks, setBlocks] = useState([]), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [start, setStart] = useState(""), [end, setEnd] = useState(""), [preset, setPreset] = useState("week"), [reason, setReason] = useState("");
  const [blocksLoading, setBlocksLoading] = useState(true);
  React.useEffect(() => {
    let active = true;
    listingAvailabilityService.getHostBlocks(listing.id).then(result => {
      if (active) { setBlocks(result.data || []); setBlocksLoading(false); if (result.error) setError(availabilityError(result.error)); }
    }).catch(e => { if (active) { setBlocksLoading(false); setError(availabilityError(e)); } });
    return () => { active = false; };
  }, [listing.id]);
  const endFor = (day, value) => !isDateKey(day) ? "" : value === "month" ? addCalendarMonth(day) : value === "week" ? addDateDays(day, 7) : value === "day" ? addDateDays(day, 1) : end;
  async function reload() {
    await availability.refresh(); const result = await listingAvailabilityService.getHostBlocks(listing.id);
    if (result.error) setError(availabilityError(result.error)); else setBlocks(result.data || []);
  }
  async function save() {
    setError("");
    if (!isDateKey(start) || !isDateKey(end) || rentalDays(start, end) <= 0 || start < todayKey()) { setError("Choose a future or current start date and an end date after it."); return; }
    const conflict = validateRentalAvailability(start, end, availability.ranges); if (conflict) { setError(conflict); return; }
    setBusy(true);
    try {
      const result = await listingAvailabilityService.addBlock(listing.id, start, end, reason.trim());
      if (result.error) setError(availabilityError(result.error)); else { setStart(""); setEnd(""); setReason(""); }
      await reload();
    } catch (e) { setError(availabilityError(e)); } finally { setBusy(false); }
  }
  async function remove(id) {
    setBusy(true); setError("");
    try { const result = await listingAvailabilityService.removeBlock(listing.id, id); if (result.error) setError(availabilityError(result.error)); await reload(); }
    catch (e) { setError(availabilityError(e)); } finally { setBusy(false); }
  }
  return <Dialog open onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
    <DialogTitle>Availability · {listing.title}</DialogTitle>
    <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
      <Typography color="text.secondary">Block time for personal use, maintenance, or a break from hosting. Approved, confirmed, and active reservations hold their dates automatically.</Typography>
      {(error || availability.error) && <Alert severity="error" action={<Button onClick={reload} size="small">Refresh</Button>}>{error || availability.error}</Alert>}
      <AvailabilityCalendar selectionHint="Select a block start date, then choose a length or enter a custom end date." ranges={availability.ranges} startDate={start} endDate={end} disabled={busy || availability.loading || Boolean(availability.error)}
        onSelectDate={day => { setStart(day); setEnd(endFor(day, preset)); }} />
      <TextField select size="small" label="Block length" value={preset} onChange={e => { setPreset(e.target.value); setEnd(endFor(start, e.target.value)); }}>
        <MenuItem value="day">1 day</MenuItem><MenuItem value="week">1 week</MenuItem><MenuItem value="month">1 month</MenuItem><MenuItem value="custom">Custom dates</MenuItem>
      </TextField>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        <TextField label="Block from" size="small" type="date" value={start} onChange={e => { setStart(e.target.value); setEnd(endFor(e.target.value, preset)); }} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: todayKey() } }} />
        <TextField label="Available again" size="small" type="date" value={end} onChange={e => { setEnd(e.target.value); setPreset("custom"); }} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: isDateKey(start) ? addDateDays(start, 1) : todayKey() } }} />
      </Box>
      <Typography variant="caption" color="text.secondary">The end date is the first available day. Use custom dates to block multiple days, weeks, or months.</Typography>
      <TextField label="Private note (optional)" size="small" value={reason} onChange={e => setReason(e.target.value)} slotProps={{ htmlInput: { maxLength: 300 } }} />
      <Button variant="contained" onClick={save} disabled={busy || blocksLoading || availability.loading || Boolean(availability.error) || !start || !end}>{busy ? "Saving…" : "Block dates"}</Button>
      <Typography sx={{ fontWeight: 800 }}>Your blocked dates</Typography>
      {!blocks.length && <Typography color="text.secondary">{blocksLoading ? "Loading…" : "No host blocks added."}</Typography>}
      {blocks.map(block => <Box key={block.id} sx={{ display: "flex", alignItems: "center", gap: 2, justifyContent: "space-between" }}>
        <Box><Typography variant="body2">{block.startDate} → {block.endDate}</Typography>{block.reason && <Typography variant="caption" color="text.secondary">{block.reason}</Typography>}</Box>
        <Button size="small" onClick={() => remove(block.id)} disabled={busy}>Remove</Button>
      </Box>)}
      <Typography variant="caption" color="text.secondary">Reserved dates are managed through the booking. Removing a host block never cancels a reservation.</Typography>
    </Stack></DialogContent>
    <DialogActions><Button onClick={reload} disabled={busy}>Refresh</Button><Button onClick={onClose} disabled={busy}>Done</Button></DialogActions>
  </Dialog>;
}
