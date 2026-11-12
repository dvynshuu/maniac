import React from 'react';
import ToggleBlock from './ToggleBlock';

/**
 * ToggleHeadingBlock delegates directly to ToggleBlock which natively
 * handles toggle heading levels 1, 2, and 3 without duplicating child
 * tree rendering or store subscriptions.
 */
export default function ToggleHeadingBlock({ block }: { block: any }) {
  return <ToggleBlock block={block} />;
}
