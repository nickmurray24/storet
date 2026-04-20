import { useState } from 'react';

function BookingRequestForm({ listingTitle, currentUser, onSubmitRequest }) {
  const [formData, setFormData] = useState({
    fullName: currentUser?.isAuthenticated ? currentUser.fullName : '',
    email: currentUser?.isAuthenticated ? currentUser.email : '',
    moveInDate: '',
    moveOutDate: '',
    duration: '',
    notes: '',
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

    if (!formData.fullName.trim()) {
      nextErrors.fullName = 'Please enter your name.';
    }

    if (!formData.email.trim()) {
      nextErrors.email = 'Please enter your email.';
    }

    if (!formData.moveInDate) {
      nextErrors.moveInDate = 'Please choose a move-in date.';
    }

    if (!formData.moveOutDate) {
      nextErrors.moveOutDate = 'Please choose a move-out date.';
    } else if (formData.moveInDate && formData.moveOutDate < formData.moveInDate) {
      nextErrors.moveOutDate = 'Move-out date must be on or after the move-in date.';
    }

    if (!formData.duration.trim()) {
      nextErrors.duration = 'Please select a rental length.';
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

    const result = onSubmitRequest({
      fullName: formData.fullName,
      email: formData.email,
      moveInDate: formData.moveInDate,
      moveOutDate: formData.moveOutDate,
      duration: formData.duration,
      notes: formData.notes,
    });

    if (result?.ok === false) {
      setSubmitError(result.error || 'We could not submit this booking request.');
      return;
    }

    setIsSubmitted(true);
  }

  if (isSubmitted) {
    return (
      <div className="booking-success-card">
        <p className="booking-success-tag">Request Sent</p>
        <h3>Your reservation request is in.</h3>
        <p>
          We saved your request for <strong>{listingTitle}</strong>. It will now
          appear in your profile activity and in the host dashboard for that
          listing.
        </p>

        <div className="booking-summary">
          <p>
            <strong>Name:</strong> {formData.fullName}
          </p>
          <p>
            <strong>Email:</strong> {formData.email}
          </p>
          <p>
            <strong>Move-in date:</strong> {formData.moveInDate}
          </p>
          <p>
            <strong>Move-out date:</strong> {formData.moveOutDate}
          </p>
          <p>
            <strong>Duration:</strong> {formData.duration}
          </p>
          {formData.notes && (
            <p>
              <strong>Notes:</strong> {formData.notes}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <form className="booking-form" onSubmit={handleSubmit}>
      <h3>Reserve This Space</h3>
      <p className="booking-form-copy">
        Send a reservation request for <strong>{listingTitle}</strong>.
      </p>

      <div className="filter-group">
        <label htmlFor="fullName">Full Name</label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          value={formData.fullName}
          onChange={handleChange}
          placeholder="Your name"
        />
        {errors.fullName && (
          <span className="form-error">{errors.fullName}</span>
        )}
      </div>

      <div className="filter-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="you@example.com"
        />
        {errors.email && <span className="form-error">{errors.email}</span>}
      </div>

      <div className="form-row booking-form-row">
        <div className="filter-group">
          <label htmlFor="moveInDate">Move-in Date</label>
          <input
            id="moveInDate"
            name="moveInDate"
            type="date"
            value={formData.moveInDate}
            onChange={handleChange}
          />
          {errors.moveInDate && (
            <span className="form-error">{errors.moveInDate}</span>
          )}
        </div>

        <div className="filter-group">
          <label htmlFor="moveOutDate">Move-out Date</label>
          <input
            id="moveOutDate"
            name="moveOutDate"
            type="date"
            value={formData.moveOutDate}
            onChange={handleChange}
          />
          {errors.moveOutDate && (
            <span className="form-error">{errors.moveOutDate}</span>
          )}
        </div>
      </div>

      <div className="filter-group">
        <label htmlFor="duration">Rental Length</label>
        <select
          id="duration"
          name="duration"
          value={formData.duration}
          onChange={handleChange}
        >
          <option value="">Select one</option>
          <option value="Less than 1 month">Less than 1 month</option>
          <option value="1-3 months">1-3 months</option>
          <option value="3-6 months">3-6 months</option>
          <option value="6+ months">6+ months</option>
        </select>
        {errors.duration && (
          <span className="form-error">{errors.duration}</span>
        )}
      </div>

      <div className="filter-group">
        <label htmlFor="notes">Notes for Host</label>
        <textarea
          id="notes"
          name="notes"
          rows="4"
          value={formData.notes}
          onChange={handleChange}
          placeholder="What are you storing? Any timing details?"
        />
      </div>

      {submitError && <div className="form-submit-error">{submitError}</div>}

      <button type="submit" className="primary-button full-width">
        Send Reservation Request
      </button>
    </form>
  );
}

export default BookingRequestForm;