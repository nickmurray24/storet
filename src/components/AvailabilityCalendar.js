const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatDateKey(date) {
  return date.toISOString().split('T')[0];
}

function buildCalendarDays() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function isInRange(dateKey, startDate, endDate) {
  return dateKey >= startDate && dateKey <= endDate;
}

function getDayStatus(dateKey, blackoutRanges, bookingRanges) {
  if (
    blackoutRanges.some((range) =>
      isInRange(dateKey, range.startDate, range.endDate)
    )
  ) {
    return 'blocked';
  }

  if (
    bookingRanges.some((range) =>
      isInRange(dateKey, range.startDate, range.endDate)
    )
  ) {
    return 'booked';
  }

  return 'available';
}

function AvailabilityCalendar({
  blackoutRanges = [],
  bookingRanges = [],
}) {
  const today = new Date();
  const currentMonth = today.getMonth();
  const calendarDays = buildCalendarDays();

  return (
    <div className="availability-calendar">
      <div className="availability-legend">
        <span className="legend-item">
          <span className="legend-swatch available" />
          Available
        </span>
        <span className="legend-item">
          <span className="legend-swatch booked" />
          Booked
        </span>
        <span className="legend-item">
          <span className="legend-swatch blocked" />
          Host blackout
        </span>
      </div>

      <div className="calendar-weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="calendar-weekday">
            {label}
          </div>
        ))}
      </div>

      <div className="calendar-grid">
        {calendarDays.map((date) => {
          const dateKey = formatDateKey(date);
          const status = getDayStatus(dateKey, blackoutRanges, bookingRanges);
          const isOutsideMonth = date.getMonth() !== currentMonth;

          return (
            <div
              key={dateKey}
              className={`calendar-day ${status} ${
                isOutsideMonth ? 'outside-month' : ''
              }`}
              title={`${dateKey} • ${status}`}
            >
              <span>{date.getDate()}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AvailabilityCalendar;