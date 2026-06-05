import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, MapPin, Users, Filter } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SubCasteBadge } from "@/components/SubCasteBadge";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/households")({
  head: () => ({ meta: [{ title: "Households — Kunbo" }] }),
  component: HouseholdsPage,
});

const subCastes = [
  { id: "all", name: "All", count: 2148 },
  { id: "khatri", name: "Khatri", count: 412 },
  { id: "lohana", name: "Lohana", count: 358 },
  { id: "bhatia", name: "Bhatia", count: 287 },
  { id: "sodha", name: "Sodha Rajput", count: 198 },
  { id: "brahmin", name: "Pushkarna Brahmin", count: 156 },
  { id: "mehta", name: "Mehta", count: 134 },
];

const households = Array.from({ length: 12 }, (_, i) => ({
  id: `h-${i + 1}`,
  head: ["Suresh Lalwani", "Mahesh Bhatia", "Kamla Devi", "Rajesh Khatri", "Anita Sodha", "Vinod Mehta"][i % 6],
  caste: ["Khatri", "Lohana", "Bhatia", "Sodha Rajput", "Mehta"][i % 5],
  members: 3 + (i % 7),
  village: ["Mithi", "Islamkot", "Diplo", "Nagarparkar", "Chachro"][i % 5],
}));

function HouseholdsPage() {
  const { t, lang } = useI18n();
  const [active, setActive] = useState("all");
  const filtered = active === "all" ? households : households.filter((h) => h.caste.toLowerCase().includes(active));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("households")}</h1>
        <p className="text-sm text-muted-foreground">{filtered.length} of {households.length} shown</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-1 rounded-2xl border bg-card p-3 h-fit surface-elevated">
          <div className="flex items-center gap-2 px-2 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Filter className="h-3 w-3" /> {t("subcastes")}
          </div>
          {subCastes.map((s) => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                active === s.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              <span className="font-medium">{s.name}</span>
              <span className={`text-xs ${active === s.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {s.count}
              </span>
            </button>
          ))}
        </aside>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder={t("search")} className="ps-10 h-11" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((h) => (
              <Link key={h.id} to="/households/$id" params={{ id: h.id }}>
                <Card className="surface-elevated overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="h-20 heritage-gradient" />
                  <CardContent className="-mt-10 p-4">
                    <div className="mb-3 flex items-end gap-3">
                      <div className="grid h-16 w-16 place-items-center rounded-2xl border-4 border-card bg-gold/20 text-2xl font-bold text-[color:var(--gold)]">
                        {h.head[0]}
                      </div>
                      <SubCasteBadge name={h.caste} color="gold" className="mb-1" />
                    </div>
                    <div className="font-semibold">{h.head}</div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {h.members} {t("members")}</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {h.village}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
