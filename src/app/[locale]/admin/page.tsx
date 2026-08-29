import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pageMetadata } from "@/lib/site";
import {
  LINK_FORMAT,
  isAdmin,
  rollupByDay,
  totalActivity,
  type ActivityEvent,
} from "@/lib/admin";
import { RoleSelect } from "./role-select";

/**
 * How many rows each table shows. There are four accounts and eight datasets
 * today, so this is a ceiling rather than a pager — but an unbounded query
 * against a growing table is the kind of thing that is fine until the day it
 * is not, and a page that silently drops rows is worse than one that says so.
 */
const CAP = 200;
const RECENT = 50;
const WINDOW_DAYS = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: Locale = hasLocale(routing.locales, raw)
    ? raw
    : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "Admin" });
  return {
    ...pageMetadata({
      locale,
      path: "/admin",
      title: t("title"),
      description: t("metaDescription"),
    }),
    // Nothing here should ever be indexed, and the page is behind a role check
    // anyway — but a crawler that finds the URL should be told, not just met
    // with a redirect it may cache.
    robots: { index: false, follow: false },
  };
}

interface ProfileRow {
  id: string;
  name: string | null;
  affiliation: string | null;
  role: string;
  created_at: string;
}

interface DatasetRow {
  id: string;
  slug: string;
  title: string;
  status: string;
  download_count: number;
  created_at: string;
  depositor_id: string | null;
  rejection_reason: string | null;
}

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = hasLocale(routing.locales, rawLocale)
    ? rawLocale
    : routing.defaultLocale;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect({ href: "/login", locale });

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .single();

  if (!isAdmin(me?.role)) redirect({ href: "/", locale });

  const t = await getTranslations("Admin");
  const p = await getTranslations("Profile");

  const [{ data: profileData }, { data: datasetData }, { data: eventData }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, name, affiliation, role, created_at")
        .order("created_at", { ascending: false })
        .limit(CAP),
      supabase
        .from("datasets")
        .select(
          "id, slug, title, status, download_count, created_at, depositor_id, rejection_reason",
        )
        .order("created_at", { ascending: false })
        .limit(CAP),
      supabase
        .from("download_log")
        .select("created_at, format, dataset_id, user_id")
        .order("created_at", { ascending: false })
        .limit(2000),
    ]);

  const profiles = (profileData ?? []) as ProfileRow[];
  const datasets = (datasetData ?? []) as DatasetRow[];
  const events = (eventData ?? []) as (ActivityEvent & {
    dataset_id: string;
    user_id: string | null;
  })[];

  // Email and last-sign-in live in auth.users, which RLS cannot reach, so this
  // one lookup needs the service-role client. It stays inside this server
  // component: what reaches the browser is the rendered table, never the
  // client and never a serialized auth user.
  const authUsers = new Map<
    string,
    { email: string | null; lastSignInAt: string | null }
  >();
  try {
    const { data, error } = await createAdminClient().auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (error) throw error;
    for (const u of data.users) {
      authUsers.set(u.id, {
        email: u.email ?? null,
        lastSignInAt: u.last_sign_in_at ?? null,
      });
    }
  } catch (error) {
    // A page that renders without emails is far more useful than one that 500s
    // because the service-role key is missing in this environment.
    console.error(
      `[admin] listing auth users failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const datasetsByDepositor = new Map<string, number>();
  for (const d of datasets) {
    if (!d.depositor_id) continue;
    datasetsByDepositor.set(
      d.depositor_id,
      (datasetsByDepositor.get(d.depositor_id) ?? 0) + 1,
    );
  }
  const datasetById = new Map(datasets.map((d) => [d.id, d]));
  const nameById = new Map(profiles.map((r) => [r.id, r.name]));

  const byStatus = new Map<string, number>();
  for (const d of datasets)
    byStatus.set(d.status, (byStatus.get(d.status) ?? 0) + 1);

  const totals = totalActivity(events);
  const daily = rollupByDay(events, WINDOW_DAYS, new Date());
  const recent = events.slice(0, RECENT);

  const date = (value: string | null) =>
    value
      ? new Date(value).toLocaleDateString(locale, { dateStyle: "medium" })
      : t("neverSignedIn");
  const dateTime = (value: string) =>
    new Date(value).toLocaleString(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  const num = (value: number) => value.toLocaleString(locale);
  const statusLabel = (status: string) =>
    status === "published" ||
    status === "pending" ||
    status === "draft" ||
    status === "rejected"
      ? p(`status_${status}`)
      : status;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14"
    >
      <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
        {t("title")}
      </h1>
      <p className="mt-1 text-sm text-soft">{t("intro")}</p>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t("statUsers")} value={num(profiles.length)} />
        <Stat label={t("statDatasets")} value={num(datasets.length)} />
        <Stat label={t("statLinks")} value={num(totals.links)} />
        <Stat label={t("statFiles")} value={num(totals.files)} />
      </section>

      <Section title={t("sectionUsers")}>
        {profiles.length === 0 ? (
          <Empty>{t("emptyUsers")}</Empty>
        ) : (
          <Table
            label={t("sectionUsers")}
            head={[
              t("colName"),
              t("colEmail"),
              t("colRole"),
              t("colDatasetCount"),
              t("colJoined"),
              t("colLastSignIn"),
            ]}
          >
            {profiles.map((row) => {
              const auth = authUsers.get(row.id);
              const label = row.name?.trim() || auth?.email || row.id;
              return (
                <tr key={row.id} className="border-t border-line align-middle">
                  <Td>
                    <span className="font-semibold text-ink">
                      {row.name?.trim() || (
                        <span className="text-faint">{t("noName")}</span>
                      )}
                    </span>
                    {row.affiliation && (
                      <span className="block text-xs text-faint">
                        {row.affiliation}
                      </span>
                    )}
                  </Td>
                  <Td>
                    <span className="break-all text-soft">
                      {auth?.email ?? "—"}
                    </span>
                  </Td>
                  <Td>
                    <RoleSelect
                      locale={locale}
                      userId={row.id}
                      currentRole={row.role}
                      userLabel={label}
                    />
                  </Td>
                  <Td>{num(datasetsByDepositor.get(row.id) ?? 0)}</Td>
                  <Td>{date(row.created_at)}</Td>
                  <Td>{date(auth?.lastSignInAt ?? null)}</Td>
                </tr>
              );
            })}
          </Table>
        )}
      </Section>

      <Section title={t("sectionDatasets")}>
        {datasets.length === 0 ? (
          <Empty>{t("emptyDatasets")}</Empty>
        ) : (
          <Table
            label={t("sectionDatasets")}
            head={[
              t("colTitle"),
              t("colStatus"),
              t("colDepositor"),
              t("colDownloads"),
              t("colCreated"),
            ]}
          >
            {datasets.map((d) => (
              <tr key={d.id} className="border-t border-line align-top">
                <Td>
                  <a
                    href={`/${locale}/datasets/${d.slug}`}
                    className="font-semibold text-ink hover:text-brand"
                  >
                    {d.title}
                  </a>
                  {d.rejection_reason && (
                    <span className="mt-0.5 block text-xs text-faint">
                      {d.rejection_reason}
                    </span>
                  )}
                </Td>
                <Td>
                  <span className="chip bg-card-soft text-soft">
                    {statusLabel(d.status)}
                  </span>
                </Td>
                <Td>
                  {d.depositor_id ? (
                    (nameById.get(d.depositor_id)?.trim() ?? d.depositor_id)
                  ) : (
                    <span className="text-faint">{t("noDepositor")}</span>
                  )}
                </Td>
                <Td>{num(d.download_count)}</Td>
                <Td>{date(d.created_at)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title={t("sectionDaily")}>
        <Table
          label={t("sectionDaily")}
          head={[t("colDay"), t("colClicks"), t("colFiles")]}
        >
          {daily.map((day) => (
            <tr key={day.day} className="border-t border-line">
              <Td>{day.day}</Td>
              <Td>{num(day.links)}</Td>
              <Td>{num(day.files)}</Td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section title={t("sectionRecent")}>
        {recent.length === 0 ? (
          <Empty>{t("emptyActivity")}</Empty>
        ) : (
          <>
            <Table
              label={t("sectionRecent")}
              head={[
                t("colWhen"),
                t("colDataset"),
                t("colFormat"),
                t("colName"),
              ]}
            >
              {recent.map((e, i) => (
                <tr
                  key={`${e.created_at}-${i}`}
                  className="border-t border-line"
                >
                  <Td>{dateTime(e.created_at)}</Td>
                  <Td>
                    {datasetById.get(e.dataset_id)?.title ?? e.dataset_id}
                  </Td>
                  <Td>
                    {e.format === LINK_FORMAT
                      ? t("formatLink")
                      : e.format.toUpperCase()}
                  </Td>
                  <Td>
                    {e.user_id ? (
                      (nameById.get(e.user_id)?.trim() ?? e.user_id)
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </Td>
                </tr>
              ))}
            </Table>
            {events.length > RECENT && (
              <p className="mt-2 text-xs text-faint">
                {t("cap", { count: RECENT })}
              </p>
            )}
          </>
        )}
      </Section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card flex flex-col gap-1 p-4">
      <span className="text-xs font-semibold uppercase tracking-wide text-faint">
        {label}
      </span>
      <span className="font-display text-2xl font-bold text-ink">{value}</span>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 font-display text-xl font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="card p-6 text-sm text-soft">{children}</p>;
}

/**
 * Tables scroll sideways inside the card rather than reflowing into stacked
 * definition lists at 375px. Six columns of mostly-numeric data read better
 * kept as a table you push around than as forty stacked rows you scroll past.
 *
 * That sideways scroll is a drag gesture unless the container can take focus,
 * which leaves a keyboard with no way to reach the columns past the fold —
 * axe flags it as scrollable-region-focusable. tabIndex makes it reachable and
 * the label says what the stop is, since a focus stop announced as nothing is
 * only marginally better than no focus stop.
 */
function Table({
  head,
  label,
  children,
}: {
  head: string[];
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="card overflow-x-auto p-0"
      tabIndex={0}
      role="region"
      aria-label={label}
    >
      <table className="w-full min-w-[40rem] text-left text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-faint">
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-4 py-3 text-soft">{children}</td>;
}
