import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Rating,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import RateReviewRoundedIcon from "@mui/icons-material/RateReviewRounded";

function ReviewForm({ eligibleRequest, onSubmitReview }) {
  const [formData, setFormData] = useState({
    rating: 5,
    reviewText: "",
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleTextChange(event) {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setSubmitError("");
  }

  function handleRatingChange(_, value) {
    setFormData((prev) => ({
      ...prev,
      rating: value || 0,
    }));

    setErrors((prev) => ({
      ...prev,
      rating: "",
    }));

    setSubmitError("");
  }

  function validateForm() {
    const nextErrors = {};

    if (!formData.rating) {
      nextErrors.rating = "Please choose a rating.";
    }

    if (!formData.reviewText.trim()) {
      nextErrors.reviewText = "Please write a short review.";
    }

    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!eligibleRequest?.id) {
      setSubmitError("A completed booking is required before leaving a review.");
      return;
    }

    const nextErrors = validateForm();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    const result = await onSubmitReview(eligibleRequest.id, formData);
    setIsSubmitting(false);

    if (result?.ok === false) {
      setSubmitError(result.error || "We could not submit your review.");
      return;
    }

    setIsSubmitted(true);
  }

  if (isSubmitted) {
    return (
      <Alert severity="success" variant="outlined">
        Thanks for sharing your experience. Your verified review is now part of this listing.
      </Alert>
    );
  }

  return (
    <Card variant="outlined" sx={{ boxShadow: "none" }}>
      <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2.25}>
            <Stack direction="row" spacing={1.25} alignItems="center">
              <RateReviewRoundedIcon color="primary" />
              <Box>
                <Typography variant="h6">Leave a verified review</Typography>
                <Typography variant="body2" color="text.secondary">
                  You completed this booking, so you can leave one review for this space.
                </Typography>
              </Box>
            </Stack>

            <Stack spacing={0.75}>
              <Typography fontWeight={800}>Rating</Typography>
              <Rating
                name="rating"
                value={Number(formData.rating)}
                onChange={handleRatingChange}
                size="large"
              />
              {errors.rating && (
                <Typography variant="body2" color="error">
                  {errors.rating}
                </Typography>
              )}
            </Stack>

            <TextField
              id="reviewText"
              name="reviewText"
              label="Your review"
              value={formData.reviewText}
              onChange={handleTextChange}
              placeholder="How was the space, communication, access, and overall experience?"
              multiline
              minRows={4}
              fullWidth
              error={Boolean(errors.reviewText)}
              helperText={errors.reviewText || "Keep it helpful for future renters."}
            />

            {submitError && <Alert severity="error">{submitError}</Alert>}

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={isSubmitting}
              startIcon={<RateReviewRoundedIcon />}
              sx={{ alignSelf: "flex-start" }}
            >
              {isSubmitting ? "Submitting..." : "Submit review"}
            </Button>
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}

export default ReviewForm;
