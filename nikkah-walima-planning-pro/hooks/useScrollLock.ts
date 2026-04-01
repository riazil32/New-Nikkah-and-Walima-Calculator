import { useEffect } from 'react';

/**
 * Locks background scrolling when `isLocked` is true.
 * Supports multiple concurrent locks (only unlocks when all are released).
 */
let lockCount = 0;

export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;
    
    lockCount++;
    document.body.style.overflow = 'hidden';
    
    return () => {
      lockCount--;
      if (lockCount <= 0) {
        lockCount = 0;
        document.body.style.overflow = '';
      }
    };
  }, [isLocked]);
}
