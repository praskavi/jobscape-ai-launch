"use client";

import { useMemo, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/controllers/suabaseClient";

type SettingsProfile = {
  id: string | null;
  user_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  location: string | null;
  linkedin_url: string | null;
};

type SettingsProfileFormProps = {
  profile: SettingsProfile;
};

export function SettingsProfileForm({ profile }: SettingsProfileFormProps) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [linkedInUrl, setLinkedInUrl] = useState(profile.linkedin_url ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const hasChanges = useMemo(
    () =>
      fullName !== profile.full_name ||
      phone !== (profile.phone ?? "") ||
      location !== (profile.location ?? "") ||
      linkedInUrl !== (profile.linkedin_url ?? ""),
    [fullName, linkedInUrl, location, phone, profile]
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      toast.error("Full name is required.");
      return;
    }

    setIsSaving(true);

    const { error } = await supabase
      .from("user_profiles")
      .upsert(
        {
          user_id: profile.user_id,
          email: profile.email,
          full_name: trimmedName,
          phone: phone.trim() || null,
          location: location.trim() || null,
          linkedin_url: linkedInUrl.trim() || null,
        },
        { onConflict: "user_id" }
      );

    setIsSaving(false);

    if (error) {
      toast.error("Unable to save profile.", {
        description: error.message,
      });
      return;
    }

    toast.success("Profile updated.");
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-8">
      <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Profile</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep your account details current for document and job matching workflows.
          </p>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile.email} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="full-name">Full name</Label>
            <Input
              id="full-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              autoComplete="name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              autoComplete="tel"
              placeholder="+61 400 000 000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              autoComplete="address-level2"
              placeholder="Sydney, NSW"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="linkedin-url">LinkedIn URL</Label>
            <Input
              id="linkedin-url"
              value={linkedInUrl}
              onChange={(event) => setLinkedInUrl(event.target.value)}
              autoComplete="url"
              placeholder="https://www.linkedin.com/in/your-profile"
              type="url"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Profile fields are saved to Supabase and protected by row-level security.
          </p>
          <Button type="submit" disabled={isSaving || !hasChanges}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save changes
          </Button>
        </div>
      </section>
    </form>
  );
}
