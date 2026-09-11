import React, { useEffect, useRef } from 'react';

// TableCell component to manage contentEditable cells cleanly
export const TableCell = React.memo(({ value, onInput, onBlur, className, rowIndex, colIndex, ...props }) => {
  const ref = useRef(null);

  // Sync value from props to DOM, but only if it's different from the DOM's current HTML.
  // This prevents cursor/caret resetting during typing.
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = (e) => {
    if (onInput) {
      onInput(e.currentTarget.innerHTML);
    }
  };

  const handleBlur = (e) => {
    if (onBlur) {
      onBlur(e.currentTarget.innerHTML);
    }
  };

  return (
    <div
      ref={ref}
      className={className}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      onBlur={handleBlur}
      {...props}
    />
  );
});

TableCell.displayName = 'TableCell';
export default TableCell;
