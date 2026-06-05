import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Phone, Mail, MapPin, Edit, AlertCircle, Network } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubCasteBadge } from "@/components/SubCasteBadge";

export const Route = createFileRoute("/_app/households/$id")({
  head: () => ({ meta: [{ title: "Household — Kunbo" }] }),
  component: HouseholdDetail,
});

const members = [
  { name: "Suresh Lalwani", rel: "Head", age: 58, gender: "M" },
  { name: "Kamla Lalwani", rel: "Spouse", age: 54, gender: "F" },
  { name: "Rajesh Lalwani", rel: "Son", age: 32, gender: "M" },
  { name: "Priya Lalwani", rel: "Daughter-in-law", age: 29, gender: "F" },
  { name: "Aarav Lalwani", rel: "Grandson", age: 6, gender: "M" },
  { name: "Meera Lalwani", rel: "Daughter", age: 26, gender: "F" },
];

function HouseholdDetail() {
  const { id } = Route.useParams();
  return (
    <div className="space-y-6">
      <Link to="/households" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to households
      </Link>

      <Card className="surface-elevated overflow-hidden">
        <div className="h-28 heritage-gradient" />
        <CardContent className="-mt-14 p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="grid h-24 w-24 place-items-center rounded-2xl border-4 border-card bg-gold/20 text-4xl font-bold text-[color:var(--gold)]">
                S
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">Lalwani Household</h1>
                  <SubCasteBadge name="Khatri" color="gold" />
                </div>
                <p className="text-sm text-muted-foreground">Head: Suresh Lalwani · ID #{id}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> Mithi, Tharparkar</span>
                  <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> +92 300 1234567</span>
                  <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> lalwani@community.org</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline"><Link to="/tree"><Network className="h-4 w-4 me-2" />View tree</Link></Button>
              <Button variant="outline"><AlertCircle className="h-4 w-4 me-2" />Request correction</Button>
              <Button className="heritage-gradient text-primary-foreground"><Edit className="h-4 w-4 me-2" />Edit</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 surface-elevated">
          <CardHeader><CardTitle>Members ({members.length})</CardTitle></CardHeader>
          <CardContent className="divide-y">
            {members.map((m, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className={`grid h-11 w-11 place-items-center rounded-full text-lg font-bold ${
                    m.gender === "M" ? "bg-primary/10 text-primary" : "bg-gold/15 text-[color:var(--gold)]"
                  }`}>
                    {m.gender === "M" ? "♂" : "♀"}
                  </div>
                  <div>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.age} years</div>
                  </div>
                </div>
                <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {m.rel}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="surface-elevated">
            <CardHeader><CardTitle>Relation Table · Sashan</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {[
                ["Father", "Late Lalchand Lalwani"],
                ["Mother", "Late Devi Lalwani"],
                ["Brothers", "Mahesh, Dinesh"],
                ["Sister", "Sunita Khatri"],
                ["Maternal", "Bhatia (Nani)"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b py-2 last:border-0">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="surface-elevated">
            <CardHeader><CardTitle>Contacts</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                { name: "Suresh (Head)", num: "+92 300 1234567" },
                { name: "Rajesh (Son)", num: "+92 311 9876543" },
                { name: "Meera (Daughter)", num: "+92 333 5550101" },
              ].map((c) => (
                <a key={c.num} href={`tel:${c.num}`} className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:bg-muted">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.num}</div>
                  </div>
                </a>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
