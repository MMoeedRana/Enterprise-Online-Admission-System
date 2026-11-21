'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  subtitle,
  actions,
  crumbs,
  subtitleClassName,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  crumbs?: { label: string; href?: string }[];
  subtitleClassName?: string;
}) {
  const pathname = usePathname();
  const staff = pathname.startsWith('/platform/') || pathname.startsWith('/institution/');
  const trail = crumbs && (
    <nav aria-label="Breadcrumb" className="text-muted mb-2 flex flex-wrap items-center gap-1 text-[12.5px]">
      {crumbs.map((c, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {c.href ? (
            <Link href={c.href} className="hover:text-primary">
              {c.label}
            </Link>
          ) : (
            <span className="text-ink">{c.label}</span>
          )}
          {i < crumbs.length - 1 && <ChevronRight className="size-3.5" />}
        </span>
      ))}
    </nav>
  );
  if (staff) {
    if (!actions && !crumbs) return null;
    return (
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">{trail}</div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    );
  }
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        {trail}
        <h1 className="text-[22px] leading-tight font-bold tracking-tight">{title}</h1>
        {subtitle && <p className={cn('text-muted mt-1 text-[13.5px]', subtitleClassName)}>{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
