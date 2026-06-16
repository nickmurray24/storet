import { useMemo, useState } from 'react';

import { PRICING_PERIODS } from '../constants/appEnums';
import { getAvailablePricingOptions, getPricingOptionByPeriod } from '../utils/pricingUtils';

function BookingRequestForm({
  listingTitle,
  currentUser,
  pricing,
  selectedRatePeriod,
  onSubmitRequest,
}) {
  const pricingOptions = useMemo(() => getAvailablePricingOptions(pricing), [pricing]);
  const defaultRatePeriod =
    selectedRatePeriod ||
    pricingOptions.find((option) => option.period === PRICING_PERIODS.MONTHLY)?.period ||
    pricingOptions[0]?.period ||
    '';

  const [formData, setFormData] = useState({
    fullName: currentUser?.isAuthenticated ? currentUser.fullName : '',
    email: currentUser?.isAuthenticated ? currentUser.email : '',
    moveInDate: '',
    moveOutDate: '',
    ratePeriod: defaultRatePeriod,
    duration: '',
    notes: '',
  });

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitState, setSubmitState] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedPricingOption = getPricingOptionByPeriod(
    pricing,
    formData.ratePeriod || defaultRatePeriod
  );

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

    if (!selectedPricingOption) {
      nextErrors.ratePeriod = 'Please select an available rate.';
    }

    if (!formData.duration.trim()) {
      nextErrors.duration = 'Please select a rental length.';
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

    const result = await onSubmitRequest({
      fullName: formData.fullName,
      email: formData.email,
      moveInDate: formData.moveInDate,
      moveOutDate: formData.moveOutDate,
      ratePeriod: selectedPricingOption.period,
      rateLabel: selectedPricingOption.label,
      rateDisplay: selectedPricingOption.display,
      duration: formData.duration,
      notes: formData.notes,
    });

    setIsSubmitting(false);

    if (result?.ok === false) {
      setSubmitError(result.error || 'We could not submit this booking request.');
      return;
    }

    setSubmitState(result?.request?.status || 'Pending');
  }

  if (submitState) {
    const isInstant = submitState === 'Approved';
    const isWaitlist = submitState === 'Waitlisted';

    return (
      <div className="booking-success-card">
        <p className="booking-success-tag">
          {isInstant
            ? 'Instant Booking Ready'
            : isWaitlist
            ? 'Added to Waitlist'
            : 'Request Sent'}
        </p>

        <h3>
          {isInstant
            ? 'This listing was instantly approved.'
            : isWaitlist
            ? 'Your dates are now waitlisted.'
            : 'Your reservation request is in.'}
        </h3>

        <p>
          {isInstant
            ? `Your booking for ${listingTitle} was auto-approved. You can complete checkout from your profile.`
            : isWaitlist
            ? `Your requested dates for ${listingTitle} are currently unavailable, but you’ve been added to the waitlist.`
            : `We saved your request for ${listingTitle}. It will now appear in your profile activity and in the host dashboard for that listing.`}
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
            <strong>Selected rate:</strong> {selectedPricingOption?.display}
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
        Submit your booking details for <strong>{listingTitle}</strong>.
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
        <label htmlFor="ratePeriod">Billing Rate</label>
        <select
          id="ratePeriod"
          name="ratePeriod"
          value={formData.ratePeriod}
          onChange={handleChange}
        >
          <option value="">Select one</option>
          {pricingOptions.map((option) => (
            <option key={option.period} value={option.period}>
              {option.label} · {option.display}
            </option>
          ))}
        </select>
        {errors.ratePeriod && (
          <span className="form-error">{errors.ratePeriod}</span>
        )}
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
          <option value="1 year or longer">1 year or longer</option>
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
        Submit Booking Request
      </button>
    </form>
  );
}

export default BookingRequestForm;
