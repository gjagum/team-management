interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

/** Compact pager used by every list/table so long data sets stay readable. */
export default function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const button =
    'px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 border-t border-zinc-100">
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-500">
        Showing {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={`${button} bg-zinc-100 text-zinc-600 hover:bg-zinc-200`}
        >
          Prev
        </button>
        <span className="px-2 text-[11px] font-bold text-zinc-600">
          {page} / {pages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          className={`${button} bg-zinc-100 text-zinc-600 hover:bg-zinc-200`}
        >
          Next
        </button>
      </div>
    </div>
  );
}
