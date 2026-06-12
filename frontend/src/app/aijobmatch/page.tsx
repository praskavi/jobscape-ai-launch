import {AIJobMatch } from "@/components/AIJobMatch/AIJobMatch";

export default function AIJobMatchPage() {
  return (
    <div className="flex h-full w-full flex-col p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          AI Job Matcher
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload your resume and search for roles to see your real-time vector match score.
        </p>
      </div>
      
      {/* Renders the component we built */}
      <AIJobMatch />
    </div>
  );
}