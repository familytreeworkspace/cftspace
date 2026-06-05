import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { TreePine, Globe, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n, type Lang } from "@/lib/i18n";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Sign in — Kunbo" }, { name: "description", content: "Sign in to your community family tree." }],
  }),
  component: LoginPage,
});

const langs: { code: Lang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "sd", label: "سنڌي" },
  { code: "hi", label: "हिंदी" },
];

function LoginPage() {
  const { lang, setLang, theme, toggleTheme, dir } = useI18n();
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background" dir={dir}>
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-gold/20 blur-3xl" />
      </div>

      <header className="flex items-center justify-between p-4">
        <Link to="/login" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg heritage-gradient text-primary-foreground">
            <TreePine className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">Kunbo</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border bg-card p-0.5">
            {langs.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  lang === l.code ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
        </div>
      </header>

      <main className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="surface-elevated rounded-3xl border bg-card p-8">
            <div className="mb-6 flex flex-col items-center text-center">
              <div className="mb-3 grid h-16 w-16 place-items-center rounded-2xl heritage-gradient text-primary-foreground shadow-lg">
                <TreePine className="h-8 w-8" />
              </div>
              <h1 className="text-2xl font-bold">
                {lang === "sd" ? "ڀليڪار" : lang === "hi" ? "स्वागत है" : "Welcome back"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {lang === "sd"
                  ? "پنھنجي برادري ۾ داخل ٿيو"
                  : lang === "hi"
                    ? "अपने समुदाय में साइन इन करें"
                    : "Sign in to your community"}
              </p>
            </div>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                navigate({ to: "/dashboard" });
              }}
            >
              <div className="space-y-2">
                <Label>Community / Caste</Label>
                <Select defaultValue="lohana">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lohana">Lohana Community</SelectItem>
                    <SelectItem value="rajput">Rajput Community</SelectItem>
                    <SelectItem value="brahmin">Brahmin Community</SelectItem>
                    <SelectItem value="bhatia">Bhatia Community</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@community.org" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" required />
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-muted-foreground">
                  <input type="checkbox" className="rounded border-border" /> Remember me
                </label>
                <a href="#" className="text-primary hover:underline">Forgot password?</a>
              </div>

              <Button type="submit" className="w-full heritage-gradient text-primary-foreground">
                Sign in
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-muted-foreground">
              <Globe className="inline h-3 w-3 mr-1" />
              Available in English · سنڌي · हिंदी
            </p>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            © 2026 Kunbo Heritage · Built for the community
          </p>
        </div>
      </main>
    </div>
  );
}
