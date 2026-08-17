import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/bricolage-grotesque";
import "./globals.css";
import { ThemeScript } from "@/components/theme-script";

export const metadata: Metadata = {
  title: "Not Found · SurveyBase.uz",
  description: "The page you are looking for does not exist.",
};

// This page bypasses the [locale] route tree entirely (it renders for URLs
// that match no route at all — see next.config.ts `experimental.globalNotFound`),
// so it has no reliable way to know the visitor's locale and shows all three
// languages instead of picking one.
const messages = [
  { heading: "Sahifa topilmadi", message: "Siz izlayotgan sahifa mavjud emas yoki ko‘chirilgan.", backHome: "Bosh sahifaga qaytish", href: "/uz" },
  { heading: "Страница не найдена", message: "Страница, которую вы ищете, не существует или была перемещена.", backHome: "На главную", href: "/ru" },
  { heading: "Page not found", message: "The page you are looking for does not exist or has been moved.", backHome: "Back home", href: "/en" },
];

export default function GlobalNotFound() {
  return (
    <html lang="uz" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col">
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-10 px-4 py-16 text-center">
          <div aria-hidden className="flex items-end gap-2">
            <span className="h-10 w-4 rounded-full bg-brand-soft" />
            <span className="h-16 w-4 rounded-full bg-brand" />
            <span className="h-7 w-4 rounded-full bg-coral" />
            <span className="h-12 w-4 rounded-full bg-sun" />
          </div>
          {messages.map((m) => (
            <div key={m.href} className="flex flex-col items-center gap-2">
              <h1 className="font-display text-xl font-bold text-ink">{m.heading}</h1>
              <p className="text-sm text-soft">{m.message}</p>
              <a href={m.href} className="btn btn-soft btn-sm mt-1">
                {m.backHome}
              </a>
            </div>
          ))}
        </main>
      </body>
    </html>
  );
}
