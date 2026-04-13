import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

function buildFormData(listing, currentUser) {
  if (listing) {
    return {
      title: listing.title || '',
      type: listing.type || 'Private',
      location: listing.location || '',
      price: listing.price ? listing.price.replace('/mo', '').replace('$', '') : '',
      size: listing.size || '',
      duration: listing.duration || 'Short-term',
      availability: listing.availability || 'Available now',
      access: listing.access || '',
      hostName: listing.hostName || '',
      description: listing.description || '',
      features: Array.isArray(listing.features) ? listing.features.join(', ') : '',
    };
  }

  return {
    title: '',
    type: 'Private',
    location: '',
    price: '',
    size: '',
    duration: 'Short-term',
    availability: 'Available now',
    access: '',
    hostName: currentUser?.isAuthenticated ? currentUser.fullName : '',
    description: '',
    features: '',
  };
}

function CreateListingPage({
  listings,
  currentUser,
  onCreateListing,
  onUpdateListing,
  onDeleteListing,
  onToggleListingStatus,
}) {
  const navigate = useNavigate();
  const { id } = useParams();

  const isEditing = Boolean(id);

  const editingListing = useMemo(() => {
    if (!isEditing) {
      return null;
    }

    return listings.find((listing) => listing.id === Number(id)) || null;
  }, [id, isEditing, listings]);

  const [formData, setFormData] = useState(buildFormData(editingListing, currentUser));
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setFormData(buildFormData(editingListing, currentUser));
  }, [editingListing, currentUser]);

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

    if (isEditing) {
      const updatedListing = onUpdateListing(editingListing.id, formData);

      if (updatedListing) {
        navigate(`/listing/${updatedListing.id}`);
      }

      return;
    }

    const createdListing = onCreateListing(formData);
    navigate(`/listing/${createdListing.id}`);
  }

  function handleDelete() {
    if (!editingListing) {
      return;
    }

    const shouldDelete = window.confirm(
      `Delete "${editingListing.title}"? This will remove it from your listings.`
    );

    if (!shouldDelete) {
      return;
    }

    onDeleteListing(editingListing.id);
    navigate('/profile');
  }

  function handleToggleStatus() {
    if (!editingListing) {
      return;
    }

    onToggleListingStatus(editingListing.id);
    navigate('/profile');
  }

  if (isEditing && !editingListing) {
    return (
      <div className="form-page">
        <div className="page-header-block">
          <h1>Listing not found</h1>
          <p>We couldn’t find that listing in your host inventory.</p>
          <Link to="/profile" className="primary-button">
            Back to Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="form-page">
      <div className="page-header-block">
        <h1>{isEditing ? 'Edit Listing' : 'Create a Listing'}</h1>
        <p>
          {isEditing
            ? 'Update your storage listing details, pause visibility, or remove the listing entirely.'
            : 'Publish a new storage space. When you save it, it will immediately appear in Explore and in your Profile.'}
        </p>

        {isEditing && editingListing && (
          <div className="management-actions">
            <span
              className={`status-pill ${
                editingListing.status === 'paused' ? 'paused' : 'active'
              }`}
            >
              {editingListing.status === 'paused' ? 'Paused' : 'Active'}
            </span>

            <button
              type="button"
              className="secondary-button"
              onClick={handleToggleStatus}
            >
              {editingListing.status === 'paused'
                ? 'Resume Listing'
                : 'Pause Listing'}
            </button>

            <button
              type="button"
              className="danger-button"
              onClick={handleDelete}
            >
              Delete Listing
            </button>
          </div>
        )}
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

        <div className="management-actions">
          <button type="submit" className="primary-button">
            {isEditing ? 'Update Listing' : 'Save Listing'}
          </button>

          <Link to="/profile" className="secondary-button">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

export default CreateListingPage;