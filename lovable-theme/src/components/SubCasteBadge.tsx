import { cn } from "@/lib/utils";

export function SubCasteBadge({
  name,
  color = "default",
  className,
}: {
  name: string;
  color?: "default" | "gold" | "muted";
  className?: string;
}) {
  const styles = {
    default: "bg-primary/10 text-primary border-primary/20",
    gold: "bg-gold/15 text-gold-foreground border-gold/30",
    muted: "bg-muted text-muted-foreground border-border",
  }[color];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        styles,
        className,
      )}
    >
      {name}
    </span>
  );
}
