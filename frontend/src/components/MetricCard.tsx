import { ReactNode } from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export default function MetricCard({ title, value, icon, trend }: MetricCardProps) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-medium text-[var(--fg-muted)] uppercase tracking-wider mb-3">{title}</p>
          <p className="text-[28px] font-semibold text-[var(--fg-primary)] tracking-[-0.03em] leading-none">{value}</p>
          {trend && (
            <span className={`inline-flex items-center gap-1 mt-3 px-2 py-0.5 rounded-md text-[11px] font-medium ${
              trend.isPositive
                ? 'bg-[var(--success-muted)] text-[var(--success)]'
                : 'bg-[var(--error-muted)] text-[var(--error)]'
            }`}>
              {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
            </span>
          )}
        </div>
        {icon && (
          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--bg-tertiary)] text-[var(--fg-muted)]">
            {icon}
          </span>
        )}
      </div>
    </div>
  );
}
