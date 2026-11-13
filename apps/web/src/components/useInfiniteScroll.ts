import { useEffect, useRef } from 'react';

export function useInfiniteScroll(enabled: boolean, onLoadMore: () => void) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!enabled || !el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: '120px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, onLoadMore]);

  return sentinelRef;
}
