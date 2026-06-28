import { HOST_PAYOUT_STATUSES } from "../constants/appEnums";

export function getHostPayoutStatus(user = {}) {
  const rawStatus = user?.payoutSetupStatus || user?.payout_setup_status || HOST_PAYOUT_STATUSES.NOT_STARTED;
  const detailsSubmitted = Boolean(
    user?.stripeConnectDetailsSubmitted ||
      user?.stripe_connect_details_submitted ||
      user?.payoutDetailsSubmitted
  );
  const chargesEnabled = Boolean(
    user?.stripeConnectChargesEnabled ||
      user?.stripe_connect_charges_enabled ||
      user?.payoutChargesEnabled
  );
  const payoutsEnabled = Boolean(
    user?.stripeConnectPayoutsEnabled ||
      user?.stripe_connect_payouts_enabled ||
      user?.payoutsEnabled
  );
  const onboardingComplete = Boolean(
    user?.stripeConnectOnboardingComplete ||
      user?.stripe_connect_onboarding_complete ||
      user?.payoutsReady ||
      rawStatus === HOST_PAYOUT_STATUSES.READY ||
      (detailsSubmitted && chargesEnabled && payoutsEnabled)
  );

  const normalizedStatus = onboardingComplete
    ? HOST_PAYOUT_STATUSES.READY
    : rawStatus === HOST_PAYOUT_STATUSES.IN_PROGRESS ||
      rawStatus === HOST_PAYOUT_STATUSES.RESTRICTED
    ? rawStatus
    : detailsSubmitted
    ? HOST_PAYOUT_STATUSES.IN_PROGRESS
    : HOST_PAYOUT_STATUSES.NOT_STARTED;

  const statusCopy = {
    [HOST_PAYOUT_STATUSES.READY]: {
      label: "Payouts ready",
      title: "Payout setup complete",
      description: "Your listings can be activated and renters can book them.",
      severity: "success",
    },
    [HOST_PAYOUT_STATUSES.IN_PROGRESS]: {
      label: "Payout setup in progress",
      title: "Finish payout setup",
      description:
        "Stripe still needs a little more information before your listings can go live.",
      severity: "warning",
    },
    [HOST_PAYOUT_STATUSES.RESTRICTED]: {
      label: "Payouts restricted",
      title: "Payout setup needs attention",
      description:
        "Your listings stay in draft until Stripe can verify your payout account.",
      severity: "error",
    },
    [HOST_PAYOUT_STATUSES.NOT_STARTED]: {
      label: "Payout setup required",
      title: "Set up payouts before going live",
      description:
        "Listings you create now will be saved as drafts until your payout account is ready.",
      severity: "warning",
    },
  };

  return {
    status: normalizedStatus,
    isReady: normalizedStatus === HOST_PAYOUT_STATUSES.READY,
    detailsSubmitted,
    chargesEnabled,
    payoutsEnabled,
    onboardingComplete,
    ...statusCopy[normalizedStatus],
  };
}

export function listingNeedsPayoutSetup(listing = {}, user = {}) {
  return listing?.status === "draft" && !getHostPayoutStatus(user).isReady;
}
