export interface Tracker {
  id: string;
  name: string;
  type?: 'habit' | 'number';
  goal?: number;
  unit?: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
  [key: string]: any;
}

export interface TrackerField {
  id: string;
  name: string;
  type: string;
  [key: string]: any;
}

export interface TrackerEntry {
  id: string;
  trackerId: string;
  date?: string;
  value?: any;
  createdAt: number;
  updatedAt: number;
  [key: string]: any;
}
