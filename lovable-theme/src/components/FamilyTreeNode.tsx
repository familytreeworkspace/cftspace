import { cn } from "@/lib/utils";

type Gender = "M" | "F";
type AgeBand = "child" | "adult" | "elderly";

export interface TreeNodeData {
  id: string;
  name: string;
  gender: Gender;
  age?: number;
  born?: string;
  died?: string;
  photo?: string;
  role?: string;
}

function ageBand(age?: number): AgeBand {
  if (age === undefined) return "adult";
  if (age < 16) return "child";
  if (age >= 60) return "elderly";
  return "adult";
}

function SymbolGlyph({ gender, band }: { gender: Gender; band: AgeBand }) {
  const sizeFor: Record<AgeBand, string> = {
    child: "text-2xl",
    adult: "text-4xl",
    elderly: "text-4xl opacity-80",
  };
  const colorFor = gender === "M" ? "text-primary" : "text-[color:var(--gold)]";
  return (
    <div className={cn("flex h-full w-full items-center justify-center", sizeFor[band], colorFor)}>
      {gender === "M" ? "♂" : "♀"}
    </div>
  );
}

export function FamilyTreeNode({
  node,
  graphic = true,
  selected = false,
  onClick,
}: {
  node: TreeNodeData;
  graphic?: boolean;
  selected?: boolean;
  onClick?: () => void;
}) {
  const band = ageBand(node.age);
  const bandLabel = band === "child" ? "Child" : band === "elderly" ? "Elder" : "Adult";

  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-44 flex-col items-center gap-2 rounded-2xl border bg-card p-3 text-center transition-all hover:-translate-y-0.5 hover:shadow-lg surface-elevated",
        selected ? "ring-2 ring-primary border-primary/50" : "border-border",
      )}
    >
      <div
        className={cn(
          "relative h-20 w-20 overflow-hidden rounded-full border-2",
          node.gender === "M" ? "border-primary/40 bg-primary/5" : "border-gold/40 bg-gold/10",
        )}
      >
        {graphic && node.photo ? (
          <img src={node.photo} alt={node.name} className="h-full w-full object-cover" />
        ) : (
          <SymbolGlyph gender={node.gender} band={band} />
        )}
        <span className="absolute -bottom-0.5 -right-0.5 rounded-full border bg-card px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
          {bandLabel}
        </span>
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-foreground">{node.name}</div>
        {node.role && (
          <div className="truncate text-[11px] text-muted-foreground">{node.role}</div>
        )}
        {(node.born || node.died) && (
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {node.born ?? "?"} — {node.died ?? "•"}
          </div>
        )}
      </div>
    </button>
  );
}
