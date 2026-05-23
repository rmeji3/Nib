import { useSettings } from '../../settings/hooks/use-settings';

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)}mo ago`;
  
  return `${Math.floor(diffInDays / 365)}y ago`;
}

export function useFormattedMeta() {
  const { settings } = useSettings();

  return (doc: { meta?: string; createdAt: string }) => {
    const date = new Date(doc.createdAt);
    let dateStr = '';
    if (settings.dateDisplay === 'relative') {
      dateStr = getRelativeTime(date);
    } else {
      dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return doc.meta ? `${dateStr} · ${doc.meta}` : dateStr;
  };
}
