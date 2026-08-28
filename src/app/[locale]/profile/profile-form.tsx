"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/avatar";
import { CheckIcon } from "@/components/icons";
import { updateProfile, type ProfileState } from "./actions";
import type { Profile } from "@/lib/profiles";
import type { Locale } from "@/i18n/routing";

const initialState: ProfileState = { error: null };

export function ProfileForm({ locale, profile }: { locale: Locale; profile: Profile }) {
  const t = useTranslations("Profile");
  const boundAction = updateProfile.bind(null, locale);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  // Local preview so the chosen file is visible before the form round-trips.
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState(profile.name ?? "");

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="card flex flex-wrap items-center gap-5 p-5">
        <Avatar name={name} src={preview ?? profile.avatar_url} size={72} />
        <div className="min-w-[14rem] flex-1">
          <label className="label" htmlFor="avatar">
            {t("fieldAvatar")}
          </label>
          <input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="input"
            onChange={(e) => {
              const file = e.target.files?.[0];
              // Revoke the previous object URL so repeated picks don't leak.
              setPreview((old) => {
                if (old) URL.revokeObjectURL(old);
                return file ? URL.createObjectURL(file) : null;
              });
            }}
          />
          <p className="hint">{t("avatarHint")}</p>
        </div>
      </div>

      <div className="card grid gap-5 p-5 sm:grid-cols-2">
        <div className="sm:col-span-1">
          <label className="label" htmlFor="name">
            {t("fieldName")}
          </label>
          <input
            id="name"
            name="name"
            className="input"
            maxLength={120}
            defaultValue={profile.name ?? ""}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="sm:col-span-1">
          <label className="label" htmlFor="affiliation">
            {t("fieldAffiliation")}
          </label>
          <input
            id="affiliation"
            name="affiliation"
            className="input"
            maxLength={160}
            defaultValue={profile.affiliation ?? ""}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="bio">
            {t("fieldBio")}
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={4}
            maxLength={600}
            className="input"
            defaultValue={profile.bio ?? ""}
          />
          <p className="hint">{t("bioHint")}</p>
        </div>

        <div>
          <label className="label" htmlFor="contact_email">
            {t("fieldContactEmail")}
          </label>
          <input
            id="contact_email"
            name="contact_email"
            type="email"
            className="input"
            defaultValue={profile.contact_email ?? ""}
          />
          <p className="hint">{t("contactEmailHint")}</p>
        </div>

        <div>
          <label className="label" htmlFor="website">
            {t("fieldWebsite")}
          </label>
          <input
            id="website"
            name="website"
            className="input"
            placeholder="example.uz"
            defaultValue={profile.website ?? ""}
          />
        </div>

        <div>
          <label className="label" htmlFor="orcid">
            {t("fieldOrcid")}
          </label>
          <input
            id="orcid"
            name="orcid"
            className="input"
            placeholder="0000-0002-1825-0097"
            pattern="\d{4}-\d{4}-\d{4}-\d{3}[\dX]"
            defaultValue={profile.orcid ?? ""}
          />
          <p className="hint">{t("orcidHint")}</p>
        </div>
      </div>

      {state.error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-semibold text-danger">
          {t(state.error)}
        </p>
      )}
      {state.saved && !state.error && (
        <p role="status" className="flex items-center gap-2 rounded-xl bg-mint-soft px-4 py-3 text-sm font-semibold text-mint-ink">
          <CheckIcon size={16} />
          {t("saved")}
        </p>
      )}

      <div>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? t("saving") : t("save")}
        </button>
      </div>
    </form>
  );
}
