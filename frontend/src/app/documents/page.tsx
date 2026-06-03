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

  if (!user) {
    redirect("/login");
  }

  // 1. Fetch User Profile
  let finalName = "User";
  const { data: profileData } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  if (profileData && profileData.full_name) {
    finalName = profileData.full_name;
  } else {
    finalName = user.user_metadata?.full_name
      || user.user_metadata?.name
      || user.email?.split("@")[0]
      || "User";
  }

  // 2. Fetch User Documents
  const { data: docsData } = await supabase
    .from("user_documents")
    .select("*")
    .eq("user_id", user.id);

  const resume = docsData?.find((d) => d.document_type === "resume") || null;
  const coverLetter = docsData?.find((d) => d.document_type === "cover_letter") || null;

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
      }}
      initialResume={resume}
      initialCoverLetter={coverLetter}
      initialSearches={searchData || []}
    />
  );
}
