import React, { useCallback, useEffect, useState } from "react";
import { Alert, Box, Button, Card, CardContent, CircularProgress, Container, Divider, Stack, Switch, Typography } from "@mui/material";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import { useStoretApp } from "../context/StoretAppContext";
import { notificationPreferencesService } from "../services/notificationPreferencesService";
import { NOTIFICATION_CATEGORIES, normalizeNotificationPreferences } from "../utils/notificationPreferences";

export default function SettingsPage() {
  const app = useStoretApp();
  const [preferences, setPreferences] = useState(() => normalizeNotificationPreferences());
  const [saved, setSaved] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [emailVerified, setEmailVerified] = useState(true);
  const [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [error, setError] = useState(""), [success, setSuccess] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true; setLoading(true); setError(""); setSuccess(""); setSaved("");
    notificationPreferencesService.load().then(result => {
      if (!active) return;
      if (result.error) setError(result.error.message || "Your settings could not be loaded.");
      else { setPreferences(result.data.preferences); setSaved(JSON.stringify(result.data.preferences));
        setAccountEmail(result.data.email); setEmailVerified(result.data.emailVerified); }
    }).catch(e => { if (active) setError(e?.message || "Your settings could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [app.currentUser?.id, reload]);
  const dirty = Boolean(saved && JSON.stringify(preferences) !== saved);
  const disabled = loading || saving || !saved;
  const change = useCallback((category, channel, checked) => {
    setSuccess(""); setPreferences(current => ({ ...current, [category]: { ...current[category], [channel]: checked } }));
  }, []);
  function setAllEmails(enabled) {
    setSuccess(""); setPreferences(current => Object.fromEntries(Object.entries(current).map(([key, value]) => [key, { ...value, email: enabled }])));
  }
  async function save() {
    setSaving(true); setError(""); setSuccess("");
    try {
      const result = await notificationPreferencesService.save(preferences);
      if (result.error) { setError(result.error.message || "Your settings could not be saved. Please try again."); return; }
      setPreferences(result.data); setSaved(JSON.stringify(result.data)); setSuccess("Notification settings saved.");
    } catch (e) { setError(e?.message || "Your settings could not be saved. Please try again."); }
    finally { setSaving(false); }
  }
  return <Container maxWidth="md" sx={{ py: { xs: 3, md: 5 } }}>
    <Stack spacing={3}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <SettingsRoundedIcon color="primary" />
        <Box><Typography component="h1" variant="h3">Settings</Typography><Typography color="text.secondary" sx={{ mt: 0.75 }}>Choose how you hear from Storet.</Typography></Box>
      </Box>
      {error && <Alert severity="error" action={!saved ? <Button size="small" onClick={() => setReload(v => v + 1)}>Retry</Button> : undefined}>{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}
      <Card><CardContent sx={{ p: { xs: 2.5, sm: 4 } }}><Stack spacing={2.5}>
        <Box><Typography variant="h5" component="h2">Notification preferences</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>Manage renter and host alerts together. In-app alerts appear in Notifications; email alerts go to your sign-in email.</Typography>
          {accountEmail && <Typography variant="body2" sx={{ mt: 1, overflowWrap: "anywhere" }}>Email: <strong>{accountEmail}</strong></Typography>}
        </Box>
        {!loading && saved && !emailVerified && <Alert severity="info">Verify your sign-in email address to receive email notifications.</Alert>}
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button size="small" variant="outlined" disabled={disabled} onClick={() => setAllEmails(true)}>Enable all emails</Button>
          <Button size="small" variant="outlined" disabled={disabled} onClick={() => setAllEmails(false)}>Turn off all emails</Button>
        </Box>
        <Divider />
        {loading ? <Box sx={{ p: 4, textAlign: "center" }}><CircularProgress aria-label="Loading notification settings" /></Box> : NOTIFICATION_CATEGORIES.map(category => (
          <Box key={category.key} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1fr) 96px 96px" }, gap: { xs: 1, sm: 2 }, alignItems: "center", pb: 2, borderBottom: "1px solid", borderColor: "divider" }}>
            <Box sx={{ minWidth: 0 }}><Typography sx={{ fontWeight: 800 }}>{category.label}</Typography><Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{category.description}</Typography></Box>
            <Box sx={{ display: { xs: "flex", sm: "contents" }, gap: 3 }}>
              {[["inApp", "In app"], ["email", "Email"]].map(([channel, label]) => <Box key={channel} sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
                <Switch checked={preferences[category.key][channel]} disabled={disabled}
                  onChange={e => change(category.key, channel, e.target.checked)}
                  slotProps={{ input: { "aria-label": `${category.label}: ${label} notifications` } }} />
              </Box>)}
            </Box>
          </Box>
        ))}
        <Typography variant="body2" color="text.secondary">Changes apply to new updates. Existing notifications stay in your history. Sign-in and security emails are separate from these preferences.</Typography>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
          <Typography variant="body2" color="text.secondary">{dirty ? "You have unsaved changes." : saved ? "Your preferences are up to date." : ""}</Typography>
          <Button variant="contained" onClick={save} disabled={disabled || !dirty} startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}>{saving ? "Saving…" : "Save preferences"}</Button>
        </Box>
      </Stack></CardContent></Card>
    </Stack>
  </Container>;
}
