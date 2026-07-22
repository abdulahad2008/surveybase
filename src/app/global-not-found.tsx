import { Geist } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Not Found · SurveyBank.uz",
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
    <html lang="uz" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-8 px-4 py-16 text-center">
          {messages.map((m) => (
            <div key={m.href} className="flex flex-col items-center gap-3">
              <h1 className="text-xl font-semibold">{m.heading}</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">{m.message}</p>
              <a
                href={m.href}
                className="rounded bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
              >
                {m.backHome}
              </a>
            </div>
          ))}
        </main>
      </body>
    </html>
  );
}
