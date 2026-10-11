export type EntityType =
  | 'page'
  | 'block'
  | 'relation'
  | 'database'
  | 'database_row'
  | 'database_cell'
  | 'tracker'
  | 'tracker_entry'
  | 'op'
  | 'sync_state'
  | 'permission'
  | 'operation';

export type OpType = 'insert' | 'update' | 'delete';

export interface Command {
  type: string;
  payload: any;
  metadata?: Record<string, any>;
  timestamp?: number;
  id?: string;
  transactionId?: string;
}

export interface Transaction {
  id: string;
  operations: Command[];
  undoOperations?: Command[];
  description?: string;
  timestamp: number;
}
