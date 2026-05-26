import { Suspense } from "react";
import { ResetPasswordPage } from "../../components/auth/ResetPasswordPage";

export const metadata = {
  title: "Reset Password - Jobscape AI",
  description: "Choose a new password for your Jobscape AI account.",
};

export default function ResetPassword() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPage />
    </Suspense>
  );
}
