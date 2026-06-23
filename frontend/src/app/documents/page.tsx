import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Documents - Jobscape AI",
  description:
    "Upload and manage your resume and cover letter for Jobscape AI matching.",
};

export default async function Documents() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 1. Fetch User Profile + plan tier
  let finalName = "User";
  let profileId = "";

  const { data: profileData } = await supabase
    .from("user_profiles")
    .select("id, full_name")
    .eq("user_id", user.id)
    .single();

  if (profileData) {
    profileId = profileData.id;
    if (profileData.full_name) finalName = profileData.full_name;
  } else {
    finalName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "User";
  }

  const { data: subData } = await supabase
    .from("user_subscriptions")
    .select("subscription_plans!inner(plan_code)")
    .eq("user_id", user.id)
    .in("status", ["trialing", "active", "past_due", "free"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const planCode = (subData as any)?.subscription_plans?.plan_code ?? "free";
  const isPremium = planCode === "premium";

  // 2. Fetch User Documents
  // KAN-37: Premium fetches all stored resumes (up to 3). Free/Basic fetches only the active one.
  let resume = null;
  let allResumes: any[] = [];
  let coverLetter = null;

  if (profileId) {
    const STORAGE_BUCKET = "user-documents";

    const formatDoc = async (dbFile: any) => {
      const { data: urlData } = await supabase.storage
        .from(STORAGE_BUCKET)
        .createSignedUrl(dbFile.file_path, 3600);
      return {
        id: dbFile.id,
        file_type: dbFile.file_type as "resume" | "cover_letter",
        file_name: dbFile.file_name,
        file_path: dbFile.file_path,
        file_url: urlData?.signedUrl || "",
        mime_type: dbFile.mime_type,
        file_size_bytes: dbFile.file_size_bytes,
        created_at: dbFile.created_at,
        is_current: dbFile.is_current ?? true,
      };
    };

    if (isPremium) {
      const { data: resumesData } = await supabase
        .from("user_files")
        .select("*")
        .eq("user_profile_id", profileId)
        .eq("file_type", "resume")
        .order("created_at", { ascending: false })
        .limit(3);

      if (resumesData && resumesData.length > 0) {
        allResumes = await Promise.all(resumesData.map(formatDoc));
        resume = allResumes.find((r) => r.is_current) ?? allResumes[0];
      }
    } else {
      const { data: resumeDb } = await supabase
        .from("user_files")
        .select("*")
        .eq("user_profile_id", profileId)
        .eq("file_type", "resume")
        .eq("is_current", true)
        .maybeSingle();

      if (resumeDb) {
        resume = await formatDoc(resumeDb);
        allResumes = [resume];
      }
    }

    const { data: coverLetterDb } = await supabase
      .from("user_files")
      .select("*")
      .eq("user_profile_id", profileId)
      .eq("file_type", "cover_letter")
      .eq("is_current", true)
      .maybeSingle();

    if (coverLetterDb) coverLetter = await formatDoc(coverLetterDb);
  }

  // 3. Recent AI job match runs (search_history table doesn't exist — KAN-37 bug fix)
  const { data: searchData } = await supabase
    .from("ai_job_match_runs")
    .select("id, job_title, location, result_count, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <DashboardPage
      initialUser={{ id: user.id, email: user.email || "", full_name: finalName, profileId }}
      initialResume={resume}
      initialResumes={allResumes}
      initialCoverLetter={coverLetter}
      initialSearches={searchData || []}
    />
  );
}
user_files")
        .select("*")
        .eq("user_profile_id", profileId)
        .eq("file_type", "resume")
        .eq("is_current", true)
        .maybeSingle();

      if (resumeDb) {
        resume = await formatDoc(resumeDb);
        allResumes = [resume];
      }
    }

    const { data: coverLetterDb } = await supabase
      .from("user_files")
      .select("*")
      .eq("user_profile_id", profileId)
      .eq("file_type", "cover_letter")
      .eq("is_current", true)
      .maybeSingle();

    if (coverLetterDb) {
      coverLetter = await formatDoc(coverLetterDb);
    }
  }

  // 3. Fetch recent AI job match runs (search_history table does not exist — fixed KAN-37)
  const { data: searchData } = await supabase
    .from("ai_job_match_runs")
    .select("id, job_title, location, result_count, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <DashboardPage
      initialUser={{
        id: user.id,
        email: user.email || "",
        full_name: finalName,
        profileId: profileId,
      }}
      initialResume={resume}
      initialResumes={allResumes}
      initialCoverLetter={coverLetter}
      initialSearches={searchData || []}
    />
  );
}
