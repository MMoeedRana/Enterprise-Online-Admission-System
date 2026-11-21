'use client';

import { PageFade } from '@/components/ui/motion';
import type { LucideIcon } from 'lucide-react';
import { Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { useAuth } from '@/features/auth/auth-context';
import { cn } from '@/lib/utils';
import { useBrand } from '@/features/branding/brand-context';
import { LogoMark } from './logo';
import { NotificationBell } from './notification-bell';
import { ThemeToggle } from './theme-toggle';
import { Avatar, UserMenu } from './user-menu';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: string | string[];
  when?: 'ai';
}
export interface NavSection {
  title: string;
  items: NavItem[];
}

interface Props {
  sections: NavSection[];
  roleLabel: string;
  orgName: string;
  headerExtra?: ReactNode;
  banner?: ReactNode;
  brandMark?: { logoUrl: string; name: string };
  assistant?: ReactNode;
  children: ReactNode;
}

function Sidebar({
  sections,
  roleLabel,
  orgName,
  onNavigate,
  brandMark,
  collapsed = false,
  onToggle,
}: Pick<Props, 'sections' | 'roleLabel' | 'orgName' | 'brandMark'> & {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const pathname = usePathname();
  const { user, can, current } = useAuth();
  const brand = useBrand();
  return (
    <div className="bg-navy flex h-full flex-col text-slate-300">
      <div className={cn('flex h-[76px] min-w-0 items-center gap-3', collapsed ? 'justify-center px-2' : 'px-6')}>
        <LogoMark src={brandMark?.logoUrl || undefined} name={brandMark?.name} />
        {!collapsed && (
          <span className="truncate text-[20px] font-extrabold tracking-tight text-white">
            {brandMark?.name ?? brand.platformName}
          </span>
        )}
        {!onNavigate && onToggle && !collapsed && (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className="ml-auto rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            <PanelLeftClose className="size-4" />
          </button>
        )}
      </div>
      {collapsed && onToggle && (
        <button
          type="button"
          onClick={onToggle}
          aria-label="Expand sidebar"
          title="Expand sidebar"
          className="mx-auto mb-3 rounded-xl p-2.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
        >
          <PanelLeftOpen className="size-[18px]" />
        </button>
      )}
      <nav
        className={cn('elegant-scrollbar flex-1 overflow-y-auto pb-4', collapsed ? 'px-2' : 'px-4')}
        aria-label="Workspace"
      >
        {sections.map((s, i) => (
          <div key={s.title} className={cn(!collapsed && i > 0 && 'mt-6', collapsed && i > 0 && 'mt-3')}>
            {!collapsed && (
              <p className="px-3 pb-2 text-[11.5px] font-semibold tracking-[0.12em] text-slate-400 uppercase">
                {i === 0 ? roleLabel : s.title}
              </p>
            )}
            <ul className="space-y-1">
              {s.items
                .filter((it) => it.when !== 'ai' || Boolean(current?.ai?.copilot || current?.ai?.briefing))
                .filter(
                  (it) =>
                    !it.permission ||
                    (Array.isArray(it.permission) ? it.permission.some((p) => can(p)) : can(it.permission)),
                )
                .map((it) => {
                  const active = pathname === it.href || pathname.startsWith(it.href + '/');
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        onClick={onNavigate}
                        title={collapsed ? it.label.replace('{agent}', brand.agentName) : undefined}
                        className={cn(
                          'group relative flex items-center rounded-xl text-[14.5px] font-medium transition',
                          collapsed ? 'justify-center px-2.5 py-3' : 'gap-3 px-3.5 py-2.5',
                          active
                            ? 'bg-primary text-white shadow-[0_6px_18px_var(--ring)]'
                            : 'hover:bg-white/5 hover:text-white',
                        )}
                      >
                        <it.icon className="size-[19px]" strokeWidth={1.8} />
                        {!collapsed && it.label.replace('{agent}', brand.agentName)}
                        {collapsed && (
                          <span className="pointer-events-none absolute left-[calc(100%+10px)] z-[80] hidden rounded-lg bg-slate-950 px-2.5 py-1.5 text-[12px] font-semibold whitespace-nowrap text-white shadow-xl group-hover:block group-focus-visible:block">
                            {it.label.replace('{agent}', brand.agentName)}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </nav>
      {user && (
        <div
          className={cn(
            'bg-navy-line/70 flex items-center rounded-2xl',
            collapsed ? 'mx-auto mb-4 justify-center p-2' : 'm-4 gap-3 p-3.5',
          )}
        >
          <Avatar name={user.fullName} src={user.avatarUrl} />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-white">{user.fullName}</p>
              <p className="truncate text-[12.5px] text-slate-400">{orgName}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function StaffShell({
  sections,
  roleLabel,
  orgName,
  headerExtra,
  banner,
  brandMark,
  assistant,
  children,
}: Props) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() =>
    typeof window !== 'undefined' ? window.localStorage.getItem('admitra.sidebarCollapsed') === '1' : false,
  );
  const pathname = usePathname();
  const brand = useBrand();
  const activeItem = sections
    .flatMap((section) => section.items)
    .find((item) => pathname === item.href || pathname.startsWith(item.href + '/'));
  const routeLabel = activeItem?.label.replace('{agent}', brand.agentName) ?? roleLabel;
  const subtitles: Record<string, string> = {
    '/platform/dashboard': `The ${brand.platformName} platform at a glance`,
    '/platform/mitra': `Your admission operations copilot for the whole ${brand.platformName} platform`,
    '/platform/institutions': 'Manage institutions, plans, activation and invitations',
    '/platform/plans': 'Configure subscriptions, limits and platform plans',
    '/platform/billing': 'Verify subscription payments and set the accounts institutions pay into',
    '/platform/registry': 'Import and verify official academic registry records',
    '/platform/directory': 'Institutions, programs and closing merit used by the directory and the Admission Advisor',
    '/platform/analytics': 'Platform usage and admissions performance',
    '/platform/support': 'Manage applicant and institution support requests',
    '/platform/audit-log': 'Review security and administrative activity',
    '/platform/branding': 'Platform identity, colours and public appearance',
    '/institution/dashboard': `Your admission operations overview for ${orgName}`,
    '/institution/mitra': 'Your admission operations copilot for this institution',
    '/institution/analytics': 'Admissions, applications and enrolment reports',
    '/institution/applications': 'Review submitted applications and applicant records',
    '/institution/verifications': 'Verify marks and official academic records',
    '/institution/payments': 'Review, approve and reconcile admission payments',
    '/institution/merit-formulas': 'Configure the rules used to prepare merit lists',
    '/institution/merit-lists': 'Prepare, publish and manage admission merit lists',
    '/institution/offers': 'Manage offers, acceptance and enrolment',
    '/institution/campaigns': 'Create and manage admission campaigns',
    '/institution/programs': 'Manage offered programs and their details',
    '/institution/structure': 'Maintain faculties, departments and campuses',
    '/institution/staff': 'Manage staff accounts, roles and permissions',
    '/institution/document-requirements': 'Define documents applicants must submit',
    '/institution/email-templates': 'Configure applicant and staff e-mail notifications',
    '/institution/directory': 'Review and update your institution directory data',
    '/institution/support': 'Create and manage support requests',
    '/institution/audit-log': 'Review activity across this institution',
    '/institution/billing': 'Your plan, trial and subscription payments',
    '/institution/settings': 'Institution profile, branding and workspace settings',
  };
  const routeSubtitle =
    Object.entries(subtitles).find(([href]) => pathname === href || pathname.startsWith(href + '/'))?.[1] ?? '';
  const toggleCollapsed = () => {
    setCollapsed((value) => {
      const next = !value;
      window.localStorage.setItem('admitra.sidebarCollapsed', next ? '1' : '0');
      return next;
    });
  };

  return (
    <div className="bg-page min-h-dvh">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-200 lg:block',
          collapsed ? 'w-[76px]' : 'w-[240px] xl:w-[260px]',
        )}
      >
        <Sidebar
          sections={sections}
          roleLabel={roleLabel}
          orgName={orgName}
          brandMark={brandMark}
          collapsed={collapsed}
          onToggle={toggleCollapsed}
        />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw] shadow-2xl">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute top-5 right-3 z-10 rounded-lg p-1.5 text-slate-300 hover:bg-white/10"
            >
              <X className="size-5" />
            </button>
            <Sidebar
              sections={sections}
              roleLabel={roleLabel}
              orgName={orgName}
              brandMark={brandMark}
              onNavigate={() => setOpen(false)}
            />
          </aside>
        </div>
      )}

      <div
        className={cn('transition-[padding] duration-200', collapsed ? 'lg:pl-[76px]' : 'lg:pl-[240px] xl:pl-[260px]')}
      >
        <header className="border-line bg-card/90 sticky top-0 z-30 flex h-16 items-center gap-3 border-b px-4 backdrop-blur sm:px-6 lg:h-[76px] lg:px-8">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="border-line bg-card text-ink flex size-10 items-center justify-center rounded-xl border lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          {headerExtra}
          <div className="min-w-0 flex-1 px-1 sm:px-2">
            <h1 className="text-ink truncate text-[15px] font-bold sm:text-[17px]">{routeLabel}</h1>
            {routeSubtitle && (
              <p className="text-muted max-w-full truncate text-[10.5px] sm:text-[11.5px] lg:text-[12.5px]">
                {routeSubtitle}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <NotificationBell />
            <UserMenu />
          </div>
        </header>
        {banner}
        <main className="w-full px-4 py-4 sm:px-6 lg:px-8 lg:py-6 2xl:px-12">
          <PageFade>{children}</PageFade>
        </main>
      </div>
      {assistant}
    </div>
  );
}
