import { Bookmark, Home, Plus, Search, UserRound, type LucideIcon } from 'lucide-react';

export type NavItem = { to: string; labelKey: string; icon: LucideIcon; primary?: boolean };

// Order is the mobile bottom-nav order: Home · Search · Add · Saved · Profile.
export const NAV_ITEMS: NavItem[] = [
  { to: '/', labelKey: 'nav.home', icon: Home },
  { to: '/search', labelKey: 'nav.search', icon: Search },
  { to: '/add', labelKey: 'nav.add', icon: Plus, primary: true },
  { to: '/saved', labelKey: 'nav.saved', icon: Bookmark },
  { to: '/me', labelKey: 'nav.profile', icon: UserRound },
];
