export interface Page {
  id: string;
  workspaceId: string;
  parentId: string | null;
  title: string;
  icon?: string;
  coverImage?: string | null;
  fullWidth?: boolean;
  sortOrder: string;
  orderKey: string;
  isArchived: boolean;
  createdBy: string;
  createdAt: number;
  updatedAt: number;
  lastViewedAt: number;
  tombstonedAt?: number | null;
  [key: string]: any;
}
