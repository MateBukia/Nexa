import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getTranslations } from "@/lib/i18n/server";

export default async function RegisterPage() {
  const { t } = await getTranslations();
  return (
    <AuthShell
      eyebrow={t("register.eyebrow")}
      title={t("register.title")}
      description={t("register.description")}
      alternateText={t("register.alternate")}
      alternateHref="/login"
      alternateLabel={t("auth.signIn")}
    >
      <AuthForm mode="register" />
    </AuthShell>
  );
}
