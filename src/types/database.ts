export type DatabaseColumnType =
  | 'text'
  | 'number'
  | 'select'
  | 'multi_select'
  | 'date'
  | 'checkbox'
  | 'url'
  | 'email'
  | 'phone'
  | 'formula'
  | 'relation'
  | 'rollup'
  | 'status'
  | 'created_at'
  | 'created_time'
  | 'created_by'
  | 'last_edited_time'
  | 'last_edited_by';

export interface DatabaseColumn {
  id: string;
  name: string;
  type: DatabaseColumnType;
  width?: number;
  config?: Record<string, any>;
  [key: string]: any;
}

export type DatabaseProperty = DatabaseColumn;

export interface DatabaseRow {
  id: string;
  blockId: string;
  createdAt: number;
  updatedAt: number;
  [key: string]: any;
}

export interface DatabaseCell {
  id: string;
  rowId: string;
  propertyId: string;
  blockId: string;
  value: any;
  createdAt: number;
  updatedAt: number;
  [key: string]: any;
}
