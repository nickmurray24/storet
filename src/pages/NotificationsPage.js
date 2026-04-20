import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';

function formatNotificationTime(dateValue) {
  return new Date(dateValue).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function NotificationsPage({
  notifications = [],
  unreadCount = 0,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
}) {
  const [filter, setFilter] = useState('all');

  const visibleNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((notification) => !notification.isRead);
    }

    return notifications;
  }, [filter, notifications]);

  return (
    <div className="notifications-page">
      <div className="page-header-block">
        <h1>Notifications</h1>
        <p>Track booking updates, host activity, messages, and reviews.</p>
      </div>

      <div className="notifications-toolbar">
        <div className="notifications-filter-group">
          <button
            type="button"
            className={`secondary-button ${filter === 'all' ? 'active-filter' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({notifications.length})
          </button>

          <button
            type="button"
            className={`secondary-button ${filter === 'unread' ? 'active-filter' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread ({unreadCount})
          </button>
        </div>

        <button
          type="button"
          className="text-button"
          onClick={onMarkAllNotificationsRead}
        >
          Mark all read
        </button>
      </div>

      {visibleNotifications.length > 0 ? (
        <div className="notifications-list">
          {visibleNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-card ${notification.isRead ? '' : 'unread'}`}
            >
              <div className="notification-card-top">
                <div>
                  <h3>{notification.title}</h3>
                  <p className="results-subtext">
                    {formatNotificationTime(notification.createdAt)}
                  </p>
                </div>

                {!notification.isRead && (
                  <span className="notification-unread-dot" />
                )}
              </div>

              <p>{notification.body}</p>

              <div className="notification-actions">
                {notification.actionPath ? (
                  <Link
                    to={notification.actionPath}
                    className="secondary-button"
                    onClick={() => onMarkNotificationRead(notification.id)}
                  >
                    Open
                  </Link>
                ) : null}

                {!notification.isRead && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => onMarkNotificationRead(notification.id)}
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state-card">
          <h3>No notifications here</h3>
          <p>Your activity feed is clear right now.</p>
        </div>
      )}
    </div>
  );
}

export default NotificationsPage;