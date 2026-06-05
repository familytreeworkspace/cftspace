import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, X, Clock, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/corrections")({
  head: () => ({ meta: [{ title: "Corrections — Kunbo" }] }),
  component: CorrectionsPage,
});

const requests = [
  { id: "r1", who: "Rajesh Lalwani", field: "Date of birth", from: "1992-01-01", to: "1992-04-15", when: "2h ago", status: "pending" },
  { id: "r2", who: "Anita Sodha", field: "Village", from: "Diplo", to: "Nagarparkar", when: "Yesterday", status: "pending" },
  { id: "r3", who: "Vinod Mehta", field: "Spouse name", from: "Sunita", to: "Sunita Devi", when: "2 days ago", status: "pending" },
];
const history = [
  { who: "M. Bhatia", action: "approved correction on Phone#", when: "1d ago", ok: true },
  { who: "Chief Admin", action: "rejected DOB change for Anil", when: "3d ago", ok: false },
];

function CorrectionsPage() {
  const [active, setActive] = useState(requests[0].id);
  const sel = requests.find((r) => r.id === active)!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Correction requests</h1>
        <p className="text-sm text-muted-foreground">Review and act on community submissions.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card className="surface-elevated h-fit">
          <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-4 w-4" />Pending ({requests.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {requests.map((r) => (
                <button key={r.id} onClick={() => setActive(r.id)} className={`block w-full text-start px-6 py-3 transition ${
                  active === r.id ? "bg-primary/5 border-s-2 border-primary" : "hover:bg-muted"
                }`}>
                  <div className="font-medium">{r.who}</div>
                  <div className="text-xs text-muted-foreground">{r.field} · {r.when}</div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="surface-elevated">
            <CardHeader><CardTitle>Request detail</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-card p-3">
                  <div className="text-xs text-muted-foreground">Requested by</div>
                  <div className="font-medium">{sel.who}</div>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <div className="text-xs text-muted-foreground">Field</div>
                  <div className="font-medium">{sel.field}</div>
                </div>
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <div className="text-xs text-destructive">From</div>
                  <div className="font-mono">{sel.from}</div>
                </div>
                <div className="rounded-lg border border-success/30 bg-success/5 p-3">
                  <div className="text-xs text-success">To</div>
                  <div className="font-mono">{sel.to}</div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline"><X className="h-4 w-4 me-1" />Reject</Button>
                <Button className="heritage-gradient text-primary-foreground"><Check className="h-4 w-4 me-1" />Approve</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="surface-elevated">
            <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-4 w-4" />History</CardTitle></CardHeader>
            <CardContent className="divide-y">
              {history.map((h, i) => (
                <div key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className={`grid h-8 w-8 place-items-center rounded-full ${h.ok ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                    {h.ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 text-sm"><span className="font-medium">{h.who}</span> <span className="text-muted-foreground">{h.action}</span></div>
                  <div className="text-xs text-muted-foreground">{h.when}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
