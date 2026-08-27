"use client";

import { useActionState, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { detectPiiColumns } from "@/lib/pii";
import { inferFieldworkRange } from "@/lib/fieldwork";
import {
  ACCEPTED_UPLOAD_EXTENSIONS,
  parseSpreadsheet,
} from "@/lib/spreadsheet";
import { citationWithoutUrl, citationYear } from "@/lib/citation";
import { splitList } from "@/lib/form-values";
import { OTHER } from "@/lib/survey-vocab";
import { CopyButton } from "@/components/copy-button";
import { submitDataset, type DepositState } from "./actions";
import { LicensePicker, MethodPicker, TopicPicker } from "./option-fields";
import type { Locale } from "@/i18n/routing";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  FileTextIcon,
  QuoteIcon,
  ShieldIcon,
  UploadIcon,
} from "@/components/icons";

const initialState: DepositState = { error: null };

/** A read-only snapshot of what is about to be submitted, taken when the
 *  depositor reaches the review step. */
interface Summary {
  title: string;
  topics: string[];
  license: string;
  sampleSize: string;
  fieldworkStart: string;
  fieldworkEnd: string;
  citation: string;
}

interface Preview {
  fileName: string;
  headerCount: number;
  rowCount: number;
  piiHeaders: string[];
  fieldworkStart: string | null;
  fieldworkEnd: string | null;
  // Bumped on every parse so the prefilled fields remount and pick up the new
  // values. Without it, re-uploading a corrected file would leave the previous
  // file's numbers sitting in the form.
  parseId: number;
}

const STEPS = ["data", "describe", "publish"] as const;
type Step = (typeof STEPS)[number];

export function DepositForm({
  locale,
  depositorName,
}: {
  locale: Locale;
  depositorName: string | null;
}) {
  const t = useTranslations("Deposit");
  const boundAction = submitDataset.bind(null, locale);
  const [state, formAction, pending] = useActionState(
    boundAction,
    initialState,
  );
  const [preview, setPreview] = useState<Preview | null>(null);
  const [step, setStep] = useState<Step>("data");
  const [summary, setSummary] = useState<Summary | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const dataRef = useRef<HTMLDivElement>(null);
  const describeRef = useRef<HTMLDivElement>(null);
  const publishRef = useRef<HTMLDivElement>(null);

  const stepIndex = STEPS.indexOf(step);

  function stepContainer(s: Step): HTMLDivElement | null {
    if (s === "data") return dataRef.current;
    if (s === "describe") return describeRef.current;
    return publishRef.current;
  }

  function validateStep(s: Step): boolean {
    const container = stepContainer(s);
    if (!container) return true;
    const fields = container.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >("input, select, textarea");
    for (const field of fields) {
      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }
    return true;
  }

  /**
   * The three steps are all mounted at once behind `hidden`, so the values a
   * depositor typed in step 2 are sitting in the DOM by the time they reach
   * step 3. Reading them on the transition is far less invasive than making
   * nine inputs controlled purely to render a summary of them.
   */
  function readSummary(): Summary | null {
    const form = formRef.current;
    if (!form) return null;
    const data = new FormData(form);
    const str = (name: string) => data.get(name)?.toString().trim() ?? "";
    const title = str("title");
    const fieldworkStart = str("fieldwork_start");
    // Mirrors the server exactly: every chip and the free-text box submit
    // under `topics`, and "Other" replaces the license rather than annotating
    // it. A review step that split these differently from the code that
    // stores them would be previewing something that is not going to happen.
    const license = str("license");
    return {
      title,
      topics: data.getAll("topics").flatMap((v) => splitList(v.toString())),
      license: license === OTHER ? str("license_other") : license,
      sampleSize: str("sample_size"),
      fieldworkStart,
      fieldworkEnd: str("fieldwork_end"),
      citation: citationWithoutUrl({
        title,
        author: depositorName,
        year: citationYear(fieldworkStart || null, new Date()),
      }),
    };
  }

  function goNext() {
    if (!validateStep(step)) return;
    // SheetJS does not throw on a file that is not really a workbook — it
    // falls back to delimited text and yields headers with no rows. The server
    // rejects that anyway; catching it here means the depositor hears about it
    // now rather than after filling in nine more fields.
    if (step === "data" && preview && preview.rowCount === 0) return;
    const next = STEPS[stepIndex + 1];
    if (next) {
      if (next === "publish") setSummary(readSummary());
      setStep(next);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function goBack() {
    const prev = STEPS[stepIndex - 1];
    if (prev) {
      setStep(prev);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function handleFinalSubmit() {
    // native validation can't focus fields inside hidden steps, so we
    // validate every step ourselves and jump to the first invalid one
    for (const s of STEPS) {
      const container = stepContainer(s);
      if (!container) continue;
      const fields = container.querySelectorAll<HTMLInputElement>(
        "input, select, textarea",
      );
      for (const field of fields) {
        if (!field.checkValidity()) {
          if (s !== step) {
            setStep(s);
            setTimeout(() => field.reportValidity(), 50);
          } else {
            field.reportValidity();
          }
          return;
        }
      }
    }
    formRef.current?.requestSubmit();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setPreview(null);
      return;
    }
    const { headers, rows } = await parseSpreadsheet(file);
    const columnValues = headers.map((h) => rows.map((r) => r[h] ?? ""));
    const flags = detectPiiColumns(headers, columnValues);
    // Read before the PII layer takes the timestamp column away.
    const fieldwork = inferFieldworkRange(headers, columnValues);
    setPreview((prev) => ({
      fileName: file.name,
      headerCount: headers.length,
      rowCount: rows.length,
      piiHeaders: flags.map((f) => f.header),
      fieldworkStart: fieldwork?.start ?? null,
      fieldworkEnd: fieldwork?.end ?? null,
      parseId: (prev?.parseId ?? 0) + 1,
    }));
  }

  const stepLabels: Record<Step, string> = {
    data: t("stepData"),
    describe: t("stepDescribe"),
    publish: t("stepPublish"),
  };

  return (
    <div className="space-y-8">
      <header className="space-y-2 text-center">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
          {t("title")}
        </h1>
        <p className="mx-auto max-w-xl text-sm leading-relaxed text-soft">
          {t("intro")}
        </p>
      </header>

      {/* stepper */}
      <ol className="flex items-center justify-center gap-1 sm:gap-2">
        {STEPS.map((s, i) => {
          const isDone = i < stepIndex;
          const isActive = s === step;
          return (
            <li key={s} className="flex items-center gap-1 sm:gap-2">
              {i > 0 && (
                <span
                  aria-hidden
                  className={`h-0.5 w-6 rounded-full sm:w-12 ${isDone || isActive ? "bg-brand" : "bg-line-strong"}`}
                />
              )}
              <button
                type="button"
                onClick={() => i < stepIndex && setStep(s)}
                disabled={i > stepIndex}
                className={`flex items-center gap-2 rounded-full py-1.5 pr-3 pl-1.5 text-xs font-bold transition ${
                  isActive
                    ? "bg-brand text-on-brand shadow-lift"
                    : isDone
                      ? "bg-brand-soft text-brand-ink"
                      : "text-faint"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                    isActive
                      ? "bg-white/20"
                      : isDone
                        ? "bg-brand text-on-brand"
                        : "border border-line-strong"
                  }`}
                >
                  {isDone ? <CheckIcon size={12} /> : i + 1}
                </span>
                <span className="hidden sm:inline">{stepLabels[s]}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <form ref={formRef} action={formAction} className="space-y-6">
        {state.error && (
          <p
            role="alert"
            className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
          >
            {t(state.error)}
          </p>
        )}

        {/* ---------------- step 1: data ---------------- */}
        <div ref={dataRef} hidden={step !== "data"} className="space-y-5">
          <div className="card space-y-5 p-6">
            <div>
              <span className="label">{t("csvLabel")}</span>
              <label
                htmlFor="csv-upload"
                className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-line-strong bg-card-soft/50 px-6 py-10 text-center transition hover:border-brand hover:bg-brand-wash"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <UploadIcon size={22} />
                </span>
                {preview ? (
                  <>
                    <span className="text-sm font-bold text-ink">
                      {preview.fileName}
                    </span>
                    <span className="tnum text-xs text-soft">
                      {t("previewCounts", {
                        columns: preview.headerCount,
                        rows: preview.rowCount,
                      })}
                    </span>
                    <span className="text-xs font-semibold text-brand">
                      {t("csvReplace")}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-bold text-ink">
                      {t("csvDropTitle")}
                    </span>
                    <span className="max-w-sm text-xs leading-relaxed text-faint">
                      {t("csvHelp")}
                    </span>
                  </>
                )}
              </label>
              <input
                id="csv-upload"
                name="csv"
                type="file"
                accept={ACCEPTED_UPLOAD_EXTENSIONS}
                required
                onChange={handleFileChange}
                className="sr-only"
              />
            </div>

            {preview && preview.rowCount === 0 && (
              <p
                role="alert"
                className="rounded-2xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger"
              >
                {t("errorUnreadable")}
              </p>
            )}

            {preview && preview.rowCount > 0 && (
              // Finding nothing is not a pass, so the empty case is styled
              // neutral rather than mint-green. A success colour here told the
              // depositor their file was clean at exactly the moment the check
              // had learned nothing about it.
              <div
                className={`rounded-2xl p-4 text-sm ${
                  preview.piiHeaders.length === 0
                    ? "bg-card-soft"
                    : "bg-sun-soft"
                }`}
              >
                <p className="flex items-center gap-2 font-bold text-ink">
                  <ShieldIcon
                    size={16}
                    className={
                      preview.piiHeaders.length === 0 ? "text-soft" : "text-sun"
                    }
                  />
                  {t("piiHeading")}
                </p>
                {preview.piiHeaders.length === 0 ? (
                  <p className="mt-1.5 text-soft">{t("piiNone")}</p>
                ) : (
                  <>
                    <p className="mt-1.5 text-soft">{t("piiWillRemove")}</p>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {preview.piiHeaders.map((h) => (
                        <li
                          key={h}
                          className="chip bg-card font-mono text-xs text-ink"
                        >
                          {h}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                {/* Shown in both branches: the limits apply whether or not
                    anything was flagged. */}
                <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-faint">
                  {t("piiLimits")}
                </p>
              </div>
            )}

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-line p-4 text-sm transition hover:border-brand">
              <input
                type="checkbox"
                name="confirmAnonymized"
                required
                className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
              />
              <span className="leading-relaxed text-soft">
                {t("piiConfirm")}
              </span>
            </label>
          </div>

          <div className="flex justify-end">
            <button type="button" onClick={goNext} className="btn btn-primary">
              {t("nextStep")}
              <ArrowRightIcon size={15} />
            </button>
          </div>
        </div>

        {/* ---------------- step 2: describe ---------------- */}
        <div
          ref={describeRef}
          hidden={step !== "describe"}
          className="space-y-5"
        >
          <div className="card space-y-5 p-6">
            <Field label={t("fieldTitle")} name="title">
              <input
                id="f-title"
                name="title"
                required
                className="input"
                placeholder={t("titlePlaceholder")}
              />
            </Field>
            <Field label={t("fieldAbstract")} name="abstract">
              <textarea
                id="f-abstract"
                name="abstract"
                required
                rows={3}
                className="input"
                placeholder={t("abstractPlaceholder")}
              />
            </Field>
            <Field
              label={t("fieldTopics")}
              name="topics"
              group
              hint={t("topicsHint")}
            >
              <TopicPicker />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t("fieldCountry")} name="country">
                <input
                  id="f-country"
                  name="country"
                  required
                  defaultValue="Uzbekistan"
                  className="input"
                />
              </Field>
              <Field label={t("fieldRegion")} name="region" optional>
                <input id="f-region" name="region" className="input" />
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label={t("fieldCollectionMethod")}
                name="collection_method"
              >
                <MethodPicker />
              </Field>
              <Field
                label={t("fieldSampleSize")}
                name="sample_size"
                hint={preview ? t("prefilledFromFile") : undefined}
              >
                <input
                  key={`sample_size-${preview?.parseId ?? 0}`}
                  id="f-sample_size"
                  name="sample_size"
                  type="number"
                  min={0}
                  required
                  defaultValue={preview?.rowCount ?? ""}
                  className="input tnum"
                />
              </Field>
            </div>
            <Field label={t("fieldTargetPopulation")} name="target_population">
              <input
                id="f-target_population"
                name="target_population"
                required
                className="input"
                placeholder={t("populationPlaceholder")}
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label={t("fieldFieldworkStart")}
                name="fieldwork_start"
                hint={
                  preview?.fieldworkStart
                    ? t("prefilledFromTimestamps")
                    : undefined
                }
              >
                <input
                  key={`fieldwork_start-${preview?.parseId ?? 0}`}
                  id="f-fieldwork_start"
                  name="fieldwork_start"
                  type="date"
                  required
                  defaultValue={preview?.fieldworkStart ?? ""}
                  className="input"
                />
              </Field>
              <Field
                label={t("fieldFieldworkEnd")}
                name="fieldwork_end"
                hint={
                  preview?.fieldworkEnd
                    ? t("prefilledFromTimestamps")
                    : undefined
                }
              >
                <input
                  key={`fieldwork_end-${preview?.parseId ?? 0}`}
                  id="f-fieldwork_end"
                  name="fieldwork_end"
                  type="date"
                  required
                  defaultValue={preview?.fieldworkEnd ?? ""}
                  className="input"
                />
              </Field>
            </div>
            <Field
              label={t("fieldLanguages")}
              name="languages"
              hint={t("languagesHint")}
            >
              <input
                id="f-languages"
                name="languages"
                required
                className="input"
                placeholder="Uzbek, Russian"
              />
            </Field>
            <Field
              label={t("fieldLicense")}
              name="license"
              group
              hint={t("licenseHint")}
            >
              <LicensePicker />
            </Field>
            <Field
              label={t("fieldQuestionnaireText")}
              name="questionnaire_text"
              optional
              hint={t("questionnaireHint")}
            >
              <textarea
                id="f-questionnaire_text"
                name="questionnaire_text"
                rows={6}
                className="input"
                placeholder={t("questionnairePlaceholder")}
              />
            </Field>
          </div>

          <div className="flex justify-between">
            <button type="button" onClick={goBack} className="btn btn-ghost">
              <ArrowLeftIcon size={15} />
              {t("prevStep")}
            </button>
            <button type="button" onClick={goNext} className="btn btn-primary">
              {t("nextStep")}
              <ArrowRightIcon size={15} />
            </button>
          </div>
        </div>

        {/* ---------------- step 3: publish ---------------- */}
        <div ref={publishRef} hidden={step !== "publish"} className="space-y-5">
          <div className="card space-y-5 p-6">
            <div>
              <p className="font-display flex items-center gap-2 font-bold text-ink">
                <FileTextIcon size={17} className="text-brand" />
                {t("publicationSectionTitle")}
              </p>
              <p className="hint">{t("publicationHint")}</p>
            </div>
            <Field
              label={t("fieldPublicationTitle")}
              name="publication_title"
              optional
            >
              <input
                id="f-publication_title"
                name="publication_title"
                className="input"
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label={t("fieldPublicationAuthors")}
                name="publication_authors"
                optional
              >
                <input
                  id="f-publication_authors"
                  name="publication_authors"
                  className="input"
                />
              </Field>
              <Field
                label={t("fieldPublicationYear")}
                name="publication_year"
                optional
              >
                <input
                  id="f-publication_year"
                  name="publication_year"
                  type="number"
                  className="input tnum"
                />
              </Field>
            </div>
            <Field
              label={t("fieldPublicationUrl")}
              name="publication_url"
              optional
            >
              <input
                id="f-publication_url"
                name="publication_url"
                className="input"
                placeholder="https://doi.org/…"
              />
            </Field>
          </div>

          {summary && (
            <div className="card space-y-5 p-6">
              <div>
                <p className="font-display flex items-center gap-2 font-bold text-ink">
                  <QuoteIcon size={17} className="text-brand" />
                  {t("reviewCitationTitle")}
                </p>
                <p className="hint">{t("reviewCitationHint")}</p>
              </div>

              <p className="rounded-xl bg-brand-wash p-3.5 font-mono text-xs leading-relaxed break-words text-soft">
                {summary.citation}
              </p>
              {/* The slug carries a random suffix assigned at insert time, so
                  the permanent link does not exist yet. Saying so beats
                  printing a guess that would 404. */}
              <p className="text-xs leading-relaxed text-faint">
                {t("reviewLinkPending")}
              </p>
              <CopyButton
                text={summary.citation}
                label={t("copyCitation")}
                copiedLabel={t("citationCopied")}
              />

              <dl className="grid gap-x-6 gap-y-3 border-t border-line pt-5 text-sm sm:grid-cols-2">
                <ReviewRow label={t("reviewTitle")} value={summary.title} />
                <ReviewRow
                  label={t("fieldSampleSize")}
                  value={
                    summary.sampleSize
                      ? Number(summary.sampleSize).toLocaleString(locale)
                      : null
                  }
                />
                <ReviewRow
                  label={t("reviewFieldwork")}
                  value={
                    summary.fieldworkStart && summary.fieldworkEnd
                      ? `${summary.fieldworkStart} → ${summary.fieldworkEnd}`
                      : null
                  }
                />
                <ReviewRow label={t("fieldLicense")} value={summary.license} />
                <ReviewRow
                  label={t("fieldTopics")}
                  value={
                    summary.topics.length > 0 ? summary.topics.join(", ") : null
                  }
                />
                <ReviewRow
                  label={t("reviewColumnsKept")}
                  value={
                    preview
                      ? String(preview.headerCount - preview.piiHeaders.length)
                      : null
                  }
                />
              </dl>

              {preview && preview.piiHeaders.length > 0 && (
                <div className="border-t border-line pt-5">
                  <p className="flex items-center gap-2 text-sm font-bold text-ink">
                    <ShieldIcon size={16} className="text-sun" />
                    {t("reviewStripped")}
                  </p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {preview.piiHeaders.map((h) => (
                      <li
                        key={h}
                        className="chip bg-card-soft font-mono text-xs text-soft"
                      >
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="rounded-2xl bg-brand-wash p-5 text-sm leading-relaxed text-soft">
            {t("moderationNote")}
          </div>

          <div className="flex justify-between">
            <button type="button" onClick={goBack} className="btn btn-ghost">
              <ArrowLeftIcon size={15} />
              {t("prevStep")}
            </button>
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={pending}
              className="btn btn-coral"
            >
              {pending ? t("submitting") : t("submit")}
              {!pending && <ArrowRightIcon size={15} />}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

/** One row of the review summary. An unanswered optional field is shown as a
 *  dash rather than hidden — a depositor scanning for what they forgot needs
 *  the gap to be visible. */
function ReviewRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-wide text-faint uppercase">
        {label}
      </dt>
      <dd className={value ? "mt-0.5 text-ink" : "mt-0.5 text-faint"}>
        {value || "—"}
      </dd>
    </div>
  );
}

/**
 * Marks every field as required or optional, rather than only rejecting the
 * empty ones at submit time. Most of these answers were already mandatory, but
 * nothing said so until the browser refused to continue — which reads as the
 * form being broken rather than as an answer being missing.
 *
 * `group` is for fields whose control is a set of chips or radios: there is no
 * single element for `htmlFor` to point at, and a label pointing nowhere is
 * worse for a screen reader than a plain caption.
 */
function Field({
  label,
  name,
  hint,
  optional,
  group,
  children,
}: {
  label: string;
  name: string;
  hint?: string;
  optional?: boolean;
  group?: boolean;
  children: ReactNode;
}) {
  const t = useTranslations("Deposit");
  const caption = (
    <>
      {label}
      {optional ? (
        <span className="ml-1.5 text-xs font-normal text-faint">
          {t("optionalTag")}
        </span>
      ) : (
        <span aria-hidden className="ml-1 text-danger">
          *
        </span>
      )}
    </>
  );

  return (
    <div>
      {group ? (
        <span className="label">{caption}</span>
      ) : (
        <label className="label" htmlFor={`f-${name}`}>
          {caption}
        </label>
      )}
      {children}
      {hint && <p className="hint">{hint}</p>}
    </div>
  );
}
