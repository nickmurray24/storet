import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import LockRoundedIcon from "@mui/icons-material/LockRounded";
import MailRoundedIcon from "@mui/icons-material/MailRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";

function ContactHostForm({
  hostName,
  listingTitle,
  currentUser,
  onSubmitMessage = () => ({ ok: true }),
  onRequireAuth,
}) {
  const [formData, setFormData] = useState({
    fullName: currentUser?.isAuthenticated ? currentUser.fullName || "" : "",
    email: currentUser?.isAuthenticated ? currentUser.email || "" : "",
    message: "",
  });

  const [errors, setErrors] = useState({});
  const [submissionResult, setSubmissionResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
      form: "",
    }));
  }

  function validateForm() {
    const nextErrors = {};

    if (!formData.fullName.trim()) {
      nextErrors.fullName = "Please enter your name.";
    }

    if (!formData.email.trim()) {
      nextErrors.email = "Please enter your email.";
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      nextErrors.email = "Please enter a valid email.";
    }

    if (!formData.message.trim()) {
      nextErrors.message = "Please enter a message.";
    }

    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = validateForm();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);

    const result = await onSubmitMessage({
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      message: formData.message.trim(),
    });

    setIsSubmitting(false);

    if (result?.ok === false) {
      setErrors({
        form: result.error || "We could not send this message. Please try again.",
      });
      return;
    }

    setSubmissionResult(result?.message || {
      senderName: formData.fullName,
      senderEmail: formData.email,
      message: formData.message,
    });
    setFormData((prev) => ({ ...prev, message: "" }));
  }

  if (!currentUser?.isAuthenticated) {
    return (
      <Card variant="outlined" sx={{ boxShadow: "none", borderRadius: 4 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack spacing={2} alignItems="flex-start">
            <Alert severity="info" icon={<LockRoundedIcon />} sx={{ width: "100%" }}>
              Sign in before messaging a host.
            </Alert>

            <Box>
              <Typography variant="h6">Contact host</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                Create or log into your Storet account to ask <strong>{hostName}</strong>{" "}
                a question about <strong>{listingTitle}</strong>.
              </Typography>
            </Box>

            <Button variant="contained" onClick={onRequireAuth}>
              Sign in to message host
            </Button>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  if (submissionResult) {
    return (
      <Card variant="outlined" sx={{ boxShadow: "none", borderRadius: 4 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            <Alert severity="success" icon={<MailRoundedIcon />}>
              Message sent. It now appears in the host dashboard inbox.
            </Alert>

            <Box>
              <Typography variant="h6">Your message is on its way.</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                We saved your message to <strong>{hostName}</strong> about{" "}
                <strong>{listingTitle}</strong>.
              </Typography>
            </Box>

            <Divider />

            <Stack spacing={1}>
              <Typography variant="body2" color="text.secondary">
                From {submissionResult.senderName || formData.fullName} ·{" "}
                {submissionResult.senderEmail || formData.email}
              </Typography>
              <Typography>{submissionResult.message}</Typography>
            </Stack>

            <Button variant="outlined" onClick={() => setSubmissionResult(null)}>
              Send another message
            </Button>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h6">Contact host</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Ask <strong>{hostName}</strong> a question about{" "}
            <strong>{listingTitle}</strong> before reserving.
          </Typography>
        </Box>

        {errors.form && <Alert severity="error">{errors.form}</Alert>}

        <TextField
          label="Full name"
          name="fullName"
          value={formData.fullName}
          onChange={handleChange}
          error={Boolean(errors.fullName)}
          helperText={errors.fullName}
          fullWidth
        />

        <TextField
          label="Email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          error={Boolean(errors.email)}
          helperText={errors.email}
          fullWidth
        />

        <TextField
          label="Message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          error={Boolean(errors.message)}
          helperText={errors.message}
          placeholder="Hi, I’m interested in this storage space. Is it still available?"
          multiline
          minRows={4}
          fullWidth
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
          startIcon={<SendRoundedIcon />}
          fullWidth
          disabled={isSubmitting}
        >
          {isSubmitting ? "Sending..." : "Send message"}
        </Button>
      </Stack>
    </Box>
  );
}

export default ContactHostForm;
