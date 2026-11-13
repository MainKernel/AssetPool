import { Button } from './Button.js';

export interface LoadMoreButtonProps {
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore: () => void;
}

export function LoadMoreButton({
  hasNextPage = false,
  isFetchingNextPage = false,
  onLoadMore,
}: LoadMoreButtonProps) {
  if (!hasNextPage) return null;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 'var(--space-3)' }}>
      <Button variant="ghost" loading={isFetchingNextPage} onClick={onLoadMore}>
        Завантажити ще
      </Button>
    </div>
  );
}
