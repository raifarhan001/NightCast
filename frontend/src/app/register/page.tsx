import { redirect } from "next/navigation";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const redirectTarget = params?.redirect
    ? `?redirect=${encodeURIComponent(String(params.redirect))}`
    : "";
  redirect(`/signup${redirectTarget}`);
}
