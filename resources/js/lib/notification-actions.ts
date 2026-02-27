interface NotificationLike {
  type: string;
  title?: string | null;
  schedule_id?: string | null;
}

export interface NotificationAction {
  href: string;
  label: string;
}

export function getMemberNotificationAction(notification: NotificationLike): NotificationAction | null {
  if (!notification.schedule_id) {
    return null;
  }

  if (notification.type === 'schedule' && notification.title !== 'Removido da escala') {
    return {
      href: `/schedules/${notification.schedule_id}`,
      label: 'Ver escala',
    };
  }

  return null;
}

export function getAdminNotificationAction(notification: NotificationLike): NotificationAction | null {
  if (notification.type === 'approval_request') {
    return {
      href: '/admin-app/users',
      label: 'Ver usuários',
    };
  }

  if (notification.type === 'change_request' && notification.schedule_id) {
    return {
      href: `/admin-app/schedules/${notification.schedule_id}`,
      label: 'Abrir escala',
    };
  }

  if (notification.type === 'schedule' && notification.schedule_id) {
    return {
      href: `/admin-app/schedules/${notification.schedule_id}`,
      label: 'Abrir escala',
    };
  }

  return null;
}
