"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  COLLECTION_METHODS,
  LICENSES,
  OTHER,
  PLATFORMS,
  TOPICS,
} from "@/lib/survey-vocab";

/**
 * Stands in for a `required` that a group of controls cannot carry itself — a
 * set of checkboxes has no native "at least one" rule.
 *
 * It reports through `setCustomValidity` rather than the `required` attribute
 * for two reasons: `required` would produce the browser's generic "please fill
 * out this field" for a field the depositor cannot see, and a `readonly` or
 * `display:none` control is barred from constraint validation altogether, so
 * the check would never fire at all. Sized to a pixel and faded rather than
 * hidden, since a control the browser considers unrenderable is one it refuses
 * to focus, and `reportValidity()` on an unfocusable field fails silently —
 * the form would simply stop submitting with no message anywhere. Deliberately
 * unnamed, so it contributes nothing to the submitted FormData.
 */
function RequiredGroup({
  satisfied,
  message,
}: {
  satisfied: boolean;
  message: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.setCustomValidity(satisfied ? "" : message);
  }, [satisfied, message]);

  return (
    <input
      ref={ref}
      aria-hidden
      tabIndex={-1}
      defaultValue=""
      className="pointer-events-none absolute h-px w-px opacity-0"
    />
  );
}

const CHIP =
  "cursor-pointer rounded-full border border-line bg-card-soft px-3.5 py-1.5 text-sm font-medium text-soft transition hover:border-brand " +
  "peer-checked:border-brand peer-checked:bg-brand-soft peer-checked:font-semibold peer-checked:text-brand-ink " +
  "peer-focus-visible:ring-2 peer-focus-visible:ring-brand";

/**
 * Topics as chips rather than a comma-separated text box.
 *
 * Every chip submits under the same `topics` name, so the server reads them
 * with `getAll` and the free-text box for "Other" is just one more entry —
 * no separate field to reconcile, and a depositor can combine preset topics
 * with one of their own.
 */
export function TopicPicker() {
  const t = useTranslations("Deposit");
  const v = useTranslations("Vocab");
  const [other, setOther] = useState(false);
  const [count, setCount] = useState(0);

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2">
        {TOPICS.map((topic) => (
          <label key={topic.value}>
            <input
              type="checkbox"
              name="topics"
              value={topic.value}
              className="peer sr-only"
              onChange={(e) => {
                const { checked } = e.currentTarget;
                setCount((c) => c + (checked ? 1 : -1));
              }}
            />
            <span className={CHIP}>{v(topic.key)}</span>
          </label>
        ))}
        <label>
          <input
            type="checkbox"
            className="peer sr-only"
            checked={other}
            onChange={(e) => setOther(e.currentTarget.checked)}
          />
          <span className={CHIP}>{t("optionOther")}</span>
        </label>
      </div>

      {other && (
        <input
          name="topics"
          required
          autoFocus
          className="input mt-3"
          placeholder={t("topicsOtherPlaceholder")}
        />
      )}

      <RequiredGroup
        satisfied={count > 0 || other}
        message={t("topicsRequired")}
      />
    </div>
  );
}

/**
 * Collection method, plus the platform question that only makes sense for the
 * modes that can have one. A paper questionnaire is never asked what software
 * it ran on.
 */
export function MethodPicker() {
  const t = useTranslations("Deposit");
  const v = useTranslations("Vocab");
  const [method, setMethod] = useState("");
  const [platform, setPlatform] = useState("");

  const selected = COLLECTION_METHODS.find((m) => m.value === method);

  return (
    <div className="space-y-3">
      <select
        id="f-collection_method"
        name="collection_method"
        required
        value={method}
        onChange={(e) => setMethod(e.currentTarget.value)}
        className="input"
      >
        <option value="">{t("choosePlaceholder")}</option>
        {COLLECTION_METHODS.map((m) => (
          <option key={m.value} value={m.value}>
            {v(m.key)}
          </option>
        ))}
      </select>

      {method === OTHER && (
        <input
          name="collection_method_other"
          required
          autoFocus
          className="input"
          placeholder={t("methodOtherPlaceholder")}
        />
      )}

      {selected?.asksPlatform && (
        <div className="rounded-2xl bg-card-soft p-4">
          <label className="label" htmlFor="f-collection_platform">
            {t("fieldPlatform")}
          </label>
          <select
            id="f-collection_platform"
            name="collection_platform"
            value={platform}
            onChange={(e) => setPlatform(e.currentTarget.value)}
            className="input"
          >
            <option value="">{t("choosePlaceholder")}</option>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p === OTHER ? t("optionOther") : p}
              </option>
            ))}
          </select>
          {platform === OTHER && (
            <input
              name="collection_platform_other"
              autoFocus
              className="input mt-3"
              placeholder={t("platformOtherPlaceholder")}
            />
          )}
          <p className="hint">{t("platformHint")}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Licences as labelled cards instead of a bare dropdown.
 *
 * The old control offered "CC-BY / CC-BY-SA / CC0" and explained none of them,
 * which asks a depositor to make a legal choice from three initialisms. Each
 * option now states, in one line, what someone reusing the data would have to
 * do — that is the only part of the licence a depositor is actually deciding.
 */
export function LicensePicker() {
  const t = useTranslations("Deposit");
  const v = useTranslations("Vocab");
  const [license, setLicense] = useState(LICENSES[0].value);

  return (
    <div className="space-y-2">
      {LICENSES.map((l) => (
        <label
          key={l.value}
          className={`flex cursor-pointer gap-3 rounded-2xl border p-3.5 transition ${
            license === l.value
              ? "border-brand bg-brand-wash"
              : "border-line hover:border-brand"
          }`}
        >
          <input
            type="radio"
            name="license"
            value={l.value}
            checked={license === l.value}
            onChange={(e) => setLicense(e.currentTarget.value)}
            className="mt-1 h-4 w-4 shrink-0 accent-[var(--brand)]"
          />
          <span>
            <span className="block text-sm font-bold text-ink">{v(l.key)}</span>
            <span className="block text-xs leading-relaxed text-soft">
              {t(l.blurbKey)}
            </span>
          </span>
        </label>
      ))}

      {license === OTHER && (
        <input
          name="license_other"
          required
          autoFocus
          className="input"
          placeholder={t("licenseOtherPlaceholder")}
        />
      )}
    </div>
  );
}


/**
 * Wraps the publication fields in the question they answer.
 *
 * They used to sit open on the page as four optional boxes, which asks nothing
 * of a depositor who did publish and explains nothing to one who did not.
 *
 * Neither option is preselected on purpose. Defaulting to "Not yet" would
 * recreate the very thing this replaces — a section that already looks
 * answered is a section you scroll past — and it is the depositor who
 * published, the case worth catching, who would be scrolling.
 *
 * The fields are unmounted rather than hidden while the answer is "Not yet",
 * so their `required` attributes leave with them and nothing they hold reaches
 * the submitted FormData.
 */
export function PublicationPicker({ children }: { children: ReactNode }) {
  const t = useTranslations("Deposit");
  const [published, setPublished] = useState<boolean | null>(null);

  const options = [
    { value: "yes", published: true, label: t("publicationYes") },
    { value: "no", published: false, label: t("publicationNo") },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-3.5 transition ${
              published === o.published
                ? "border-brand bg-brand-wash"
                : "border-line hover:border-brand"
            }`}
          >
            <input
              type="radio"
              name="has_publication"
              value={o.value}
              required
              checked={published === o.published}
              onChange={() => setPublished(o.published)}
              className="h-4 w-4 shrink-0 accent-[var(--brand)]"
            />
            <span className="text-sm font-semibold text-ink">{o.label}</span>
          </label>
        ))}
      </div>

      {published && (
        <div className="space-y-5 rounded-2xl bg-card-soft p-4">{children}</div>
      )}
    </div>
  );
}
