import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "sd" | "hi";
type Dict = Record<string, Record<Lang, string>>;

const D: Dict = {
  app: { en: "Kunbo", sd: "ڪنبو", hi: "कुंबा" },
  tagline: {
    en: "Community Family Tree",
    sd: "برادري جو خاندان وڻ",
    hi: "समुदाय का वंश वृक्ष",
  },
  dashboard: { en: "Dashboard", sd: "ڊيش بورڊ", hi: "डैशबोर्ड" },
  households: { en: "Households", sd: "گهراڻا", hi: "परिवार" },
  tree: { en: "Family Tree", sd: "خاندان وڻ", hi: "वंश वृक्ष" },
  import: { en: "Import", sd: "درآمد", hi: "इम्पोर्ट" },
  reports: { en: "Reports", sd: "رپورٽون", hi: "रिपोर्ट" },
  users: { en: "User Management", sd: "استعمال ڪندڙ", hi: "उपयोगकर्ता" },
  dictionary: { en: "Dictionary", sd: "لغت", hi: "शब्दकोश" },
  corrections: { en: "Correction Requests", sd: "اصلاحون", hi: "सुधार अनुरोध" },
  login: { en: "Sign in", sd: "داخل ٿيو", hi: "साइन इन" },
  search: { en: "Search…", sd: "ڳولھيو…", hi: "खोजें…" },
  members: { en: "Members", sd: "ميمبر", hi: "सदस्य" },
  villages: { en: "Villages", sd: "ڳوٺ", hi: "गाँव" },
  subcastes: { en: "Sub Castes", sd: "ذاتيون", hi: "उप जाति" },
  totalHouseholds: { en: "Total Households", sd: "ڪل گهراڻا", hi: "कुल परिवार" },
};

interface Ctx {
  lang: Lang;
  dir: "ltr" | "rtl";
  setLang: (l: Lang) => void;
  t: (k: keyof typeof D) => string;
  theme: "light" | "dark";
  toggleTheme: () => void;
}

const I18nCtx = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const dir: "ltr" | "rtl" = lang === "sd" ? "rtl" : "ltr";

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const value: Ctx = {
    lang,
    dir,
    setLang: setLangState,
    t: (k) => D[k]?.[lang] ?? String(k),
    theme,
    toggleTheme: () => setTheme((t) => (t === "light" ? "dark" : "light")),
  };

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useI18n must be inside I18nProvider");
  return ctx;
}
