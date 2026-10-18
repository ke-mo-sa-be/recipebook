import { UpdateNotice } from '../about/UpdateNotice.tsx';
import { useUpdateNotice } from '../about/seen.ts';
import { InstallCard } from '../install/InstallCard.tsx';

/** At most one card above the greeting: "what's new" after an update, otherwise the install offer. */
export function HomeNotice() {
  const [updated, dismissUpdate] = useUpdateNotice();
  return updated ? <UpdateNotice onDismiss={dismissUpdate} /> : <InstallCard />;
}
