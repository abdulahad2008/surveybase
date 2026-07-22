"use client";

import { useActionState, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import Papa from "papaparse";
import { detectPiiColumns } from "@/lib/pii";
import { submitDataset, type DepositState } from "./actions";
import type { Locale } from "@/i18n/routing";

const initialState: DepositState = { error: null };
const inputClass =
  "w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900";

interface Preview {
  headerCount: number;
  rowCount: number;
  piiHeaders: string[];
}

export function DepositForm({ locale }: { locale: Locale }) {
  const t = useTranslations("Deposit");
  const boundAction = submitDataset.bind(null, locale);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [preview, setPreview] = useState<Preview | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPreview(null);
      return;
    }
    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    const headers = parsed.meta.fields ?? [];
    const rows = parsed.data;
    const columnValues = headers.map((h) => rows.map((r) => r[h] ?? ""));
    const flags = detectPiiColumns(headers, columnValues);
    setPreview({
      headerCount: headers.length,
      rowCount: rows.length,
      piiHeaders: flags.map((f) => f.header),
    });
  }

  return (
    <form action={formAction} className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">{t("intro")}</p>

      {state.error && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {t(state.error)}
        </p>
      )}

      <Field label={t("fieldTitle")}>
        <input name="title" required className={inputClass} />
      </Field>
      <Field label={t("fieldAbstract")}>
        <textarea name="abstract" required rows={3} className={inputClass} />
      </Field>
      <Field label={t("fieldTopics")}>
        <input name="topics" required className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label={t("fieldCountry")}>
          <input name="country" required defaultValue="Uzbekistan" className={inputClass} />
        </Field>
        <Field label={t("fieldRegion")}>
          <input name="region" className={inputClass} />
        </Field>
      </div>
      <Field label={t("fieldCollectionMethod")}>
        <input name="collection_method" required className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label={t("fieldSampleSize")}>
          <input name="sample_size" type="number" min={0} required className={inputClass} />
        </Field>
        <Field label={t("fieldTargetPopulation")}>
          <input name="target_population" required className={inputClass} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label={t("fieldFieldworkStart")}>
          <input name="fieldwork_start" type="date" required className={inputClass} />
        </Field>
        <Field label={t("fieldFieldworkEnd")}>
          <input name="fieldwork_end" type="date" required className={inputClass} />
        </Field>
      </div>
      <Field label={t("fieldLanguages")}>
        <input name="languages" required className={inputClass} />
      </Field>
      <Field label={t("fieldLicense")}>
        <select name="license" defaultValue="CC-BY" className={inputClass}>
          <option value="CC-BY">CC-BY</option>
          <option value="CC-BY-SA">CC-BY-SA</option>
          <option value="CC0">CC0</option>
          <option value="Other">Other</option>
        </select>
      </Field>
      <Field label={t("fieldQuestionnaireText")}>
        <textarea name="questionnaire_text" rows={4} className={inputClass} />
      </Field>

      <fieldset className="space-y-4 border-t border-gray-200 pt-4 dark:border-gray-800">
        <legend className="text-sm font-medium">{t("publicationSectionTitle")}</legend>
        <Field label={t("fieldPublicationTitle")}>
          <input name="publication_title" className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t("fieldPublicationAuthors")}>
            <input name="publication_authors" className={inputClass} />
          </Field>
          <Field label={t("fieldPublicationYear")}>
            <input name="publication_year" type="number" className={inputClass} />
          </Field>
        </div>
        <Field label={t("fieldPublicationUrl")}>
          <input name="publication_url" className={inputClass} />
        </Field>
      </fieldset>

      <Field label={t("csvLabel")} hint={t("csvHelp")}>
        <input
          name="csv"
          type="file"
          accept=".csv,text/csv"
          required
          onChange={handleFileChange}
          className={inputClass}
        />
      </Field>

      {preview && (
        <div className="rounded border border-gray-200 p-4 text-sm dark:border-gray-800">
          <p className="font-medium">{t("previewHeading")}</p>
          <p className="text-gray-600 dark:text-gray-400">
            {preview.headerCount} columns, {preview.rowCount} rows detected.
          </p>
          <p className="mt-2 font-medium">{t("piiHeading")}</p>
          {preview.piiHeaders.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400">{t("piiNone")}</p>
          ) : (
            <>
              <p className="text-gray-600 dark:text-gray-400">{t("piiWillRemove")}</p>
              <ul className="list-inside list-disc">
                {preview.piiHeaders.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="confirmAnonymized" className="mt-1" />
        {t("piiConfirm")}
      </label>

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-gray-500 dark:text-gray-400">{hint}</span>}
    </label>
  );
}
