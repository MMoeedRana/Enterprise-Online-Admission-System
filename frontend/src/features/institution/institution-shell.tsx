'use client';

import type { ChangeEvent, ReactNode } from 'react';
import { StaffShell } from '@/components/layout/staff-shell';
import { useAuth } from '@/features/auth/auth-context';
import { InstitutionBrandStyle } from '@/features/branding/brand-style';
import { MitraLauncher } from '@/features/mitra/launcher';
import { STAFF_ROLES } from '@/lib/constants';
import { institutionNav } from './nav';
import { SubscriptionBanner } from './subscription-banner';
import { Select } from '@/components/ui/input';

function InstitutionSwitcher() {
  const { memberships, current, selectInstitution } = useAuth();
  if (!current) return null;
  if (memberships.length < 2) {
    return <p className="text-ink hidden truncate text-[15px] font-bold sm:block">{current.name}</p>;
  }
  return (
    <label className="relative hidden sm:block">
      <span className="sr-only">Institution</span>
      <Select
        value={current.institutionId}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => selectInstitution(e.target.value)}
        className="w-[210px]"
        aria-label="Institution"
      >
        {memberships.map((m) => (
          <option key={m.institutionId} value={m.institutionId}>
            {m.name}
          </option>
        ))}
      </Select>
    </label>
  );
}

export function InstitutionShell({ children }: { children: ReactNode }) {
  const { current } = useAuth();
  const role = current?.roles.includes('INSTITUTION_ADMIN')
    ? STAFF_ROLES.INSTITUTION_ADMIN
    : current?.roles.map((r) => STAFF_ROLES[r]).join(' · ');
  const b = current?.branding?.active ? current.branding : null;
  return (
    <>
      {b && <InstitutionBrandStyle primaryColor={b.primaryColor} sidebarColor={b.sidebarColor} />}
      <StaffShell
        key={current?.institutionId}
        brandMark={b?.logoUrl ? { logoUrl: b.logoUrl, name: current!.shortName || current!.name } : undefined}
        sections={institutionNav}
        roleLabel={role ?? 'Staff'}
        orgName={current?.name ?? ''}
        headerExtra={<InstitutionSwitcher />}
        banner={<SubscriptionBanner />}
        assistant={
          current?.ai?.copilot && current.permissions.includes('ai.copilot') ? (
            <MitraLauncher scope="institution" />
          ) : undefined
        }
      >
        {children}
      </StaffShell>
    </>
  );
}
