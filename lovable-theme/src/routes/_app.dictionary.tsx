import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, BookOpen, Plus, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_app/dictionary")({
  head: () => ({ meta: [{ title: "Dictionary — Kunbo" }] }),
  component: DictionaryPage,
});

const manual = [
  { w: "Lohanaa", c: "Lohana", by: "S. Lalwani" },
  { w: "Khattri", c: "Khatri", by: "Admin" },
  { w: "Bhatiyaa", c: "Bhatia", by: "M. Bhatia" },
];
const ai = [
  { w: "Mithee", c: "Mithi", by: "AI · 96%", verified: false },
  { w: "Nagarparker", c: "Nagarparkar", by: "AI · 91%", verified: true },
  { w: "Pushkarana", c: "Pushkarna", by: "AI · 88%", verified: false },
];

function DictionaryPage() {
  const [tab, setTab] = useState<"manual" | "ai">("manual");
  const rows = tab === "manual" ? manual : ai;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6" />Dictionary</h1>
        <p className="text-sm text-muted-foreground">Standardize spellings across imports.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="surface-elevated">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex rounded-lg border bg-card p-0.5">
                <button onClick={() => setTab("manual")} className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  tab === "manual" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}>Manual</button>
                <button onClick={() => setTab("ai")} className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  tab === "ai" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}><Sparkles className="h-3.5 w-3.5" />AI Corrected</button>
              </div>
              <span className="text-xs text-muted-foreground">{rows.length} entries</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-6 py-2 text-start">Wrong</th>
                  <th className="px-6 py-2 text-start">Correct</th>
                  <th className="px-6 py-2 text-start">Source</th>
                  <th className="px-6 py-2 text-end">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.w}>
                    <td className="px-6 py-3 font-mono text-xs text-destructive">{r.w}</td>
                    <td className="px-6 py-3 font-semibold text-success">{r.c}</td>
                    <td className="px-6 py-3 text-muted-foreground">{r.by}</td>
                    <td className="px-6 py-3 text-end">
                      {"verified" in r && r.verified ? (
                        <span className="inline-flex items-center gap-1 text-xs text-success"><Check className="h-3 w-3" />Verified</span>
                      ) : (
                        <Button size="sm" variant="outline">Verify</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="surface-elevated h-fit">
          <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-4 w-4" />Add entry</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2"><Label>Wrong spelling</Label><Input placeholder="e.g. Lohanaa" /></div>
            <div className="space-y-2"><Label>Correct spelling</Label><Input placeholder="e.g. Lohana" /></div>
            <Button className="w-full heritage-gradient text-primary-foreground">Add to dictionary</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
