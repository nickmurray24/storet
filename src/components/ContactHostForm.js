import { useState } from 'react';

function ContactHostForm({ hostName, listingTitle }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    message: '',
  });

  const [errors, setErrors] = useState({});
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
  }

  function validateForm() {
    const nextErrors = {};

    if (!formData.fullName.trim()) {
      nextErrors.fullName = 'Please enter your name.';
    }

    if (!formData.email.trim()) {
      nextErrors.email = 'Please enter your email.';
    }

    if (!formData.message.trim()) {
      nextErrors.message = 'Please enter a message.';
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

    setIsSubmitted(true);
  }

  if (isSubmitted) {
    return (
      <div className="booking-success-card">
        <p className="booking-success-tag">Message Sent</p>
        <h3>Your message is on its way.</h3>
        <p>
          In a real version of Storet, <strong>{hostName}</strong> would receive
          this message about <strong>{listingTitle}</strong>.
        </p>

        <div className="booking-summary">
          <p><strong>Name:</strong> {formData.fullName}</p>
          <p><strong>Email:</strong> {formData.email}</p>
          <p><strong>Message:</strong> {formData.message}</p>
        </div>
      </div>
    );
  }

  return (
    <form className="booking-form" onSubmit={handleSubmit}>
      <h3>Contact Host</h3>
      <p className="booking-form-copy">
        Send a message to <strong>{hostName}</strong> about{' '}
        <strong>{listingTitle}</strong>.
      </p>

      <div className="filter-group">
        <label htmlFor="contactFullName">Full Name</label>
        <input
          id="contactFullName"
          name="fullName"
          type="text"
          value={formData.fullName}
          onChange={handleChange}
          placeholder="Your name"
        />
        {errors.fullName && <span className="form-error">{errors.fullName}</span>}
      </div>

      <div className="filter-group">
        <label htmlFor="contactEmail">Email</label>
        <input
          id="contactEmail"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="you@example.com"
        />
        {errors.email && <span className="form-error">{errors.email}</span>}
      </div>

      <div className="filter-group">
        <label htmlFor="contactMessage">Message</label>
        <textarea
          id="contactMessage"
          name="message"
          rows="5"
          value={formData.message}
          onChange={handleChange}
          placeholder="Hi, I’m interested in this storage space. Is it still available?"
        />
        {errors.message && <span className="form-error">{errors.message}</span>}
      </div>

      <button type="submit" className="primary-button full-width">
        Send Message
      </button>
    </form>
  );
}

export default ContactHostForm;