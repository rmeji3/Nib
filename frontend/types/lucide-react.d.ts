declare module 'lucide-react' {
  import { FC, SVGProps } from 'react';

  interface LucideProps extends SVGProps<SVGSVGElement> {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
    absoluteStrokeWidth?: boolean;
  }

  type LucideIcon = FC<LucideProps>;

  export const SettingsIcon: LucideIcon;
  export const KeyboardIcon: LucideIcon;
  export const LogOutIcon: LucideIcon;
  export const ChevronUpIcon: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronLeft: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const X: LucideIcon;
  export const Send: LucideIcon;
  export const Upload: LucideIcon;
  export const FileText: LucideIcon;
  export const Loader2: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const Check: LucideIcon;
  export const Search: LucideIcon;
  export const Plus: LucideIcon;
  export const Minus: LucideIcon;
  export const Trash2: LucideIcon;
  export const Eye: LucideIcon;
  export const EyeOff: LucideIcon;
  export const Menu: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const Info: LucideIcon;
  export const MessageSquare: LucideIcon;
  export const Bot: LucideIcon;
  export const User: LucideIcon;
  export const Copy: LucideIcon;
  export const ExternalLink: LucideIcon;
  export const ZoomIn: LucideIcon;
  export const ZoomOut: LucideIcon;
  export const RotateCw: LucideIcon;
  export const Download: LucideIcon;
  export const Maximize2: LucideIcon;
  export const Minimize2: LucideIcon;
  export const PanelLeftClose: LucideIcon;
  export const PanelLeftOpen: LucideIcon;
  export const Sparkles: LucideIcon;
  export const BookOpen: LucideIcon;
  export const ChevronUp: LucideIcon;
  export const MoreVertical: LucideIcon;
  export const UserIcon: LucideIcon;
  export const PaletteIcon: LucideIcon;
  export const BookOpenIcon: LucideIcon;
  export const MessageSquareIcon: LucideIcon;
  export const ShieldIcon: LucideIcon;
  export const InfoIcon: LucideIcon;
  export const ArrowLeftIcon: LucideIcon;
  export const CheckIcon: LucideIcon;
  export const RotateCcwIcon: LucideIcon;
  export const AlertTriangleIcon: LucideIcon;
  export const ActivityIcon: LucideIcon;
  export const BotIcon: LucideIcon;
  export const CoinsIcon: LucideIcon;
  export const FileTextIcon: LucideIcon;
  export const GaugeIcon: LucideIcon;
  export const ChevronRightIcon: LucideIcon;
  export const ChevronUpIcon: LucideIcon;
  export const RefreshCwIcon: LucideIcon;
  export const ShieldAlertIcon: LucideIcon;
  export const SparklesIcon: LucideIcon;

  // Catch-all for any other icon
  const _default: { [key: string]: LucideIcon };
  export default _default;
}
