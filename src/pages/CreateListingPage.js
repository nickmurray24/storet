import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function CreateListingPage({ onCreateListing }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    type: 'Private',
    location: '',
    price: '',
    size: '',
    duration: 'Short-term',
    availability: 'Available now',
    access: '',
    hostName: '',
    description: '',
    features: '',
  });

  const [errors, setErrors] = useState({});

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

    if (!formData.title.trim()) {
      nextErrors.title = 'Please enter a listing title.';
    }

    if (!formData.location.trim()) {
      nextErrors.location = 'Please enter a location.';
    }

    if (!formData.price.trim()) {
      nextErrors.price = 'Please enter a monthly price.';
    }

    if (!formData.size.trim()) {
      nextErrors.size = 'Please enter the storage size.';
    }

    if (!formData.access.trim()) {
      nextErrors.access = 'Please describe access details.';
    }

    if (!formData.description.trim()) {
      nextErrors.description = 'Please enter a description.';
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

    const createdListing = onCreateListing(formData);
    navigate(`/listing/${createdListing.id}`);
  }

  return (
    <div className="form-page">
      <div className="page-header-block">
        <h1>Create a Listing</h1>
        <p>
          Publish a new storage space. When you save it, it will immediately
          appear in Explore and in your Profile.
        </p>
      </div>

      <form className="listing-form-card" onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="filter-group">
            <label htmlFor="title">Listing Title</label>
            <input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              placeholder="Garage space near downtown"
            />
            {errors.title && <span className="form-error">{errors.title}</span>}
          </div>

          <div className="filter-group">
            <label htmlFor="type">Listing Type</label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
            >
              <option value="Private">Private</option>
              <option value="Commercial">Commercial</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="filter-group">
            <label htmlFor="location">Location</label>
            <input
              id="location"
              name="location"
              type="text"
              value={formData.location}
              onChange={handleChange}
              placeholder="Columbus, OH"
            />
            {errors.location && (
              <span className="form-error">{errors.location}</span>
            )}
          </div>

          <div className="filter-group">
            <label htmlFor="price">Monthly Price</label>
            <input
              id="price"
              name="price"
              type="text"
              value={formData.price}
              onChange={handleChange}
              placeholder="75"
            />
            {errors.price && <span className="form-error">{errors.price}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="filter-group">
            <label htmlFor="size">Space Size</label>
            <input
              id="size"
              name="size"
              type="text"
              value={formData.size}
              onChange={handleChange}
              placeholder="Small, medium, 5x10, etc."
            />
            {errors.size && <span className="form-error">{errors.size}</span>}
          </div>

          <div className="filter-group">
            <label htmlFor="duration">Rental Length</label>
            <select
              id="duration"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
            >
              <option value="Short-term">Short-term</option>
              <option value="Long-term">Long-term</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="filter-group">
            <label htmlFor="availability">Availability</label>
            <select
              id="availability"
              name="availability"
              value={formData.availability}
              onChange={handleChange}
            >
              <option value="Available now">Available now</option>
              <option value="Available next week">Available next week</option>
              <option value="Available next month">Available next month</option>
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="access">Access Details</label>
            <input
              id="access"
              name="access"
              type="text"
              value={formData.access}
              onChange={handleChange}
              placeholder="24/7 access, scheduled access, weekends only, etc."
            />
            {errors.access && <span className="form-error">{errors.access}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="filter-group">
            <label htmlFor="hostName">Host Display Name</label>
            <input
              id="hostName"
              name="hostName"
              type="text"
              value={formData.hostName}
              onChange={handleChange}
              placeholder="Your name or business name"
            />
          </div>

          <div className="filter-group">
            <label htmlFor="features">Features</label>
            <input
              id="features"
              name="features"
              type="text"
              value={formData.features}
              onChange={handleChange}
              placeholder="Climate controlled, secure entry, flexible terms"
            />
            <span className="field-hint">Separate features with commas.</span>
          </div>
        </div>

        <div className="filter-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            rows="5"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe the space, security, ideal use cases, and any restrictions."
          />
          {errors.description && (
            <span className="form-error">{errors.description}</span>
          )}
        </div>

        <button type="submit" className="primary-button">
          Save Listing
        </button>
      </form>
    </div>
  );
}

export default CreateListingPage;