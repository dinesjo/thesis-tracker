import { SignInContent } from "./sign-in-content";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  return <SignInContent searchParams={searchParams} />;
}
