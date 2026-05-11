import * as React from "react";
import { Search } from "lucide-react";

interface JobSearch {
  id: string;
  keyword: string;
  location: string;
  results: number;
  created_at: string;
}

export function RecentSearches({ searches }: { searches: JobSearch[] }) {
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Recent Job Searches</h3>
        <span className="text-xs text-muted-foreground">{searches.length} total</span>
      </div>
      {searches.length === 0 ? (
        <div className="mt-6 flex flex-col items-center rounded-xl border border-dashed border-border py-10 text-center">
          <Search className="h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-foreground">You haven't searched for jobs yet.</p>
          <button className="mt-4 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-xs font-medium text-primary-foreground">
            Start your first search
          </button>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {searches.map((s) => (
            <li
              key={s.id}
              className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{s.keyword}</p>
                <p className="text-xs text-muted-foreground">
                  {s.location} • {s.results} results
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{formatDate(s.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
