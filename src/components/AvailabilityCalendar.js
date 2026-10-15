import React, { useEffect, useState } from "react";
import { Box, Button, Chip, IconButton, Stack, Typography } from "@mui/material";
import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { addDateDays, rangesOverlap, isDateKey, todayKey } from "../utils/rentalDates";
export default function AvailabilityCalendar({ ranges = [], startDate = "", endDate = "", onSelectDate, disabled = false, selectionHint = "Select move-in, then move-out. Move-out is the first available day." }) {
  const [month, setMonth] = useState(() => todayKey().slice(0, 7) + "-01");
  useEffect(() => { if (isDateKey(startDate)) setMonth(startDate.slice(0, 7) + "-01"); }, [startDate]);
  const d = new Date(`${month}T00:00:00Z`);
  const first = addDateDays(month, -d.getUTCDay());
  const shift = n => { const next = new Date(`${month}T00:00:00Z`); next.setUTCMonth(next.getUTCMonth() + n); setMonth(next.toISOString().slice(0, 10)); };
  return <Stack spacing={1}>
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <IconButton size="small" aria-label="Previous month" onClick={() => shift(-1)}><ChevronLeftRoundedIcon /></IconButton>
      <Typography sx={{ fontWeight: 800 }}>{d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}</Typography>
      <IconButton size="small" aria-label="Next month" onClick={() => shift(1)}><ChevronRightRoundedIcon /></IconButton>
    </Box>
    <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 0.4 }}>
      {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(w => <Typography key={w} align="center" variant="caption" color="text.secondary">{w}</Typography>)}
      {Array.from({ length: 42 }, (_, i) => {
        const key = addDateDays(first, i), day = Number(key.slice(-2));
        const range = ranges.find(r => rangesOverlap(key, addDateDays(key, 1), r));
        const selected = key === startDate || key === endDate || (startDate && endDate && key > startDate && key < endDate);
        const past = key < todayKey();
        // A reserved day's boundary may be selected as move-out, but never as move-in.
        const boundary = range && startDate && !endDate && key > startDate && key === range.startDate;
        const title = `${key}${range ? range.kind === "booked" ? ": Reserved" : ": Host blocked" : ": Available"}`;
        return <Button key={key} size="small" aria-label={title} title={title} disabled={disabled || past || Boolean(range && !boundary)}
          onClick={() => onSelectDate?.(key)} variant={selected ? "contained" : "text"}
          sx={{ minWidth: 0, p: 0, height: 32, fontSize: 12, opacity: key.slice(0, 7) === month.slice(0, 7) ? 1 : 0.45,
            bgcolor: selected ? "primary.main" : range ? range.kind === "booked" ? "#dbeafe" : "#fee2e2" : "transparent",
            "&.Mui-disabled": { color: past ? "text.disabled" : "text.secondary", bgcolor: range ? range.kind === "booked" ? "#dbeafe" : "#fee2e2" : undefined } }}>{day}</Button>;
      })}
    </Box>
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}><Chip size="small" label="Reserved" sx={{ bgcolor: "#dbeafe" }} /><Chip size="small" label="Host blocked" sx={{ bgcolor: "#fee2e2" }} /></Box>
    {onSelectDate && <Typography variant="caption" color="text.secondary">{selectionHint}</Typography>}
  </Stack>;
}
