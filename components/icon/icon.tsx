import type { StyleDesc } from "@gpuix/react";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
  Folder,
  FolderCheck,
  FolderOpen,
  Globe,
  Heart,
  Layers,
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
  Calendar,
  Play,
  Users,
  Clock,
  Timer,
  Settings,
  Check,
  CheckCircle,
  Trash2,
  Globe,
  AlertTriangle,
  ArrowLeft,
  RotateCcw,
  Heart,
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
