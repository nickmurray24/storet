import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

function getMonthlyPrice(price) {
  const parsed = Number(String(price).replace(/[^0-9.]/g, ''));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function inferCardBrand(cardNumber) {
  if (/^4/.test(cardNumber)) {
    return 'Visa';
  }

  if (/^5[1-5]/.test(cardNumber)) {
    return 'Mastercard';
  }

  if (/^3[47]/.test(cardNumber)) {
    return 'Amex';
  }

  return 'Card';
}

function formatCurrency(value) {
  return `$${value.toFixed(2)}`;
}

function formatDateTime(value) {
  return new Date(value).toLocaleString();
}

function CheckoutPage({
  currentUser,
  bookingRequests,
  paymentRecords,
  onCompleteCheckout,
}) {
  const { requestId } = useParams();

  const request = bookingRequests.find((item) => item.id === requestId) || null;
  const existingPayment =
    paymentRecords.find((payment) => payment.requestId === requestId) || null;

  const pricing = useMemo(() => {
    const storageCharge = getMonthlyPrice(request?.listingPrice || 0);
    const serviceFee = 19;
    const totalAmount = storageCharge + serviceFee;

    return {
      storageCharge,
      serviceFee,
      totalAmount,
    };
  }, [request]);

  const [formData, setFormData] = useState({
    cardholderName: currentUser.fullName || '',
    cardNumber: '',
    expiry: '',
    cvc: '',
    billingZip: '',
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
    const sanitizedCard = formData.cardNumber.replace(/\s+/g, '');
    const sanitizedCvc = formData.cvc.replace(/\s+/g, '');

    if (!formData.cardholderName.trim()) {
      nextErrors.cardholderName = 'Please enter the cardholder name.';
    }

    if (!/^\d{13,19}$/.test(sanitizedCard)) {
      nextErrors.cardNumber = 'Enter a valid mock card number.';
    }

    if (!/^\d{2}\/\d{2}$/.test(formData.expiry.trim())) {
      nextErrors.expiry = 'Use MM/YY format.';
    }

    if (!/^\d{3,4}$/.test(sanitizedCvc)) {
      nextErrors.cvc = 'Enter a valid CVC.';
    }

    if (!/^\d{5}$/.test(formData.billingZip.trim())) {
      nextErrors.billingZip = 'Enter a 5-digit billing ZIP code.';
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

    const sanitizedCard = formData.cardNumber.replace(/\s+/g, '');

    onCompleteCheckout(request.id, {
      cardholderName: formData.cardholderName,
      billingZip: formData.billingZip,
      last4: sanitizedCard.slice(-4),
      cardBrand: inferCardBrand(sanitizedCard),
      storageCharge: pricing.storageCharge,
      serviceFee: pricing.serviceFee,
      totalAmount: pricing.totalAmount,
    });
  }

  if (!request) {
    return (
      <div className="checkout-page">
        <div className="page-header-block">
          <h1>Checkout not available</h1>
          <p>We couldn’t find that booking request for your account.</p>
          <Link to="/profile" className="primary-button">
            Back to Profile
          </Link>
        </div>
      </div>
    );
  }

  if (request.status === 'Pending') {
    return (
      <div className="checkout-page">
        <div className="page-header-block">
          <h1>Checkout is not ready yet</h1>
          <p>
            Your booking request is still pending. Checkout becomes available
            after the host approves your request.
          </p>
          <Link to="/profile" className="primary-button">
            Back to Profile
          </Link>
        </div>
      </div>
    );
  }

  if (request.status === 'Waitlisted') {
    return (
      <div className="checkout-page">
        <div className="page-header-block">
          <h1>You’re currently waitlisted</h1>
          <p>
            This booking is on the waitlist, so checkout is not available yet.
          </p>
          <Link to="/profile" className="primary-button">
            Back to Profile
          </Link>
        </div>
      </div>
    );
  }

  if (request.status === 'Declined') {
    return (
      <div className="checkout-page">
        <div className="page-header-block">
          <h1>Request declined</h1>
          <p>
            This booking request was declined, so checkout is no longer
            available for it.
          </p>
          <Link to="/explore" className="primary-button">
            Browse Other Listings
          </Link>
        </div>
      </div>
    );
  }

  if (request.status === 'Cancelled') {
    return (
      <div className="checkout-page">
        <div className="page-header-block">
          <h1>Booking cancelled</h1>
          <p>This booking was cancelled and is no longer active.</p>
        </div>

        <div className="checkout-layout">
          <section className="checkout-card receipt-card">
            <h2>Booking Summary</h2>

            <div className="checkout-summary-group">
              <div className="checkout-summary-row">
                <span>Listing</span>
                <strong>{request.listingTitle}</strong>
              </div>

              <div className="checkout-summary-row">
                <span>Host</span>
                <strong>{request.hostName}</strong>
              </div>

              {request.cancelledAt && (
                <div className="checkout-summary-row">
                  <span>Cancelled at</span>
                  <strong>{formatDateTime(request.cancelledAt)}</strong>
                </div>
              )}

              {existingPayment && (
                <div className="checkout-summary-row">
                  <span>Original payment</span>
                  <strong>{formatCurrency(existingPayment.amount)}</strong>
                </div>
              )}
            </div>

            <div className="activity-action-row">
              <Link to="/profile" className="primary-button">
                Back to Profile
              </Link>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (
    (request.status === 'Confirmed' ||
      request.status === 'Active' ||
      request.status === 'Completed') &&
    existingPayment
  ) {
    return (
      <div className="checkout-page">
        <div className="page-header-block">
          <h1>
            {request.status === 'Completed'
              ? 'Booking completed'
              : request.status === 'Active'
              ? 'Rental active'
              : 'Booking confirmed'}
          </h1>
          <p>Your payment was recorded and this booking status has been updated.</p>
        </div>

        <div className="checkout-layout">
          <section className="checkout-card receipt-card">
            <h2>Payment Receipt</h2>

            <div className="checkout-summary-group">
              <div className="checkout-summary-row">
                <span>Receipt number</span>
                <strong>{existingPayment.receiptNumber}</strong>
              </div>

              <div className="checkout-summary-row">
                <span>Listing</span>
                <strong>{existingPayment.listingTitle}</strong>
              </div>

              <div className="checkout-summary-row">
                <span>Host</span>
                <strong>{existingPayment.hostName}</strong>
              </div>

              <div className="checkout-summary-row">
                <span>Paid with</span>
                <strong>
                  {existingPayment.cardBrand} ending in {existingPayment.last4}
                </strong>
              </div>

              <div className="checkout-summary-row">
                <span>Paid at</span>
                <strong>{formatDateTime(existingPayment.paidAt)}</strong>
              </div>

              {request.activatedAt && (
                <div className="checkout-summary-row">
                  <span>Rental active</span>
                  <strong>{formatDateTime(request.activatedAt)}</strong>
                </div>
              )}

              {request.completedAt && (
                <div className="checkout-summary-row">
                  <span>Completed at</span>
                  <strong>{formatDateTime(request.completedAt)}</strong>
                </div>
              )}

              <div className="checkout-total-row">
                <span>Total paid</span>
                <strong>{formatCurrency(existingPayment.amount)}</strong>
              </div>
            </div>

            <div className="activity-action-row">
              <Link to="/profile" className="primary-button">
                Back to Profile
              </Link>

              <Link to={`/listing/${request.listingId}`} className="secondary-button">
                View Listing
              </Link>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-page">
      <div className="page-header-block">
        <h1>Checkout</h1>
        <p>
          Complete your mock payment to confirm this approved booking request.
        </p>
      </div>

      <div className="checkout-layout">
        <section className="checkout-card">
          <h2>Payment Information</h2>

          <form className="payment-form" onSubmit={handleSubmit}>
            <div className="filter-group">
              <label htmlFor="cardholderName">Cardholder Name</label>
              <input
                id="cardholderName"
                name="cardholderName"
                type="text"
                value={formData.cardholderName}
                onChange={handleChange}
                placeholder="Full name on card"
              />
              {errors.cardholderName && (
                <span className="form-error">{errors.cardholderName}</span>
              )}
            </div>

            <div className="filter-group">
              <label htmlFor="cardNumber">Card Number</label>
              <input
                id="cardNumber"
                name="cardNumber"
                type="text"
                value={formData.cardNumber}
                onChange={handleChange}
                placeholder="4242424242424242"
              />
              {errors.cardNumber && (
                <span className="form-error">{errors.cardNumber}</span>
              )}
            </div>

            <div className="payment-grid">
              <div className="filter-group">
                <label htmlFor="expiry">Expiry</label>
                <input
                  id="expiry"
                  name="expiry"
                  type="text"
                  value={formData.expiry}
                  onChange={handleChange}
                  placeholder="MM/YY"
                />
                {errors.expiry && (
                  <span className="form-error">{errors.expiry}</span>
                )}
              </div>

              <div className="filter-group">
                <label htmlFor="cvc">CVC</label>
                <input
                  id="cvc"
                  name="cvc"
                  type="text"
                  value={formData.cvc}
                  onChange={handleChange}
                  placeholder="123"
                />
                {errors.cvc && <span className="form-error">{errors.cvc}</span>}
              </div>

              <div className="filter-group">
                <label htmlFor="billingZip">Billing ZIP</label>
                <input
                  id="billingZip"
                  name="billingZip"
                  type="text"
                  value={formData.billingZip}
                  onChange={handleChange}
                  placeholder="43215"
                />
                {errors.billingZip && (
                  <span className="form-error">{errors.billingZip}</span>
                )}
              </div>
            </div>

            <div className="mock-payment-note">
              This is a mock checkout flow. No real payment is processed.
            </div>

            <div className="activity-action-row">
              <button type="submit" className="primary-button">
                Pay {formatCurrency(pricing.totalAmount)}
              </button>

              <Link to="/profile" className="secondary-button">
                Cancel
              </Link>
            </div>
          </form>
        </section>

        <aside className="checkout-summary-card">
          <h2>Order Summary</h2>

          <div className="checkout-summary-group">
            <div className="checkout-summary-row">
              <span>Listing</span>
              <strong>{request.listingTitle}</strong>
            </div>

            <div className="checkout-summary-row">
              <span>Host</span>
              <strong>{request.hostName}</strong>
            </div>

            <div className="checkout-summary-row">
              <span>Move-in date</span>
              <strong>{request.moveInDate}</strong>
            </div>

            <div className="checkout-summary-row">
              <span>Move-out date</span>
              <strong>{request.moveOutDate}</strong>
            </div>

            <div className="checkout-summary-row">
              <span>Duration</span>
              <strong>{request.duration}</strong>
            </div>

            <div className="checkout-summary-row">
              <span>Storage charge</span>
              <strong>{formatCurrency(pricing.storageCharge)}</strong>
            </div>

            <div className="checkout-summary-row">
              <span>Platform service fee</span>
              <strong>{formatCurrency(pricing.serviceFee)}</strong>
            </div>

            <div className="checkout-total-row">
              <span>Total due today</span>
              <strong>{formatCurrency(pricing.totalAmount)}</strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default CheckoutPage;