import { createContext } from 'react';

export const DragDropContext = createContext({
  activeId: null,
  overId: null,
  dropPosition: null, // 'top' | 'bottom'
});
