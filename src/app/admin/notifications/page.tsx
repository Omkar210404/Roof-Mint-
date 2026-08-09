import { getAdminNotificationsLog, getUsersAndPropertiesForSelect } from './actions';
import { NotificationsAdminClientWrapper } from './notifications-admin-client';

export default async function AdminNotificationsPage() {
  const logs = await getAdminNotificationsLog();
  const { users, properties } = await getUsersAndPropertiesForSelect();

  return (
    <NotificationsAdminClientWrapper
      initialLogs={logs}
      users={users}
      properties={properties}
    />
  );
}
