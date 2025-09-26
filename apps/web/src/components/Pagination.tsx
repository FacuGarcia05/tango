"use client";

interface PaginationProps {
  page: number;
  take: number;
  canPrev: boolean;
  canNext: boolean;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, take, canPrev, canNext, onPageChange }: PaginationProps) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border bg-surface/90 px-4 py-3 shadow-sm">
      <div className="text-sm text-text-muted">
        Pagina <span className="font-semibold text-text">{page}</span> - {take} resultados por pagina</div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={!canPrev}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={!canNext}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-text transition hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}