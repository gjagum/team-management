import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import Pagination from '../components/Pagination';
import type { ActivityCategory, ActivityItem, ActivityResponse } from '../types';

const FILTERS: { key: ActivityCategory; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'leave', label: 'Leave' },
  { key: 'overtime', label: 'Overtime' },
  { key: 'employees', label: 'Employees' },
  { key: 'system', label: 'System' },
];

const PAGE_SIZE = 15;

const CATEGORY_STYLE: Record<string, string> = {
  leave: 'bg-primary/10 text-primary',
  overtime: 'bg-amber-50 text-amber-700',
  employees: 'bg-emerald-50 text-emerald-700',
  system: 'bg-zinc-100 text-zinc-600',
};

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Activity() {
  const [category, setCategory] = useState<ActivityCategory>('all');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchActivity = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await api.get<ActivityResponse>('/dashboard/activity', {
        params: { category, page, pageSize: PAGE_SIZE },
        signal,
      });
      setItems(res.data.items);
      setTotal(res.data.total);
    } catch (error: any) {
      if (error?.name !== 'CanceledError' && error?.name !== 'AbortError') {
        console.error('Failed to load activity:', error);
      }
    } finally {
      setLoading(false);
    }
  }, [category, page]);

  useEffect(() => {
    const controller = new AbortController();
    fetchActivity(controller.signal);
    return () => controller.abort();
  }, [fetchActivity]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl md:text-5xl font-black text-on-surface tracking-tighter">Activity Log</h1>
        <p className="text-zinc-500 mt-2 whitespace-nowrap">
          Every leave, overtime, people and system change, newest first.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter.key}
            onClick={() => {
              setCategory(filter.key);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors ${
              category === filter.key
                ? 'bg-primary/10 text-primary'
                : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="bg-surface-container-low p-1 rounded-xl">
        <div className="bg-surface-container-lowest editorial-shadow rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-zinc-300 text-5xl mb-4 block">history</span>
              <p className="text-zinc-400 font-medium">No activity yet.</p>
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 px-6 py-3 hover:bg-zinc-50 transition-colors">
                  <span
                    className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider ${
                      CATEGORY_STYLE[item.category] || CATEGORY_STYLE.system
                    }`}
                  >
                    {item.category}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-on-surface tracking-tight truncate">
                      {item.actor}
                      <span className="font-medium text-zinc-500"> — {item.summary.toLowerCase()}</span>
                    </p>
                    <p className="text-[11px] text-zinc-400">{new Date(item.at).toLocaleString()}</p>
                  </div>
                  <span className="text-[11px] font-bold text-zinc-400 whitespace-nowrap">
                    {relativeTime(item.at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
}
