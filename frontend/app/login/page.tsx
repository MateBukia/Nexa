import { AuthForm } from "@/components/auth/auth-form";
import { AuthShell } from "@/components/auth/auth-shell";
import { getTranslations } from "@/lib/i18n/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const requestedPath = (await searchParams).next;
  const { t } = await getTranslations();
  const redirectTo =
    requestedPath?.startsWith("/") && !requestedPath.startsWith("//")
      ? requestedPath
      : "/";

  return (
    <AuthShell
      eyebrow={t("login.eyebrow")}
      title={t("login.title")}
      description={t("login.description")}
      alternateText={t("login.alternate")}
      alternateHref="/register"
      alternateLabel={t("auth.create")}
    >
      <AuthForm mode="login" redirectTo={redirectTo} />
    </AuthShell>
  );
}
