import { useMemo, useState } from "react";
import { Link as RouterLink, useParams, useSearchParams } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Stack,
  Typography,
} from "@mui/material";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CreditCardRoundedIcon from "@mui/icons-material/CreditCardRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import HomeWorkRoundedIcon from "@mui/icons-material/HomeWorkRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";

import { useOptionalStoretApp } from "../context/StoretAppContext";
import { APP_ROUTES, buildListingPath } from "../routes/appRoutes";
import { BOOKING_STATUSES } from "../utils/bookingUtils";
import {
  getBookingRequestById,
  getCheckoutBlockedReason,
  getPaymentRecordForRequest,
} from "../utils/bookingSelectors";

const SERVICE_FEE = 19;

function formatCurrency(value) {
  const amount = Number(value || 0);
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function formatDateTime(value) {
  if (!value) {
    return "Not recorded";
  }

  return new Date(value).toLocaleString();
}

function getPaidWithLabel(payment = {}) {
  if (payment.cardBrand === "Stripe" || payment.last4 === "Checkout") {
    return "Stripe Checkout";
  }

  if (payment.cardBrand && payment.last4) {
    return `${payment.cardBrand} ending in ${payment.last4}`;
  }

  return "Payment method recorded";
}

function SummaryRow({ label, value, strong = false }) {
  return (
    <Stack direction="row" justifyContent="space-between" gap={2} alignItems="flex-start">
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="body2"
        fontWeight={strong ? 800 : 700}
        textAlign="right"
        color="text.primary"
      >
        {value || "—"}
      </Typography>
    </Stack>
  );
}

function CheckoutHero({ icon, eyebrow, title, description, chip }) {
  return (
    <Card
      elevation={0}
      sx={{
        mb: 3,
        overflow: "hidden",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 4,
        background:
          "linear-gradient(135deg, rgba(46,125,50,0.12), rgba(25,118,210,0.08) 48%, rgba(255,255,255,0.95))",
      }}
    >
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2.5} alignItems={{ xs: "flex-start", md: "center" }}>
          <Box
            sx={{
              width: 58,
              height: 58,
              borderRadius: 3,
              display: "grid",
              placeItems: "center",
              color: "primary.main",
              bgcolor: "background.paper",
              boxShadow: "0 18px 35px rgba(15, 23, 42, 0.10)",
            }}
          >
            {icon}
          </Box>

          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="overline" color="primary.main" fontWeight={800}>
                {eyebrow}
              </Typography>
              {chip}
            </Stack>
            <Typography variant="h3" component="h1" fontWeight={900} sx={{ mt: 0.5 }}>
              {title}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 760 }}>
              {description}
            </Typography>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function BookingSummaryCard({ request, pricing }) {
  return (
    <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 4 }}>
      <CardContent sx={{ p: 3 }}>
        <Stack spacing={2.25}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <HomeWorkRoundedIcon color="primary" />
            <Box>
              <Typography variant="h6" fontWeight={900}>
                Booking summary
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Review the approved storage booking before payment.
              </Typography>
            </Box>
          </Stack>

          <Divider />

          <SummaryRow label="Listing" value={request.listingTitle} />
          <SummaryRow label="Host" value={request.hostName} />
          <SummaryRow label="Selected rate" value={request.rateDisplay} />
          <SummaryRow label="Move-in" value={request.moveInDate} />
          <SummaryRow label="Move-out" value={request.moveOutDate} />
          <SummaryRow label="Duration" value={request.duration} />

          <Divider />

          <SummaryRow
            label={`${request.rateLabel || "Storage"} charge`}
            value={formatCurrency(pricing.storageCharge)}
          />
          <SummaryRow label="Platform service fee" value={formatCurrency(pricing.serviceFee)} />

          <Box
            sx={{
              mt: 0.5,
              p: 2,
              borderRadius: 3,
              bgcolor: "primary.main",
              color: "primary.contrastText",
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2}>
              <Typography variant="body1" fontWeight={800}>
                Total due today
              </Typography>
              <Typography variant="h5" fontWeight={900}>
                {formatCurrency(pricing.totalAmount)}
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function ReceiptSummaryCard({ request, payment }) {
  return (
    <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 4 }}>
      <CardContent sx={{ p: { xs: 3, md: 4 } }}>
        <Stack spacing={2.5}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="space-between">
            <Stack direction="row" spacing={1.25} alignItems="center">
              <ReceiptLongRoundedIcon color="primary" />
              <Box>
                <Typography variant="h5" fontWeight={900}>
                  Payment receipt
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Receipt #{payment.receiptNumber || "Processing"}
                </Typography>
              </Box>
            </Stack>

            <Chip
              color="success"
              icon={<CheckCircleRoundedIcon />}
              label={payment.status || "Paid"}
              sx={{ fontWeight: 800, alignSelf: { xs: "flex-start", sm: "center" } }}
            />
          </Stack>

          <Divider />

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gap: 2,
            }}
          >
            <Stack spacing={1.5}>
              <SummaryRow label="Listing" value={payment.listingTitle || request.listingTitle} />
              <SummaryRow label="Host" value={payment.hostName || request.hostName} />
              <SummaryRow label="Billing rate" value={payment.rateDisplay || request.rateDisplay} />
              <SummaryRow label="Paid with" value={getPaidWithLabel(payment)} />
            </Stack>

            <Stack spacing={1.5}>
              <SummaryRow label="Paid at" value={formatDateTime(payment.paidAt)} />
              <SummaryRow label="Rental active" value={formatDateTime(request.activatedAt)} />
              <SummaryRow label="Completed at" value={formatDateTime(request.completedAt)} />
              {payment.stripeCheckoutSessionId && (
                <SummaryRow label="Stripe session" value={payment.stripeCheckoutSessionId.slice(-12)} />
              )}
            </Stack>
          </Box>

          <Divider />

          <Stack spacing={1.5}>
            <SummaryRow label="Storage charge" value={formatCurrency(payment.storageCharge)} />
            <SummaryRow label="Platform service fee" value={formatCurrency(payment.serviceFee)} />
            <SummaryRow label="Total paid" value={formatCurrency(payment.amount)} strong />
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

function CheckoutPage({
  bookingRequests,
  paymentRecords,
  onStartStripeCheckout,
}) {
  const storetApp = useOptionalStoretApp();
  const { requestId } = useParams();
  const [searchParams] = useSearchParams();

  const checkoutStatus = searchParams.get("checkout");
  const stripeSessionId = searchParams.get("session_id");

  const activeBookingRequests = bookingRequests ?? storetApp?.bookingRequests ?? [];
  const activePaymentRecords = paymentRecords ?? storetApp?.paymentRecords ?? [];

  const request = getBookingRequestById(activeBookingRequests, requestId);
  const existingPayment = getPaymentRecordForRequest(activePaymentRecords, requestId);

  const pricing = useMemo(() => {
    const storageCharge = Number(request?.listingPrice || 0);
    const serviceFee = SERVICE_FEE;
    const totalAmount = storageCharge + serviceFee;

    return {
      storageCharge,
      serviceFee,
      totalAmount,
    };
  }, [request]);

  const [submitError, setSubmitError] = useState("");
  const [isStripeSubmitting, setIsStripeSubmitting] = useState(false);

  const blockedCheckout = getCheckoutBlockedReason(request);

  async function handleStartStripeCheckout() {
    if (!request) {
      return;
    }

    const startStripeCheckoutAction =
      onStartStripeCheckout || storetApp?.actions?.startStripeCheckout || (() => null);

    setSubmitError("");
    setIsStripeSubmitting(true);

    const result = await startStripeCheckoutAction(request.id);

    setIsStripeSubmitting(false);

    if (result?.ok === false || !result?.url) {
      setSubmitError(result?.error || "We could not start Stripe Checkout yet.");
      return;
    }

    window.location.assign(result.url);
  }


  if (blockedCheckout) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <CheckoutHero
          icon={<LockRoundedIcon fontSize="large" />}
          eyebrow="Checkout"
          title={blockedCheckout.title}
          description={blockedCheckout.description}
        />

        <Button component={RouterLink} to={blockedCheckout.actionTo} variant="contained" size="large">
          {blockedCheckout.actionLabel}
        </Button>
      </Container>
    );
  }

  if (request.status === BOOKING_STATUSES.CANCELLED) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <CheckoutHero
          icon={<EventAvailableRoundedIcon fontSize="large" />}
          eyebrow="Booking update"
          title="Booking cancelled"
          description="This booking was cancelled and is no longer active. The details are kept here for your records."
          chip={<Chip label="Cancelled" color="default" sx={{ fontWeight: 800 }} />}
        />

        <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={900}>
                Booking summary
              </Typography>
              <Divider />
              <SummaryRow label="Listing" value={request.listingTitle} />
              <SummaryRow label="Host" value={request.hostName} />
              <SummaryRow label="Cancelled at" value={formatDateTime(request.cancelledAt)} />
              {existingPayment && (
                <SummaryRow label="Original payment" value={formatCurrency(existingPayment.amount)} />
              )}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ pt: 1 }}>
                <Button component={RouterLink} to={APP_ROUTES.profile} variant="contained">
                  Back to Profile
                </Button>
                <Button component={RouterLink} to={APP_ROUTES.explore} variant="outlined">
                  Browse Listings
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      </Container>
    );
  }

  if (
    (request.status === BOOKING_STATUSES.CONFIRMED ||
      request.status === BOOKING_STATUSES.ACTIVE ||
      request.status === BOOKING_STATUSES.COMPLETED) &&
    existingPayment
  ) {
    const title =
      request.status === BOOKING_STATUSES.COMPLETED
        ? "Booking completed"
        : request.status === BOOKING_STATUSES.ACTIVE
        ? "Rental active"
        : "Booking confirmed";

    return (
      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        <CheckoutHero
          icon={<CheckCircleRoundedIcon fontSize="large" />}
          eyebrow="Receipt"
          title={title}
          description="Your payment is recorded and this booking is confirmed in Storet. Keep this receipt for your records."
          chip={<Chip color="success" label="Paid" sx={{ fontWeight: 800 }} />}
        />

        <ReceiptSummaryCard request={request} payment={existingPayment} />

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 3 }}>
          <Button component={RouterLink} to={APP_ROUTES.profile} variant="contained" size="large">
            Back to Profile
          </Button>
          <Button
            component={RouterLink}
            to={buildListingPath(request.listingId)}
            variant="outlined"
            size="large"
          >
            View Listing
          </Button>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <CheckoutHero
        icon={<PaymentsRoundedIcon fontSize="large" />}
        eyebrow="Secure checkout"
        title="Complete your booking payment"
        description="You’ll be redirected to Stripe Checkout to securely complete payment. Storet will update your booking automatically after Stripe confirms the payment."
        chip={<Chip color="primary" label="Stripe Checkout" sx={{ fontWeight: 800 }} />}
      />

      {checkoutStatus === "success" && !existingPayment && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 3 }}>
          Stripe returned you to Storet. If the receipt is not visible yet, the webhook may still be processing. Refresh this page in a moment.
          {stripeSessionId ? ` Session ${stripeSessionId.slice(-12)} is pending confirmation.` : ""}
        </Alert>
      )}

      {checkoutStatus === "cancelled" && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: 3 }}>
          Stripe Checkout was cancelled. Your booking is still approved, and you can restart checkout whenever you’re ready.
        </Alert>
      )}

      {submitError && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
          {submitError}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 1.15fr) minmax(320px, 0.85fr)" },
          gap: 3,
          alignItems: "start",
        }}
      >
        <Card elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 4 }}>
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Stack spacing={3}>
              <Stack spacing={1}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  <CreditCardRoundedIcon color="primary" />
                  <Typography variant="h5" fontWeight={900}>
                    Payment method
                  </Typography>
                </Stack>
                <Typography variant="body1" color="text.secondary">
                  Real card details are collected by Stripe, not stored in Storet. This keeps the React app out of direct card handling.
                </Typography>
              </Stack>

              <Box
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  bgcolor: "grey.50",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }}>
                  <Box
                    sx={{
                      width: 54,
                      height: 38,
                      borderRadius: 2,
                      display: "grid",
                      placeItems: "center",
                      bgcolor: "background.paper",
                      border: "1px solid",
                      borderColor: "divider",
                      fontWeight: 900,
                    }}
                  >
                    $tr
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight={900}>Stripe-hosted checkout</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Use Stripe’s hosted payment page for card entry, payment confirmation, and redirect back to Storet.
                    </Typography>
                  </Box>
                  <Chip icon={<ShieldRoundedIcon />} label="Secure redirect" color="success" variant="outlined" />
                </Stack>
              </Box>

              <Stack spacing={1.5}>
                <Button
                  type="button"
                  variant="contained"
                  size="large"
                  onClick={handleStartStripeCheckout}
                  disabled={isStripeSubmitting}
                  startIcon={
                    isStripeSubmitting ? <CircularProgress color="inherit" size={18} /> : <LockRoundedIcon />
                  }
                >
                  {isStripeSubmitting
                    ? "Starting Stripe Checkout..."
                    : `Continue to Stripe · ${formatCurrency(pricing.totalAmount)}`}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <BookingSummaryCard request={request} pricing={pricing} />
      </Box>

      <Button
        component={RouterLink}
        to={APP_ROUTES.profile}
        variant="text"
        color="inherit"
        startIcon={<ArrowBackRoundedIcon />}
        sx={{ mt: 3 }}
      >
        Back to Profile
      </Button>
    </Container>
  );
}

export default CheckoutPage;
