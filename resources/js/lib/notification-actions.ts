interface NotificationLike {
  type: string;
  title?: string | null;
  schedule_id?: string | null;
}

export interface NotificationAction {
  href: string;
  label: string;
}

const availabilityCallAction: NotificationAction = {
  href: '/dashboard',
  label: 'Responder',
};

export function getMemberNotificationAction(notification: NotificationLike): NotificationAction | null {
  if (notification.type === 'availability_call') {
    return availabilityCallAction;
  }

  if (!notification.schedule_id) {
    return null;
  }

  if (notification.type === 'substitute_request') {
    return {
      href: `/schedules/${notification.schedule_id}`,
      label: 'Responder pedido',
    };
  }

  if (
    (notification.type === 'schedule' || notification.type === 'confirmation')
    && notification.title !== 'Removido da escala'
  ) {
    return {
      href: `/schedules/${notification.schedule_id}`,
      label: 'Ver escala',
    };
  }

  return null;
}

export function getAdminNotificationAction(notification: NotificationLike): NotificationAction | null {
  // Leaders in the ministry pool are asked too; they answer on the member dashboard.
  if (notification.type === 'availability_call') {
    return availabilityCallAction;
  }

  if (notification.type === 'approval_request') {
    return {
      href: '/admin-app/users',
      label: 'Ver usuários',
    };
  }

  // Sent to the leader as a member (they were picked as a substitute), so the
  // accept/decline actions live on the member schedule page.
  if (notification.type === 'substitute_request' && notification.schedule_id) {
    return {
      href: `/schedules/${notification.schedule_id}`,
      label: 'Responder pedido',
    };
  }

  if (notification.type === 'change_request' && notification.schedule_id) {
    return {
      href: `/admin-app/schedules/${notification.schedule_id}`,
      label: 'Abrir escala',
    };
  }

  if ((notification.type === 'schedule' || notification.type === 'confirmation') && notification.schedule_id) {
    return {
      href: `/admin-app/schedules/${notification.schedule_id}`,
      label: 'Abrir escala',
    };
  }

  return null;
}
