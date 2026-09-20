import type { StyleDesc } from "@gpuix/react";
import {
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
} as const;

export type IconName = keyof typeof icons;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleDesc;
}

export type PresetIconProps = Omit<IconProps, "name">;

export function Icon({
  name,
  size = 16,
  color = "#fafafa",
  style = {},
}: IconProps) {
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
