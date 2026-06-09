import { DashboardPage } from "../../components/dashboard/DashboardPage";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Dashboard - Jobscape AI",
  description:
    "Manage your resume, cover letter, and job search activity in your Jobscape AI dashboard.",
};

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 1. Fetch User Profile
  let finalName = "User";
  let profileId = "";
  const { data: profileData } = await supabase
    .from("user_profiles")
    .select("id, full_name")
    .eq("user_id", user.id)
    .single();

  if (profileData) {
    profileId = profileData.id;
    if (profileData.full_name) {
      finalName = profileData.full_name;
    }
  } else {
    finalName = user.user_metadata?.full_name
      || user.user_metadata?.name
      || user.email?.split("@")[0]
      || "User";
  }

  // 2. Fetch User Documents
  let resume = null;
  let coverLetter = null;

  if (profileId) {
    const { data: docsData } = await supabase
      .from("user_files")
      .select("*")
      .eq("user_profile_id", profileId);

    if (docsData) {
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
        };
      };

      const resumeDb = docsData.find((d) => d.file_type === "resume");
      if (resumeDb) {
        resume = await formatDoc(resumeDb);
      }

      const coverLetterDb = docsData.find((d) => d.file_type === "cover_letter");
      if (coverLetterDb) {
        coverLetter = await formatDoc(coverLetterDb);
      }
    }
  }

  // 3. Fetch Real Search History
  const { data: searchData } = await supabase
    .from("search_history")
    .select("*")
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
      initialCoverLetter={coverLetter}
      initialSearches={searchData || []}
    />
  );
}
