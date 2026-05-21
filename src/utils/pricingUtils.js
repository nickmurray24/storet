import { PRICING_PERIODS } from "../constants/appEnums";

export const PRICING_PERIOD_ORDER = [
  PRICING_PERIODS.DAILY,
  PRICING_PERIODS.MONTHLY,
  PRICING_PERIODS.YEARLY,
];

export const PRICING_PERIOD_CONFIG = {
  [PRICING_PERIODS.DAILY]: {
    label: "Daily",
    shortLabel: "day",
    pluralLabel: "days",
    suffix: "/day",
    durationLabel: "Daily rate",
  },
  [PRICING_PERIODS.MONTHLY]: {
    label: "Monthly",
    shortLabel: "month",
    pluralLabel: "months",
    suffix: "/mo",
    durationLabel: "Monthly rate",
  },
  [PRICING_PERIODS.YEARLY]: {
    label: "Yearly",
    shortLabel: "year",
    pluralLabel: "years",
    suffix: "/yr",
    durationLabel: "Yearly rate",
  },
};

export function parsePositiveNumber(value, fallbackValue = null) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const cleanedValue = value.replace(/[^0-9.]/g, "");
    const parsedValue = Number(cleanedValue);

    if (Number.isFinite(parsedValue) && parsedValue > 0) {
      return parsedValue;
    }
  }

  return fallbackValue;
}

export function normalizePricing(pricingInput = {}, legacyMonthlyValue = null) {
  const pricing = pricingInput && typeof pricingInput === "object" ? pricingInput : {};

  const daily = parsePositiveNumber(
    pricing.daily ?? pricing.day ?? pricing.dailyRate ?? pricing.pricePerDay,
    null
  );
  const monthly = parsePositiveNumber(
    pricing.monthly ??
      pricing.month ??
      pricing.monthlyRate ??
      pricing.monthlyPrice ??
      pricing.pricePerMonth ??
      legacyMonthlyValue,
    null
  );
  const yearly = parsePositiveNumber(
    pricing.yearly ?? pricing.year ?? pricing.yearlyRate ?? pricing.annualRate ?? pricing.pricePerYear,
    null
  );

  return {
    [PRICING_PERIODS.DAILY]: daily,
    [PRICING_PERIODS.MONTHLY]: monthly,
    [PRICING_PERIODS.YEARLY]: yearly,
  };
}

export function getAvailablePricingOptions(pricingInput = {}) {
  const pricing = normalizePricing(pricingInput);

  return PRICING_PERIOD_ORDER.map((period) => {
    const amount = pricing[period];
    const config = PRICING_PERIOD_CONFIG[period];

    if (!amount) {
      return null;
    }

    return {
      period,
      amount,
      label: config.label,
      shortLabel: config.shortLabel,
      pluralLabel: config.pluralLabel,
      suffix: config.suffix,
      durationLabel: config.durationLabel,
      display: formatRate(amount, period),
      chipLabel: `${config.label}: ${formatRate(amount, period)}`,
    };
  }).filter(Boolean);
}

export function hasAnyPricing(pricingInput = {}) {
  return getAvailablePricingOptions(pricingInput).length > 0;
}

export function getPreferredPricingOption(pricingInput = {}, preferredPeriod = PRICING_PERIODS.MONTHLY) {
  const options = getAvailablePricingOptions(pricingInput);

  if (options.length === 0) {
    return null;
  }

  return (
    options.find((option) => option.period === preferredPeriod) ||
    options.find((option) => option.period === PRICING_PERIODS.MONTHLY) ||
    options[0]
  );
}

export function getPricingOptionByPeriod(pricingInput = {}, period) {
  const options = getAvailablePricingOptions(pricingInput);
  return options.find((option) => option.period === period) || options[0] || null;
}

export function getStartingPricingOption(pricingInput = {}) {
  const options = getAvailablePricingOptions(pricingInput);

  if (options.length === 0) {
    return null;
  }

  return options.reduce((lowest, option) => {
    return option.amount < lowest.amount ? option : lowest;
  }, options[0]);
}

export function getMonthlyEquivalentAmount(pricingInput = {}) {
  const pricing = normalizePricing(pricingInput);

  if (pricing.monthly) {
    return pricing.monthly;
  }

  if (pricing.daily) {
    return pricing.daily * 30;
  }

  if (pricing.yearly) {
    return pricing.yearly / 12;
  }

  return 0;
}

export function formatRate(amount, period = PRICING_PERIODS.MONTHLY) {
  const parsedAmount = Number(amount || 0);
  const config = PRICING_PERIOD_CONFIG[period] || PRICING_PERIOD_CONFIG[PRICING_PERIODS.MONTHLY];
  const displayAmount = parsedAmount % 1 === 0
    ? parsedAmount.toFixed(0)
    : parsedAmount.toFixed(2);

  return `$${Number(displayAmount).toLocaleString()}${config.suffix}`;
}

export function formatPricingSummary(pricingInput = {}, options = {}) {
  const { limit = 3, prefix = "" } = options;
  const rates = getAvailablePricingOptions(pricingInput);

  if (rates.length === 0) {
    return "Price not listed";
  }

  const visibleRates = rates.slice(0, limit).map((rate) => rate.display);
  const summary = visibleRates.join(" · ");

  return prefix ? `${prefix} ${summary}` : summary;
}

export function formatStartingPrice(pricingInput = {}) {
  const startingRate = getStartingPricingOption(pricingInput);

  if (!startingRate) {
    return "Price not listed";
  }

  return `From ${startingRate.display}`;
}
