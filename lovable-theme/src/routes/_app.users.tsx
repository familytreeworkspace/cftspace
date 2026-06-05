import { createFileRoute } from "@tanstack/react-router";
import { Plus, Shield, UserCog } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_app/users")({
  head: () => ({ meta: [{ title: "Users — Kunbo" }] }),
  component: UsersPage,
});

const users = [
  { name: "Suresh Lalwani", email: "chief@community.org", role: "Chief", caste: "Khatri" },
  { name: "Mahesh Bhatia", email: "admin@community.org", role: "Admin", caste: "Bhatia" },
  { name: "Anita Sodha", email: "anita@community.org", role: "Editor", caste: "Sodha Rajput" },
  { name: "Vinod Mehta", email: "vinod@community.org", role: "Viewer", caste: "Mehta" },
];

const roleStyle: Record<string, string> = {
  Chief: "bg-gold/20 text-[color:var(--gold)] border-gold/30",
  Admin: "bg-primary/15 text-primary border-primary/30",
  Editor: "bg-success/15 text-success border-success/30",
  Viewer: "bg-muted text-muted-foreground border-border",
};

function UsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">User management</h1>
        <p className="text-sm text-muted-foreground">Manage roles and caste-level access.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="surface-elevated">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Users ({users.length})</CardTitle>
            <Button size="sm" className="heritage-gradient text-primary-foreground">
              <Plus className="h-4 w-4 me-1" /> Add user
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {users.map((u) => (
                <div key={u.email} className="flex items-center justify-between gap-3 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full heritage-gradient text-primary-foreground font-semibold">
                      {u.name[0]}
                    </div>
                    <div>
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-muted-foreground">{u.email} · {u.caste}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${roleStyle[u.role]}`}>
                      <Shield className="h-3 w-3" /> {u.role}
                    </span>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="surface-elevated h-fit">
          <CardHeader><CardTitle className="flex items-center gap-2"><UserCog className="h-4 w-4" />Add / Edit user</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Full name</Label><Input placeholder="e.g. Suresh Lalwani" /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="user@community.org" /></div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select defaultValue="editor"><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="chief">Chief</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assigned caste</Label>
              <Select defaultValue="khatri"><SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="khatri">Khatri</SelectItem>
                  <SelectItem value="lohana">Lohana</SelectItem>
                  <SelectItem value="bhatia">Bhatia</SelectItem>
                  <SelectItem value="all">All castes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full heritage-gradient text-primary-foreground">Save user</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
