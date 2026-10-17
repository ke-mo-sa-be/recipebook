import { Bookmark, Home, Plus, Search, UserRound, type LucideIcon } from 'lucide-react';

export type NavItem = { to: string; labelKey: string; icon: LucideIcon; primary?: boolean };

// Mobile floating-nav order: Home · Search · Add · Saved · Profile. Labels use the short nav.tab.* keys.
export const NAV_ITEMS: NavItem[] = [
  { to: '/', labelKey: 'nav.tab.home', icon: Home },
  { to: '/search', labelKey: 'nav.tab.search', icon: Search },
  { to: '/add', labelKey: 'nav.tab.add', icon: Plus, primary: true },
  { to: '/saved', labelKey: 'nav.tab.saved', icon: Bookmark },
  { to: '/me', labelKey: 'nav.tab.profile', icon: UserRound },
];
