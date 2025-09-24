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
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-sm text-gray-600">
        Página <span className="font-semibold text-gray-900">{page}</span> · {take} resultados por página
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={!canPrev}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-gray-900 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={!canNext}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:border-gray-900 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}
