import { useTrackerStore } from '../stores/trackerStore';

export function useTrackers() {
  const trackers = useTrackerStore(s => s.trackers);
  const entries = useTrackerStore(s => s.entries);
  
  return { trackers, entries };
}
