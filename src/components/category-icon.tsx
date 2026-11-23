import {
  Utensils,
  Car,
  Home,
  Gamepad2,
  HeartPulse,
  ShoppingBag,
  Receipt,
  Tag,
  Wallet,
  Briefcase,
  Plane,
  Coffee,
  Gift,
  Smartphone,
  Dumbbell,
  GraduationCap,
  Fuel,
  PiggyBank,
  Banknote,
  Landmark,
  type LucideIcon,
} from "lucide-react";

/** Mappe un nom d'icône (kebab-case, stocké en base) vers un composant lucide. */
const ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  car: Car,
  home: Home,
  "gamepad-2": Gamepad2,
  "heart-pulse": HeartPulse,
  "shopping-bag": ShoppingBag,
  receipt: Receipt,
  tag: Tag,
  wallet: Wallet,
  briefcase: Briefcase,
  plane: Plane,
  coffee: Coffee,
  gift: Gift,
  smartphone: Smartphone,
  dumbbell: Dumbbell,
  "graduation-cap": GraduationCap,
  fuel: Fuel,
  "piggy-bank": PiggyBank,
  banknote: Banknote,
  landmark: Landmark,
};

export function getCategoryIcon(name?: string | null): LucideIcon {
  return (name && ICONS[name]) || Tag;
}

/** Pastille ronde colorée avec l'icône de la catégorie. */
export function CategoryIcon({
  icon,
  color,
  className,
  size = 20,
}: {
  icon?: string | null;
  color: string;
  className?: string;
  size?: number;
}) {
  const Icon = getCategoryIcon(icon);
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color,
        backgroundColor: `${color}1f`, // ~12% opacité
      }}
    >
      <Icon width={size} height={size} />
    </span>
  );
}
