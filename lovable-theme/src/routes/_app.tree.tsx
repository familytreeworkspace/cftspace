import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ZoomIn, ZoomOut, Maximize2, Image as ImageIcon, Hash, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FamilyTreeNode, type TreeNodeData } from "@/components/FamilyTreeNode";

export const Route = createFileRoute("/_app/tree")({
  head: () => ({ meta: [{ title: "Family Tree — Kunbo" }] }),
  component: TreePage,
});

const gens: TreeNodeData[][] = [
  [
    { id: "1", name: "Lalchand Lalwani", gender: "M", age: 82, born: "1942", died: "2018", role: "Patriarch" },
    { id: "2", name: "Devi Lalwani", gender: "F", age: 78, born: "1946", died: "2020" },
  ],
  [
    { id: "3", name: "Suresh Lalwani", gender: "M", age: 58, born: "1966", role: "Head" },
    { id: "4", name: "Kamla Lalwani", gender: "F", age: 54, born: "1970" },
    { id: "5", name: "Mahesh Lalwani", gender: "M", age: 55, born: "1969" },
    { id: "6", name: "Sunita Khatri", gender: "F", age: 60, born: "1964" },
  ],
  [
    { id: "7", name: "Rajesh Lalwani", gender: "M", age: 32, born: "1992" },
    { id: "8", name: "Priya Lalwani", gender: "F", age: 29, born: "1995" },
    { id: "9", name: "Meera Lalwani", gender: "F", age: 26, born: "1998" },
    { id: "10", name: "Anil Lalwani", gender: "M", age: 24, born: "2000" },
  ],
  [
    { id: "11", name: "Aarav Lalwani", gender: "M", age: 6, born: "2018" },
    { id: "12", name: "Sia Lalwani", gender: "F", age: 3, born: "2021" },
  ],
];

function TreePage() {
  const [graphic, setGraphic] = useState(false);
  const [zoom, setZoom] = useState(1);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Family Tree · Lalwani</h1>
          <p className="text-sm text-muted-foreground">4 generations · 12 members</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border bg-card p-0.5">
            <button
              onClick={() => setGraphic(true)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                graphic ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              <ImageIcon className="h-3.5 w-3.5" /> Graphic
            </button>
            <button
              onClick={() => setGraphic(false)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                !graphic ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              <Hash className="h-3.5 w-3.5" /> Symbols
            </button>
          </div>
          <div className="flex items-center gap-1 rounded-lg border bg-card p-0.5">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="px-1 text-xs tabular-nums">{Math.round(zoom * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(1)}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Card className="relative h-[calc(100vh-220px)] overflow-auto bg-[radial-gradient(circle_at_1px_1px,theme(colors.border)_1px,transparent_0)] [background-size:20px_20px] surface-elevated">
        <div
          className="min-w-max p-10"
          style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
        >
          <div className="space-y-14">
            {gens.map((row, gi) => (
              <div key={gi} className="relative">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Generation {gi + 1}
                </div>
                <div className="flex flex-wrap items-start gap-8">
                  {row.map((n) => (
                    <div key={n.id} className="relative">
                      <FamilyTreeNode node={n} graphic={graphic} />
                      {gi < gens.length - 1 && (
                        <div className="absolute left-1/2 top-full h-14 w-px bg-border" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mini-map */}
        <div className="pointer-events-none absolute bottom-4 right-4 h-28 w-44 rounded-lg border bg-card/90 p-2 backdrop-blur shadow">
          <div className="mb-1 flex items-center gap-1 text-[10px] text-muted-foreground">
            <Map className="h-3 w-3" /> Mini map
          </div>
          <div className="grid h-[calc(100%-14px)] grid-rows-4 gap-1">
            {gens.map((_, i) => (
              <div key={i} className="rounded bg-primary/20" />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
