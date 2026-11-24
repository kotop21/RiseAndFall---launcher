import type { StyleDesc } from "@gpuix/react";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle,
  CircleCheck,
  Clock,
  Download,
  ExternalLink,
  Folder,
  FolderCheck,
  FolderOpen,
  Globe,
  Heart,
  Info,
  Layers,
  MousePointerClick,
  Play,
  RefreshCw,
  RotateCcw,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Timer,
  Trash2,
  Upload,
  Users,
  Wrench,
  X,
  XCircle,
} from "lucide-static";

const icons = {
  ExternalLink,
  FolderCheck,
  FolderOpen,
  Folder,
  Download,
  Upload,
  Sparkles,
  Wrench,
  RefreshCw,
  SlidersHorizontal,
  Tag,
  Layers,
  MousePointerClick,
  Calendar,
  Play,
  Users,
  Clock,
  Timer,
  Settings,
  Check,
  CheckCircle,
  CircleCheck,
  Trash2,
  Globe,
  AlertTriangle,
  ArrowLeft,
  RotateCcw,
  Heart,
  Info,
  X,
  XCircle,
} as const;

export type IconName = keyof typeof icons;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleDesc;
}

export type PresetIconProps = Omit<IconProps, "name">;

export function Icon({ name, size = 16, color = "#fafafa", style = {} }: IconProps) {
  const source = icons[name];

  if (!source) {
    return null;
  }

  return (
    <svg
      source={source}
      style={{
        width: size,
        height: size,
        color,
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
