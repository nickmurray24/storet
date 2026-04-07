import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function AuthPage({ currentUser, onAuthSubmit }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [formData, setFormData] = useState({
    fullName: currentUser.isAuthenticated ? currentUser.fullName : '',
    email: currentUser.isAuthenticated ? currentUser.email : '',
    password: '',
    role: currentUser.isAuthenticated ? currentUser.role : 'Renter',
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

    if (mode === 'signup' && !formData.fullName.trim()) {
      nextErrors.fullName = 'Please enter your full name.';
    }

    if (!formData.email.trim()) {
      nextErrors.email = 'Please enter your email.';
    }

    if (!formData.password.trim()) {
      nextErrors.password = 'Please enter your password.';
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

    onAuthSubmit({
      fullName:
        mode === 'signup'
          ? formData.fullName
          : formData.fullName || 'Demo User',
      email: formData.email,
      role: mode === 'signup' ? formData.role : currentUser.role || 'Renter',
    });

    navigate('/explore');
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => setMode('login')}
          >
            Log In
          </button>
          <button
            type="button"
            className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => setMode('signup')}
          >
            Sign Up
          </button>
        </div>

        <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p>
          {mode === 'login'
            ? 'Log in to search listings, save spaces, and manage your activity.'
            : 'Choose how you want to use Storet so the app can guide you to the right experience.'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'signup' && (
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
          )}

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

          <div className="filter-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter password"
            />
            {errors.password && (
              <span className="form-error">{errors.password}</span>
            )}
          </div>

          {mode === 'signup' && (
            <div className="filter-group">
              <label>I’m joining as</label>

              <div className="role-options">
                <label className={`role-option ${formData.role === 'Renter' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="role"
                    value="Renter"
                    checked={formData.role === 'Renter'}
                    onChange={handleChange}
                  />
                  <span>Renter</span>
                </label>

                <label className={`role-option ${formData.role === 'Host' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="role"
                    value="Host"
                    checked={formData.role === 'Host'}
                    onChange={handleChange}
                  />
                  <span>Host</span>
                </label>

                <label className={`role-option ${formData.role === 'Both' ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="role"
                    value="Both"
                    checked={formData.role === 'Both'}
                    onChange={handleChange}
                  />
                  <span>Both</span>
                </label>
              </div>
            </div>
          )}

          <button type="submit" className="primary-button full-width">
            {mode === 'login' ? 'Continue' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer-text">
          {mode === 'login'
            ? 'Need an account? Switch to sign up and pick renter, host, or both.'
            : 'Later, this can connect to real authentication and onboarding.'}
        </p>
      </div>
    </div>
  );
}

export default AuthPage;