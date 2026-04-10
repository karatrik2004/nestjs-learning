export type RoleRecord = {
  _id: string;
  name: string;
  description: string | null;
  canAccessBackend: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};
