export type FaqRecord = {
  id: string;
  question: string;
  answer: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};
