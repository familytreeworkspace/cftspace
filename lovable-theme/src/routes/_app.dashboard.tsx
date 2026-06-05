import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users,
  Home,
  MapPin,
  Layers,
  TrendingUp,
  Upload,
  UserPlus,
  FileBarChart,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Kunbo" }] }),
  component: Dashboard,
});

function Stat({
  icon: Icon, label, value, delta, accent,
}: { icon: any; label: string; value: string; delta?: string; accent?: string }) {
  return (
    <Card className="surface-elevated overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">{label}</div>
            <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
            {delta && (
              <div className="mt-1 inline-flex items-center gap-1 text-xs text-success">
                <TrendingUp className="h-3 w-3" /> {delta}
              </div>
            )}
          </div>
          <div className={`grid h-11 w-11 place-items-center rounded-xl ${accent ?? "bg-primary/10 text-primary"}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { t } = useI18n();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("dashboard")}</h1>
          <p className="text-sm text-muted-foreground">Overview of your community records.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/import"><Upload className="h-4 w-4 me-2" />Import</Link></Button>
          <Button asChild className="heritage-gradient text-primary-foreground">
            <Link to="/households"><UserPlus className="h-4 w-4 me-2" />New household</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Home} label={t("totalHouseholds")} value="2,148" delta="+34 this week" />
        <Stat icon={Users} label={t("members")} value="11,432" delta="+128" accent="bg-gold/15 text-[color:var(--gold)]" />
        <Stat icon={Layers} label={t("subcastes")} value="36" accent="bg-success/15 text-success" />
        <Stat icon={MapPin} label={t("villages")} value="84" accent="bg-accent text-accent-foreground" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 surface-elevated">
          <CardHeader><CardTitle>Recent activity</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[
              { who: "Suresh Lalwani", act: "added a new member to Khatri household", time: "5m ago", ok: true },
              { who: "Anjali Bhatia", act: "requested correction on DOB for Rajesh", time: "1h ago" },
              { who: "Admin Bot", act: "imported 1,204 records from Tharparkar.xlsx", time: "3h ago", ok: true },
              { who: "Mukesh Sharma", act: "linked Tree node #4421 to spouse", time: "Yesterday", ok: true },
            ].map((a, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border bg-card/50 p-3">
                <div className={`mt-0.5 grid h-8 w-8 place-items-center rounded-full ${a.ok ? "bg-success/15 text-success" : "bg-gold/15 text-[color:var(--gold)]"}`}>
                  {a.ok ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm"><span className="font-medium">{a.who}</span> <span className="text-muted-foreground">{a.act}</span></div>
                  <div className="text-xs text-muted-foreground">{a.time}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="surface-elevated">
          <CardHeader><CardTitle>Import progress</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {[
              { l: "Sub Castes", v: 100 },
              { l: "Households", v: 78 },
              { l: "Members", v: 54 },
              { l: "Relations", v: 32 },
              { l: "Contacts", v: 18 },
            ].map((p) => (
              <div key={p.l}>
                <div className="mb-1 flex justify-between text-xs"><span>{p.l}</span><span className="text-muted-foreground">{p.v}%</span></div>
                <Progress value={p.v} className="h-2" />
              </div>
            ))}
            <Button asChild variant="outline" className="w-full">
              <Link to="/reports"><FileBarChart className="h-4 w-4 me-2" />View reports</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
