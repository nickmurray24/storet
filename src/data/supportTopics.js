export const SUPPORT_TOPICS = [
  { id: "renting", label: "Renting a space" },
  { id: "hosting", label: "Hosting a space" },
  { id: "payments", label: "Payments & receipts" },
  { id: "account", label: "Account & notifications" },
  { id: "technical", label: "Technical help" },
];

export const SUPPORT_ARTICLES = [
  {
    id: "reserve-space", category: "renting", question: "How do I reserve a space?",
    answer: "Open a listing, review its details, and choose your move-in and move-out dates. Select an available rental period and check the booking summary before continuing. The next step depends on the listing’s booking mode: you may need host approval before checkout. Follow the status and available actions shown for your booking.",
    keywords: ["reservation", "request", "instant", "approval", "daily", "weekly", "monthly", "yearly"],
  },
  {
    id: "unavailable-dates", category: "renting", question: "Why can’t I select certain dates?",
    answer: "Hosts can block dates when a space is unavailable. Dates held for an approved or confirmed booking also cannot overlap a new reservation. Try a different date range or contact the host about availability. A move-out date is the end of the reservation; it is not an extra rental day.",
    keywords: ["calendar", "move-in", "move-out", "blocked", "occupied", "availability"],
  },
  {
    id: "contact-host", category: "renting", question: "How do I contact my host about access or move-in?",
    answer: "Use the host-contact option on the listing or your booking confirmation. Include your booking details and ask about access times, where to meet, and any instructions for the space. For problems with the app or a payment, use Contact Storet on this page.",
    keywords: ["message", "chat", "appointment", "keys", "address"],
  },
  {
    id: "change-booking", category: "renting", question: "How do I change or cancel a reservation?",
    answer: "Open your Profile and find the reservation in Reservation activity. Review its status and the actions currently available. If the change you need is not available, contact the host and Storet support with your booking reference and requested dates. Cancellation and refund outcomes need to be reviewed for the specific booking; sending a support request does not change it automatically.",
    keywords: ["cancel", "reschedule", "extend", "refund", "duration"], action: "profile",
  },
  {
    id: "create-listing", category: "hosting", question: "What do I need to create a listing?",
    answer: "Add a title, description, verified street address, approximate square footage, photos, and the rates you want to offer. Choose the amenities and access arrangements that apply. The square-footage helper can estimate the area from length and width. Review the public location preview to see the general location shown for your space.",
    keywords: ["list space", "address", "estimate", "amenities", "privacy", "suite", "unit"],
  },
  {
    id: "payout-setup", category: "hosting", question: "Why is my listing a draft, and how do I manage payouts?",
    answer: "Complete payout setup before publishing a listing for renters to book. Use the payout setup option on your Host Dashboard and follow the account requirements shown there. Once setup is ready, review and publish your draft. Use Manage Payouts on the dashboard if you need to review or update payout information.",
    keywords: ["publish", "bank", "payment method", "onboarding", "stripe", "draft"],
  },
  {
    id: "edit-listing", category: "hosting", question: "How do I edit my listing or reorder its photos?",
    answer: "Open the Listings section of your Host Dashboard and choose Edit. You can update the listing information and arrange its photos there. Editing is locked while a booking is Approved, Confirmed, or Active so the details of an existing reservation stay consistent.",
    keywords: ["images", "order", "locked", "save", "change", "pictures"],
  },
  {
    id: "block-calendar", category: "hosting", question: "How do I block dates when my space is unavailable?",
    answer: "Use the listing’s availability calendar in your host tools. Choose the start and end of the time you want to block, then save it. You can block a day or a longer range. Approved and confirmed reservation dates are held separately; do not remove a reservation just to change availability.",
    keywords: ["calendar", "day", "week", "month", "availability", "unavailable"],
  },
  {
    id: "find-receipt", category: "payments", question: "Where can I find my payment receipt?",
    answer: "Open Profile, find the reservation in Reservation activity, and choose View receipt when it is available. The receipt includes the booking information and recorded payment details. Check the dates and booking status as well as the amount when reviewing a payment.",
    keywords: ["invoice", "charge", "total", "paid", "proof of payment"], action: "profile",
  },
  {
    id: "payment-problem", category: "payments", question: "What should I do if checkout fails or a charge looks wrong?",
    answer: "Check your booking status and receipt before attempting another payment. If the result is unclear, contact Storet with the booking reference, approximate payment time, amount, and the error you saw. Do not include a full card number, security code, password, or bank-login details in your message.",
    keywords: ["duplicate", "charged twice", "failed", "refund", "billing", "card"],
  },
  {
    id: "password-help", category: "account", question: "I can’t sign in. How do I reset my password?",
    answer: "Open the login page and choose Forgot password. Enter the email associated with your Storet account, then follow the reset link sent to that address. Check spam or junk folders too. If a reset link has expired, request a new one and use the latest email.",
    keywords: ["login", "log in", "sign-in", "forgot", "reset", "email"], action: "auth",
  },
  {
    id: "switch-mode", category: "account", question: "How do I switch between renter and host?",
    answer: "Use the name-and-mode menu in the navigation when both modes are available to your account. If you are starting as a host, choose List your space and complete your first listing to unlock the host dashboard. The options shown depend on the setup you have completed.",
    keywords: ["profile", "role", "switch", "become a host", "dashboard"],
  },
  {
    id: "notification-settings", category: "account", question: "How do I choose which notifications I receive?",
    answer: "Open the gear icon in the navigation, change the In app and Email switches for each category, and save your preferences. Changes apply to new updates; existing notifications stay in your history. Sign-in and security emails are separate. Use the bell icon to open your notifications; its badge shows unread updates.",
    keywords: ["settings", "alerts", "unsubscribe", "emails", "badge", "unread"], action: "settings",
  },
  {
    id: "email-not-arriving", category: "technical", question: "Why am I not receiving notification emails?",
    answer: "Check that the relevant Email switch is enabled in Settings and that your sign-in email is verified. Check your spam folder and allow a little time for delivery. Only new notification events trigger emails. If the issue continues, contact Storet with the type of update you expected and when it happened.",
    keywords: ["missing", "notifications", "inbox", "confirmation", "delivery"], action: "settings",
  },
  {
    id: "technical-problem", category: "technical", question: "What should I include when reporting a bug or photo issue?",
    answer: "Describe the page you were using, the steps that caused the problem, what you expected, and what happened instead. Include the device and browser, any error text, and a listing or booking reference if relevant. For blurry photos, note whether the original photo is sharp and where it looks blurry. Send your report using the support form. If you need to email screenshots separately, include the reference shown after sending your request.",
    keywords: ["upload", "images", "pictures", "blurry", "map", "loading", "browser", "error", "broken", "bug", "screenshot"],
  },
];
