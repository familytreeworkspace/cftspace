import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Upload, ArrowRight, FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/import")({
  head: () => ({ meta: [{ title: "Import — Kunbo" }] }),
  component: ImportPage,
});

const steps = ["Sub Caste", "Household", "Members", "Relations", "Contacts"];

function ImportPage() {
  const [step, setStep] = useState(1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import wizard</h1>
        <p className="text-sm text-muted-foreground">Bring records into Kunbo in 5 guided steps.</p>
      </div>

      {/* Stepper */}
      <Card className="surface-elevated"><CardContent className="p-6">
        <div className="flex items-center">
          {steps.map((s, i) => {
            const done = i < step;
            const current = i === step;
            return (
              <div key={s} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center gap-2">
                  <div className={`grid h-10 w-10 place-items-center rounded-full border-2 text-sm font-semibold transition ${
                    done ? "border-success bg-success text-success-foreground"
                    : current ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground"
                  }`}>
                    {done ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className={`text-xs ${current ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{s}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`mx-2 h-0.5 flex-1 ${done ? "bg-success" : "bg-border"}`} />
                )}
              </div>
            );
          })}
        </div>
      </CardContent></Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 surface-elevated">
          <CardHeader><CardTitle>Upload file · {steps[step]}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-border bg-muted/30 p-10 text-center transition hover:bg-muted/50 hover:border-primary">
              <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
              <div className="mt-3 font-medium">Drag & drop CSV/XLSX here</div>
              <div className="text-xs text-muted-foreground">or click to browse · max 20MB</div>
              <input type="file" className="sr-only" />
            </label>

            <div>
              <div className="mb-2 text-sm font-semibold">Column mapping</div>
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="p-2 text-start">Source column</th>
                      <th className="p-2 text-start">Maps to</th>
                      <th className="p-2 text-start">Sample</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[
                      ["full_name", "Member.name", "Suresh Lalwani"],
                      ["dob", "Member.born", "1966-04-12"],
                      ["gender", "Member.gender", "M"],
                      ["caste_id", "SubCaste.id", "khatri"],
                      ["village", "Household.village", "Mithi"],
                    ].map(([a, b, c]) => (
                      <tr key={a}>
                        <td className="p-2 font-mono text-xs">{a}</td>
                        <td className="p-2"><span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">{b}</span></td>
                        <td className="p-2 text-muted-foreground">{c}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
                Back
              </Button>
              <Button
                onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
                className="heritage-gradient text-primary-foreground"
              >
                Continue <ArrowRight className="h-4 w-4 ms-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="surface-elevated">
          <CardHeader><CardTitle>Preview & summary</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-2 rounded-lg border bg-card p-3">
              <FileSpreadsheet className="h-5 w-5 text-success" />
              <div className="flex-1">
                <div className="font-medium">tharparkar.xlsx</div>
                <div className="text-xs text-muted-foreground">1,204 rows · 12 columns</div>
              </div>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Detected rows</span><span className="font-medium">1,204</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Valid</span><span className="font-medium text-success">1,180</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Warnings</span><span className="font-medium text-[color:var(--gold)]">18</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Errors</span><span className="font-medium text-destructive">6</span></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
