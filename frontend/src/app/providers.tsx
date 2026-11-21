'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MotionConfig } from 'framer-motion';
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Toaster } from '@/components/ui/toast';
import { AuthProvider } from '@/features/auth/auth-context';
import { NotificationSocket } from '@/features/notifications/notifications';
import { BrandProvider } from '@/features/branding/brand-context';
import { PlatformBrandStyle } from '@/features/branding/brand-style';
import type { Brand } from '@/lib/brand';

let browserClient: QueryClient | undefined;

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
    },
  });
}

function getQueryClient() {
  if (typeof window === 'undefined') return makeClient();
  browserClient ??= makeClient();
  return browserClient;
}

export function Providers({ children, brand }: { children: ReactNode; brand: Brand }) {
  useEffect(() => {
    const timers = new WeakMap<Element, number>();
    const findScrollable = (start: EventTarget | null) => {
      let target = start instanceof Element ? start : document.documentElement;
      while (target !== document.documentElement) {
        const style = window.getComputedStyle(target);
        const overflowY = style.overflowY;
        if (
          (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
          target.scrollHeight > target.clientHeight
        )
          return target;
        target = target.parentElement ?? document.documentElement;
      }
      return document.documentElement;
    };
    const reveal = (start: EventTarget | null) => {
      const target = findScrollable(start);
      target.classList.add('is-scrolling');
      const old = timers.get(target);
      if (old) window.clearTimeout(old);
      timers.set(
        target,
        window.setTimeout(() => target.classList.remove('is-scrolling'), 900),
      );
    };
    const onScroll = (event: Event) => {
      reveal(event.target);
    };
    const onWheel = (event: WheelEvent) => reveal(event.target);
    const onTouchMove = (event: TouchEvent) => reveal(event.target);
    document.addEventListener('scroll', onScroll, true);
    document.addEventListener('wheel', onWheel, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      document.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('wheel', onWheel);
      document.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <QueryClientProvider client={getQueryClient()}>
        <BrandProvider initial={brand}>
          <PlatformBrandStyle />
          <AuthProvider>
            <MotionConfig reducedMotion="user">{children}</MotionConfig>
            <NotificationSocket />
            <Toaster />
          </AuthProvider>
        </BrandProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
