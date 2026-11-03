import React, { useMemo, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Button,
  Card, CardContent, Chip, Container, Divider, InputAdornment, MenuItem,
  Stack, TextField, Typography, CircularProgress,
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import { useOptionalStoretApp } from "../context/StoretAppContext";
import { APP_ROUTES } from "../routes/appRoutes";
import { SUPPORT_EMAIL } from "../config/supportConfig";
import { SUPPORT_ARTICLES, SUPPORT_TOPICS } from "../data/supportTopics";
import { filterSupportArticles } from "../utils/supportUtils";
import { supportService } from "../services/supportService";
import { createSupportId, getSupportVisit, markSupportVisitLimited, recordSupportSent, SUPPORT_REQUESTS_PER_VISIT } from "../utils/supportSession";

const FORM_TOPICS = [...SUPPORT_TOPICS, { id: "other", label: "Something else" }];
const ARTICLE_ACTIONS = {
  profile: { to: APP_ROUTES.profile, label: "Open profile" },
  settings: { to: APP_ROUTES.settings, label: "Notification settings" },
  auth: { to: APP_ROUTES.auth, label: "Go to login" },
};

export default function SupportPage() {
  const app = useOptionalStoretApp();
  const user = app?.currentUser;
  const signedIn = Boolean(user?.isAuthenticated);
  const formRef = useRef(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [feedback, setFeedback] = useState(null);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const requestIdRef = useRef("");
  const [visit, setVisit] = useState(getSupportVisit);
  const [sentReference, setSentReference] = useState("");
  const [rateLimited, setRateLimited] = useState(false);
  const [limitWarning, setLimitWarning] = useState(false);
  const [form, setForm] = useState(() => ({
    name: signedIn ? user.fullName || "" : "",
    email: signedIn ? user.email || "" : "",
    topic: "other", reference: "", subject: "", message: "", website: "",
  }));
  const articles = useMemo(() => filterSupportArticles(SUPPORT_ARTICLES, category, query), [category, query]);

  function change(field, value) {
    setForm(current => ({ ...current, [field]: value }));
    if (!rateLimited) setFeedback(null);
    requestIdRef.current = "";
  }

  const visitLimited = visit.count >= SUPPORT_REQUESTS_PER_VISIT;

  function clearRequestForm() {
    setForm(current => ({
      name: signedIn ? current.name : "",
      email: signedIn ? current.email : "",
      topic: "other", reference: "", subject: "", message: "", website: "",
    }));
  }

  async function sendRequest(event) {
    event.preventDefault();
    if (sendingRef.current || sentReference || rateLimited) return;
    if (!formRef.current?.reportValidity()) return;
    if (!form.subject.trim() || !form.message.trim()) {
      setFeedback({ severity: "error", text: "Add a subject and describe what you need help with." });
      return;
    }
    if (visitLimited) {
      setLimitWarning(true);
      return;
    }
    requestIdRef.current = requestIdRef.current || createSupportId();
    if (!requestIdRef.current || !visit.id) {
      setFeedback({ severity: "error", text: "Your browser couldn’t start a secure request. Please update your browser or email support directly." });
      return;
    }
    sendingRef.current = true;
    setSending(true);
    setFeedback(null);
    try {
      const result = await supportService.send(form, { requestId: requestIdRef.current, visitId: visit.id });
      if (result.error) {
        if (result.error.code === "VISIT_LIMIT") {
          setVisit(markSupportVisitLimited(visit));
          setLimitWarning(true);
          return;
        }
        if (result.error.code === "RATE_LIMIT") setRateLimited(true);
        const reference = result.error.reference ? ` Reference: ${result.error.reference}.` : "";
        setFeedback({ severity: "error", text: result.error.message + reference });
        return;
      }
      setSentReference(result.data.reference);
      setVisit(recordSupportSent(visit, requestIdRef.current, result.data.visitCount));
      clearRequestForm();
      setFeedback({ severity: "success", text: `Your support request has been sent. Reference: ${result.data.reference}. We’ll reply by email.` });
    } catch {
      setFeedback({ severity: "error", text: "We couldn’t confirm your request was sent. Your message is still here; please try again later." });
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  function startAnotherRequest() {
    clearRequestForm();
    setSentReference("");
    setLimitWarning(false);
    setFeedback(null);
    requestIdRef.current = "";
  }

  return (
    <Container component="main" maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={3.5}>
        <Box sx={{ p: { xs: 3, md: 4 }, borderRadius: "24px", bgcolor: "primary.main", color: "primary.contrastText",
          background: "linear-gradient(120deg, #1d4ed8, #2563eb 65%, #0f766e)" }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={3} sx={{ alignItems: { sm: "center" }, justifyContent: "space-between" }}>
            <Box sx={{ maxWidth: 660 }}>
              <Typography variant="overline" sx={{ opacity: 0.85, fontWeight: 800 }}>Storet support</Typography>
              <Typography component="h1" variant="h3" sx={{ mt: 0.5, fontSize: { xs: "2rem", md: "2.75rem" } }}>How can we help?</Typography>
              <Typography sx={{ mt: 1.5, lineHeight: 1.7, opacity: 0.95 }}>Find answers about renting, hosting, and managing your account—or tell us what needs a closer look.</Typography>
            </Box>
            <Button href="#contact-support" variant="outlined" startIcon={<EmailRoundedIcon />} sx={{ alignSelf: { xs: "flex-start", sm: "center" }, flexShrink: 0, color: "inherit", borderColor: "rgba(255,255,255,0.65)", "&:hover": { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" } }}>Contact Storet</Button>
          </Stack>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 1.35fr) minmax(340px, 1fr)" }, gap: 3, alignItems: "start" }}>
          <Stack spacing={2.5} sx={{ minWidth: 0 }}>
            <Box>
              <Typography component="h2" variant="h5">Find an answer</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.75 }}>Start with a topic, or search for what you need.</Typography>
            </Box>
            <TextField fullWidth label="Search help" value={query} onChange={event => setQuery(event.target.value)}
              placeholder="Try bookings, payouts, or photos" type="search"
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon /></InputAdornment> }, htmlInput: { maxLength: 200 } }} />
            <Box role="group" aria-label="Help topics" sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {[{ id: "all", label: "All topics" }, ...SUPPORT_TOPICS].map(topic => (
                <Chip key={topic.id} label={topic.label} clickable onClick={() => setCategory(topic.id)}
                  aria-pressed={category === topic.id} color={category === topic.id ? "primary" : "default"}
                  variant={category === topic.id ? "filled" : "outlined"} />
              ))}
            </Box>
            <Typography variant="body2" color="text.secondary" aria-live="polite">{articles.length} {articles.length === 1 ? "answer" : "answers"} found</Typography>
            {articles.length ? <Box>
              {articles.map(article => {
                const action = ARTICLE_ACTIONS[article.action];
                const destination = !signedIn && article.action !== "auth" ? APP_ROUTES.auth : action?.to;
                return <Accordion key={article.id} disableGutters elevation={0} sx={{ mb: 1.25, border: "1px solid", borderColor: "divider", borderRadius: "16px !important", "&:before": { display: "none" }, overflow: "hidden" }}>
                  <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} id={`help-${article.id}`} aria-controls={`help-answer-${article.id}`} sx={{ px: 2.5, py: 0.75, gap: 1, "& .MuiAccordionSummary-content": { minWidth: 0 } }}>
                    <Typography sx={{ fontWeight: 700 }}>{article.question}</Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ px: 2.5, pb: 2.5 }}>
                    <Typography color="text.secondary" sx={{ lineHeight: 1.8 }}>{article.answer}</Typography>
                    {action && <Button component={RouterLink} to={destination} size="small" endIcon={<ArrowForwardRoundedIcon />} sx={{ mt: 1.5 }}>
                      {!signedIn && article.action !== "auth" ? "Log in to your account" : action.label}
                    </Button>}
                  </AccordionDetails>
                </Accordion>;
              })}
            </Box> : <Card variant="outlined"><CardContent sx={{ textAlign: "center", p: 3 }}>
              <HelpOutlineRoundedIcon color="primary" sx={{ fontSize: 36 }} />
              <Typography variant="h6" component="h3" sx={{ mt: 1 }}>No answers found</Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>Try fewer words or choose another topic. You can also contact Storet with your question.</Typography>
              <Button onClick={() => { setQuery(""); setCategory("all"); }} sx={{ mt: 1.5 }}>Clear search and filters</Button>
            </CardContent></Card>}
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Button component={RouterLink} to={signedIn ? APP_ROUTES.profile : APP_ROUTES.auth} variant="outlined" size="small">{signedIn ? "Your bookings & receipts" : "Log in to Storet"}</Button>
              {signedIn && <Button component={RouterLink} to={APP_ROUTES.settings} variant="outlined" size="small">Notification settings</Button>}
            </Box>
          </Stack>

          <Card id="contact-support" sx={{ minWidth: 0, scrollMarginTop: { xs: 200, md: 100 } }}>
            <CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
              <Stack spacing={2.5}>
                <Box>
                  <Typography component="h2" variant="h5">Contact Storet</Typography>
                  <Typography color="text.secondary" sx={{ mt: 1, lineHeight: 1.7 }}>Have a question or found something that isn’t working? Include a few details so we can understand the issue.</Typography>
                </Box>
                <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 3 }}>
                  <Typography variant="body2" color="text.secondary">Your request goes to</Typography>
                  <Typography sx={{ mt: 0.5, fontWeight: 800, overflowWrap: "anywhere" }}>{SUPPORT_EMAIL}</Typography>
                </Box>
                <Divider />
                <Box component="form" ref={formRef} onSubmit={sendRequest}>
                  <Box component="fieldset" disabled={sending || Boolean(sentReference)} sx={{ border: 0, p: 0, m: 0, minWidth: 0 }}>
                  <Stack spacing={2}>
                    <TextField label="Leave this field empty" value={form.website} onChange={event => change("website", event.target.value)}
                      aria-hidden="true" sx={{ position: "absolute", left: -10000, width: 1, height: 1, overflow: "hidden" }}
                      slotProps={{ htmlInput: { tabIndex: -1, autoComplete: "off", maxLength: 200 } }} />
                    <TextField select fullWidth disabled={sending || Boolean(sentReference)} label="What do you need help with?" value={form.topic} onChange={event => change("topic", event.target.value)}>
                      {FORM_TOPICS.map(topic => <MenuItem key={topic.id} value={topic.id}>{topic.label}</MenuItem>)}
                    </TextField>
                    <TextField fullWidth label="Your name" autoComplete="name" value={form.name} onChange={event => change("name", event.target.value)} slotProps={{ htmlInput: { maxLength: 100 } }} />
                    <TextField fullWidth required type="email" label="Your email" autoComplete="email" value={form.email} onChange={event => change("email", event.target.value)} helperText="Use your Storet account email if you have one." slotProps={{ htmlInput: { maxLength: 254 } }} />
                    <TextField fullWidth label="Listing or booking reference" helperText="Optional. Paste a listing link or booking ID." value={form.reference} onChange={event => change("reference", event.target.value)} slotProps={{ htmlInput: { maxLength: 200 } }} />
                    <TextField fullWidth required label="Subject" value={form.subject} onChange={event => change("subject", event.target.value)} slotProps={{ htmlInput: { maxLength: 120 } }} />
                    <TextField fullWidth required multiline minRows={5} label="How can we help?" value={form.message} onChange={event => change("message", event.target.value)} helperText="Tell us what happened and what you expected. Leave out passwords and full card details." slotProps={{ htmlInput: { maxLength: 4000 } }} />
                  </Stack>
                  </Box>
                  <Stack spacing={2} sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">We’ll reply to the email address you provide. If you need to send screenshots later, include your support reference.</Typography>
                    {feedback && <Alert severity={feedback.severity} sx={{ overflowWrap: "anywhere" }}>{feedback.text}</Alert>}
                    {limitWarning && <Alert severity="warning">You’ve reached the limit of 3 support requests for this visit. Your existing requests are saved. You can still use all the help topics.</Alert>}
                    {sentReference ? <Button type="button" variant="outlined" onClick={startAnotherRequest} disabled={rateLimited}>Send another request</Button>
                      : <Button type="submit" variant="contained" disabled={sending || limitWarning || rateLimited}
                          startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <EmailRoundedIcon />}>{sending ? "Sending…" : "Send request"}</Button>}
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Stack>
    </Container>
  );
}
