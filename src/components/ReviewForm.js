import { useState } from 'react';

function ReviewForm({ eligibleRequest, onSubmitReview }) {
  const [formData, setFormData] = useState({
    rating: '5',
    reviewText: '',
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: '',
    }));

    setSubmitError('');
  }

  function validateForm() {
    const nextErrors = {};

    if (!formData.rating) {
      nextErrors.rating = 'Please choose a rating.';
    }

    if (!formData.reviewText.trim()) {
      nextErrors.reviewText = 'Please write a short review.';
    }

    return nextErrors;
  }

  function handleSubmit(event) {
    event.preventDefault();

    const nextErrors = validateForm();

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const result = onSubmitReview(eligibleRequest.id, formData);

    if (result?.ok === false) {
      setSubmitError(result.error || 'We could not submit your review.');
      return;
    }

    setIsSubmitted(true);
  }

  if (isSubmitted) {
    return (
      <div className="review-success-card">
        <p className="booking-success-tag">Review Submitted</p>
        <h3>Thanks for sharing your experience.</h3>
        <p>Your review is now part of this listing’s rating summary.</p>
      </div>
    );
  }

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <h3>Leave a Review</h3>
      <p className="results-subtext">
        You completed a booking for this listing, so you can leave one verified review.
      </p>

      <div className="filter-group">
        <label htmlFor="rating">Rating</label>
        <select
          id="rating"
          name="rating"
          value={formData.rating}
          onChange={handleChange}
        >
          <option value="5">5 - Excellent</option>
          <option value="4">4 - Good</option>
          <option value="3">3 - Okay</option>
          <option value="2">2 - Poor</option>
          <option value="1">1 - Very poor</option>
        </select>
        {errors.rating && <span className="form-error">{errors.rating}</span>}
      </div>

      <div className="filter-group">
        <label htmlFor="reviewText">Your Review</label>
        <textarea
          id="reviewText"
          name="reviewText"
          rows="4"
          value={formData.reviewText}
          onChange={handleChange}
          placeholder="How was the space, communication, access, and overall experience?"
        />
        {errors.reviewText && (
          <span className="form-error">{errors.reviewText}</span>
        )}
      </div>

      {submitError && <div className="form-submit-error">{submitError}</div>}

      <button type="submit" className="primary-button">
        Submit Review
      </button>
    </form>
  );
}

export default ReviewForm;