/// <reference types="vite/client" />

declare module '*?worker' {
  const workerConstructor: {
    new (): Worker;
  };
  export default workerConstructor;
}

declare module 'react-force-graph-2d' {
  import { ComponentType } from 'react';
  const ForceGraph2D: ComponentType<any>;
  export default ForceGraph2D;
}

interface Window {
  __isDraggingSelection?: boolean;
}
