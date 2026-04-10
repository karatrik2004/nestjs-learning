export type UserRecord = {
  id: string;
  email: string;
  password: string;
  name: string | null;
  phone: string | null;
  profileImage: string | null;
  roleId: string | null;
  refreshTokenHash: string | null;
  roleMaster?: { name: string } | null;
};
