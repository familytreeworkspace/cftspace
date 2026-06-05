import { createFileRoute } from "@tanstack/react-router";
import { FileText, Users, MapPin, BarChart3, Printer, Download, FileType2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_app/reports")({
  head: () => ({ meta: [{ title: "Reports — Kunbo" }] }),
  component: ReportsPage,
});

const types = [
  { icon: Users, t: "Member directory", d: "All members grouped by household" },
  { icon: MapPin, t: "Village census", d: "Population by village & sub caste" },
  { icon: BarChart3, t: "Demographics", d: "Age / gender distribution" },
  { icon: FileText, t: "Custom report", d: "Build your own with filters" },
];

function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">Generate & export community insights.</p>
        </div>
        <div className="flex gap-2 no-print">
          <Button variant="outline"><Printer className="h-4 w-4 me-2" />Print</Button>
          <Button variant="outline"><Download className="h-4 w-4 me-2" />Excel</Button>
          <Button className="heritage-gradient text-primary-foreground"><FileType2 className="h-4 w-4 me-2" />PDF</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 no-print">
        {types.map((r, i) => (
          <button key={r.t} className={`group rounded-2xl border bg-card p-5 text-start transition hover:-translate-y-0.5 hover:shadow-lg surface-elevated ${
            i === 0 ? "ring-2 ring-primary" : ""
          }`}>
            <div className="grid h-11 w-11 place-items-center rounded-xl heritage-gradient text-primary-foreground">
              <r.icon className="h-5 w-5" />
            </div>
            <div className="mt-3 font-semibold">{r.t}</div>
            <div className="mt-1 text-xs text-muted-foreground">{r.d}</div>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit surface-elevated no-print">
          <CardHeader><CardTitle>Filters</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Sub Caste</Label>
              <Select defaultValue="all"><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="khatri">Khatri</SelectItem>
                  <SelectItem value="lohana">Lohana</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Village</Label>
              <Select defaultValue="all"><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="mithi">Mithi</SelectItem>
                  <SelectItem value="islamkot">Islamkot</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Age band</Label>
              <Select defaultValue="all"><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ages</SelectItem>
                  <SelectItem value="child">Children</SelectItem>
                  <SelectItem value="adult">Adults</SelectItem>
                  <SelectItem value="elder">Elders</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full">Apply filters</Button>
          </CardContent>
        </Card>

        <Card className="surface-elevated">
          <CardHeader><CardTitle>Print preview · Member directory</CardTitle></CardHeader>
          <CardContent>
            <div className="rounded-xl border bg-white text-black shadow-inner">
              <div className="border-b p-6 text-center">
                <div className="text-xs uppercase tracking-widest text-gray-500">Kunbo · Community Report</div>
                <div className="mt-1 text-xl font-bold">Member Directory — 2026</div>
                <div className="text-xs text-gray-500">Generated June 4, 2026</div>
              </div>
              <div className="p-6">
                <table className="w-full text-sm">
                  <thead className="border-b text-xs uppercase text-gray-500">
                    <tr><th className="py-2 text-start">Name</th><th className="py-2 text-start">Sub Caste</th><th className="py-2 text-start">Village</th><th className="py-2 text-end">Age</th></tr>
                  </thead>
                  <tbody className="divide-y">
                    {[
                      ["Suresh Lalwani", "Khatri", "Mithi", 58],
                      ["Mahesh Bhatia", "Bhatia", "Islamkot", 62],
                      ["Anita Sodha", "Sodha Rajput", "Nagarparkar", 41],
                      ["Vinod Mehta", "Mehta", "Diplo", 35],
                    ].map((r) => (
                      <tr key={r[0] as string}>
                        <td className="py-2">{r[0]}</td><td className="py-2">{r[1]}</td><td className="py-2">{r[2]}</td><td className="py-2 text-end tabular-nums">{r[3]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 text-xs text-gray-500">Showing 4 of 11,432 members</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
