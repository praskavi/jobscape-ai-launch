import { redirect } from "next/navigation";

import { SettingsProfileForm } from "@/components/settings/SettingsProfileForm";
import { createClient } from "@/utils/supabase/server";

export const metadata = {
  title: "Settings - Jobscape AI",
  description: "Manage your Jobscape AI account settings.",
};

export default async function Settings() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const fallbackName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "User";

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("id, user_id, email, full_name, phone, location, linkedin_url")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary">
          Settings
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Account settings
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Manage the profile details Jobscape AI uses across your dashboard,
          documents, and matching workflows.
        </p>
      </div>

      <SettingsProfileForm
        profile={{
          id: profile?.id ?? null,
          user_id: user.id,
          email: profile?.email ?? user.email ?? "",
          full_name: profile?.full_name ?? fallbackName,
          phone: profile?.phone ?? null,
          location: profile?.location ?? null,
          linkedin_url: profile?.linkedin_url ?? null,
        }}
      />
    </div>
  );
}
