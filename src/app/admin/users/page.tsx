import { getUserProfiles } from './actions';
import { UsersClientWrapper } from './users-client';

export default async function AdminUsersPage() {
  const users = await getUserProfiles();

  return <UsersClientWrapper initialUsers={users} />;
}
