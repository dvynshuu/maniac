import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';

// A lightweight, zero-dependency virtualizer
export default function VirtualList({ 
  items, 
  itemHeight = 40, // Estimated height if dynamic is true
  renderItem, 
  containerHeight = 800, // Fallback if ref height fails
  overscan = 5,
  dynamic = false, // If true, items can have variable heights
  scrollContainerRef = null // If provided, attaches scroll listener to this parent
}) {
  const localContainerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(containerHeight);
  const [offsetYBase, setOffsetYBase] = useState(0); // Offset of the list within the scroll container

  // For dynamic height calculation
  const sizeMap = useRef(new Map());

  // Attach scroll and resize listeners to the appropriate container
  useEffect(() => {
    const scroller = scrollContainerRef?.current || localContainerRef.current;
    if (!scroller) return;

    const handleScroll = () => setScrollTop(scroller.scrollTop);
    scroller.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial read
    handleScroll();

    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setViewportHeight(entry.contentRect.height);
      }
    });
    observer.observe(scroller);
    
    return () => {
      scroller.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, [scrollContainerRef]);

  // Determine the offset of the list inside the scroller so we can subtract it from scrollTop
  useLayoutEffect(() => {
    const scroller = scrollContainerRef?.current || localContainerRef.current;
    if (scroller && localContainerRef.current && scrollContainerRef) {
      // Calculate top offset relative to scroller
      const scrollerRect = scroller.getBoundingClientRect();
      const listRect = localContainerRef.current.getBoundingClientRect();
      setOffsetYBase(listRect.top - scrollerRect.top + scroller.scrollTop);
    }
  }, [scrollContainerRef, items.length]);

  // If dynamic, recalculate heights
  const measureElement = (el, index) => {
    if (!el || !dynamic) return;
    const height = el.getBoundingClientRect().height;
    if (sizeMap.current.get(index) !== height) {
      sizeMap.current.set(index, height);
    }
  };

  // Adjust scrollTop relative to the list's own start position
  const relativeScrollTop = Math.max(0, scrollTop - offsetYBase);

  // Calculate visible range
  let startIndex = 0;
  let endIndex = 0;
  let offsetY = 0;

  if (dynamic) {
    let currentY = 0;
    for (let i = 0; i < items.length; i++) {
      const h = sizeMap.current.get(i) || itemHeight;
      if (currentY + h < relativeScrollTop) {
        currentY += h;
      } else if (startIndex === 0 && currentY >= relativeScrollTop) {
        startIndex = i;
        offsetY = currentY;
        currentY += h;
      } else if (currentY < relativeScrollTop + viewportHeight) {
        currentY += h;
      } else {
        endIndex = i;
        break;
      }
    }
    if (endIndex === 0) endIndex = items.length - 1;
  } else {
    startIndex = Math.max(0, Math.floor(relativeScrollTop / itemHeight));
    endIndex = Math.min(items.length - 1, Math.ceil((relativeScrollTop + viewportHeight) / itemHeight));
    offsetY = startIndex * itemHeight;
  }

  // Add overscan
  startIndex = Math.max(0, startIndex - overscan);
  endIndex = Math.min(items.length - 1, endIndex + overscan);
  
  if (!dynamic) {
     offsetY = startIndex * itemHeight;
  } else {
     offsetY = 0;
     for (let i = 0; i < startIndex; i++) {
        offsetY += sizeMap.current.get(i) || itemHeight;
     }
  }

  const visibleItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    if (items[i]) {
      visibleItems.push(
        <div 
          key={items[i].id || i}
          ref={(el) => measureElement(el, i)}
        >
          {renderItem(items[i], i)}
        </div>
      );
    }
  }

  const scrollHeight = dynamic 
    ? Array.from({ length: items.length }).reduce((acc, _, i) => acc + (sizeMap.current.get(i) || itemHeight), 0)
    : items.length * itemHeight;

  if (scrollContainerRef) {
    // Render without internal scroll if an external container is provided
    return (
      <div ref={localContainerRef} className="virtual-list-wrapper" style={{ height: scrollHeight, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, transform: `translateY(${offsetY}px)` }}>
          {visibleItems}
        </div>
      </div>
    );
  }

  // Render with internal scroll
  return (
    <div 
      ref={localContainerRef}
      style={{ height: '100%', overflowY: 'auto', position: 'relative' }}
      className="virtual-list-container"
    >
      <div style={{ height: scrollHeight, position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, transform: `translateY(${offsetY}px)` }}>
          {visibleItems}
        </div>
      </div>
    </div>
  );
}

