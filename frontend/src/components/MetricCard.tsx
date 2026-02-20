import { ReactNode } from "react";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  titleClassName?: string;
  valueClassName?: string;
  iconClassName?: string;
}

export default function MetricCard({ 
  title, 
  value, 
  icon, 
  trend,
  className = "card card-glow p-6 group",
  titleClassName = "font-mono text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-3",
  valueClassName = "font-display text-3xl text-[var(--text-primary)] tracking-[-0.02em] leading-none",
  iconClassName = "flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] group-hover:border-[var(--accent)] group-hover:text-[var(--accent)] transition-all"
}: MetricCardProps) {
  return (
    <div className={className}>
      <div className="flex items-start justify-between">
        <div>
          <p className={titleClassName}>{title}</p>
          <p className={valueClassName}>{value}</p>
          {trend && (
            <span className={`inline-flex items-center gap-1 mt-3 px-2 py-0.5 rounded-md text-[11px] font-mono ${
              trend.isPositive
                ? 'bg-[var(--success-dim)] text-[var(--success)]'
                : 'bg-[var(--error-dim)] text-[var(--error)]'
            }`}>
              {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
            </span>
          )}
        </div>
        {icon && (
          <span className={iconClassName}>
            {icon}
          </span>
        )}
      </div>
    </div>
  );
}
