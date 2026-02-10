import { redirect } from "next/navigation";
import { getUserOrNull } from "@/lib/auth/session";
import { SignInContent } from "@/app/(public)/auth/sign-in/sign-in-content";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const user = await getUserOrNull();
  if (user) {
    redirect("/app");
  }

  return <SignInContent searchParams={searchParams} />;
}
