import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './ui/button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  hasNext: boolean;
  hasPrev: boolean;
  total?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  hasNext,
  hasPrev,
  total,
}: PaginationProps) {
  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(
        <Button
          key={i}
          onClick={() => onPageChange(i)}
          variant={i === currentPage ? 'default' : 'outline'}
          size="sm"
          className="min-w-[2.5rem]"
        >
          {i}
        </Button>
      );
    }

    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <Button
        onClick={() => onPageChange(1)}
        disabled={!hasPrev}
        variant="outline"
        size="icon"
      >
        <ChevronsLeft className="w-4 h-4" />
      </Button>

      <Button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPrev}
        variant="outline"
        size="icon"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      <div className="flex gap-1">{renderPageNumbers()}</div>

      <Button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNext}
        variant="outline"
        size="icon"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>

      <Button
        onClick={() => onPageChange(totalPages)}
        disabled={!hasNext}
        variant="outline"
        size="icon"
      >
        <ChevronsRight className="w-4 h-4" />
      </Button>

      {total !== undefined && (
        <span className="text-sm text-muted-foreground ml-4">
          Page {currentPage} of {totalPages} ({total} total)
        </span>
      )}
    </div>
  );
}





