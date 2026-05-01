import {
  BarChart3,
  Users,
  Clock,
  Paperclip,
  CalendarDays,
  Palmtree,
  ClipboardList,
  Wrench,
  Receipt,
  Settings,
  Menu,
  RefreshCw,
  Inbox,
  CheckCircle2,
  XCircle,
  Circle,
  MapPin,
  Monitor,
  Camera,
  Building2,
  ShieldCheck,
  Lock,
  KeyRound,
  MessageCircle,
  Home,
  CircleAlert,
  PenLine,
  MoreVertical,
} from 'lucide-react';

const ICONS = {
  dashboard: BarChart3,
  colaboradores: Users,
  jornadas: Clock,
  ausencias: Paperclip,
  feriados: CalendarDays,
  ferias: Palmtree,
  relatorios: ClipboardList,
  ajustes: Wrench,
  solicitacoes: Receipt,
  configuracoes: Settings,
  menu: Menu,
  refresh: RefreshCw,
  inbox: Inbox,
  ok: CheckCircle2,
  erro: XCircle,
  dot: Circle,
  mapa: MapPin,
  monitor: Monitor,
  camera: Camera,
  empresa: Building2,
  shield: ShieldCheck,
  lock: Lock,
  key: KeyRound,
  whatsapp: MessageCircle,
  home: Home,
  alert: CircleAlert,
  assinar: PenLine,
  more: MoreVertical,
};

export default function AppIcon({
  name,
  size = 18,
  strokeWidth = 2.25,
  className,
  color,
  'aria-label': ariaLabel,
  ...rest
}) {
  const Icon = ICONS[name];
  if (!Icon) return null;

  return (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      color={color}
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      {...rest}
    />
  );
}

