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
      restrictions: Array.isArray(listing.restrictions)
        ? listing.restrictions.join(', ')
        : '',
      security: listing.security || '',
      imageUrl: listing.imageUrl || '',
      latitude:
        listing.latitude === null || listing.latitude === undefined
          ? ''
          : String(listing.latitude),
      longitude:
        listing.longitude === null || listing.longitude === undefined
          ? ''
          : String(listing.longitude),
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
    restrictions: '',
    security: '',
    imageUrl: '',
    latitude: '',
    longitude: '',
  };
}

function isValidLatitude(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= -90 && parsed <= 90;
}

function isValidLongitude(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= -180 && parsed <= 180;
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
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');
  const [geocodeSuccess, setGeocodeSuccess] = useState('');

  useEffect(() => {
    setFormData(buildFormData(editingListing, currentUser));
    setGeocodeError('');
    setGeocodeSuccess('');
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

    if (name === 'location' || name === 'latitude' || name === 'longitude') {
      setGeocodeError('');
      setGeocodeSuccess('');
    }
  }

  async function handleGeocodeLocation() {
    const query = formData.location.trim();

    if (!query) {
      setErrors((prev) => ({
        ...prev,
        location: 'Enter a location or address first.',
      }));
      setGeocodeError('');
      setGeocodeSuccess('');
      return;
    }

    setIsGeocoding(true);
    setGeocodeError('');
    setGeocodeSuccess('');

    try {
      const params = new URLSearchParams({
        q: query,
        format: 'jsonv2',
        limit: '1',
      });

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Geocoding request failed.');
      }

      const results = await response.json();

      if (!Array.isArray(results) || results.length === 0) {
        setGeocodeError('No matching map location was found. Try a fuller address.');
        return;
      }

      const bestMatch = results[0];

      setFormData((prev) => ({
        ...prev,
        latitude: bestMatch.lat,
        longitude: bestMatch.lon,
      }));

      setErrors((prev) => ({
        ...prev,
        latitude: '',
        longitude: '',
        location: '',
      }));

      setGeocodeSuccess('Coordinates found and filled in for this listing.');
    } catch (error) {
      setGeocodeError('Unable to look up this address right now. Try again or enter coordinates manually.');
    } finally {
      setIsGeocoding(false);
    }
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

    if (!formData.latitude.trim()) {
      nextErrors.latitude = 'Please enter a latitude or use Find on Map.';
    } else if (!isValidLatitude(formData.latitude)) {
      nextErrors.latitude = 'Latitude must be between -90 and 90.';
    }

    if (!formData.longitude.trim()) {
      nextErrors.longitude = 'Please enter a longitude or use Find on Map.';
    } else if (!isValidLongitude(formData.longitude)) {
      nextErrors.longitude = 'Longitude must be between -180 and 180.';
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
            ? 'Update your listing details, map coordinates, and presentation.'
            : 'Publish a new storage space and use address lookup to place it on the live map.'}
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

        <div className="filter-group">
          <label htmlFor="imageUrl">Listing Photo URL</label>
          <input
            id="imageUrl"
            name="imageUrl"
            type="text"
            value={formData.imageUrl}
            onChange={handleChange}
            placeholder="https://images.unsplash.com/..."
          />
          <span className="field-hint">
            Optional. Paste a direct image URL to give your listing a visual preview.
          </span>
        </div>

        <div className="filter-group">
          <label htmlFor="location">Location / Address</label>
          <div className="location-geocode-row">
            <input
              id="location"
              name="location"
              type="text"
              value={formData.location}
              onChange={handleChange}
              placeholder="123 Main St, Columbus, OH"
            />

            <button
              type="button"
              className="secondary-button geocode-button"
              onClick={handleGeocodeLocation}
              disabled={isGeocoding}
            >
              {isGeocoding ? 'Finding...' : 'Find on Map'}
            </button>
          </div>

          {errors.location && (
            <span className="form-error">{errors.location}</span>
          )}

          {!errors.location && geocodeError && (
            <span className="geocode-status error">{geocodeError}</span>
          )}

          {!errors.location && !geocodeError && geocodeSuccess && (
            <span className="geocode-status success">{geocodeSuccess}</span>
          )}

          <span className="field-hint">
            Use a fuller street address for the best geocoding result.
          </span>
        </div>

        <div className="form-row">
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
        </div>

        <div className="form-row">
          <div className="filter-group">
            <label htmlFor="latitude">Latitude</label>
            <input
              id="latitude"
              name="latitude"
              type="text"
              value={formData.latitude}
              onChange={handleChange}
              placeholder="39.9612"
            />
            {errors.latitude && (
              <span className="form-error">{errors.latitude}</span>
            )}
          </div>

          <div className="filter-group">
            <label htmlFor="longitude">Longitude</label>
            <input
              id="longitude"
              name="longitude"
              type="text"
              value={formData.longitude}
              onChange={handleChange}
              placeholder="-82.9988"
            />
            {errors.longitude && (
              <span className="form-error">{errors.longitude}</span>
            )}
          </div>
        </div>

        <div className="field-hint coordinates-hint">
          Find on Map fills these automatically, but you can still edit them manually.
        </div>

        <div className="form-row">
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
        </div>

        <div className="form-row">
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
        </div>

        <div className="form-row">
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

          <div className="filter-group">
            <label htmlFor="security">Security Details</label>
            <input
              id="security"
              name="security"
              type="text"
              value={formData.security}
              onChange={handleChange}
              placeholder="Camera coverage, locked entry, keypad access, etc."
            />
          </div>
        </div>

        <div className="form-row">
          <div className="filter-group">
            <label htmlFor="restrictions">Restrictions / Rules</label>
            <input
              id="restrictions"
              name="restrictions"
              type="text"
              value={formData.restrictions}
              onChange={handleChange}
              placeholder="No vehicle storage, no hazardous items, boxes only"
            />
            <span className="field-hint">Separate rules with commas.</span>
          </div>

          <div className="filter-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              rows="5"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the space, ideal storage use cases, security, and access details."
            />
            {errors.description && (
              <span className="form-error">{errors.description}</span>
            )}
          </div>
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