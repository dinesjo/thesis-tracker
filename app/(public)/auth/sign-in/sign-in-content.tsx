import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn } from "@/auth";
import { createUser } from "@/lib/auth/users";
import {
  type AuthFieldErrors,
  type AuthFormState,
} from "./auth-form-state";
import { SignInForms } from "./sign-in-forms";

const usernameField = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(32, "Username must be 32 characters or fewer")
  .regex(/^[a-zA-Z0-9._-]+$/, "Use letters, numbers, dot, underscore, or dash");

const signInSchema = z.object({
  username: usernameField,
  password: z.string().min(1, "Password is required"),
});

const signUpSchema = z.object({
  username: usernameField,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be 72 characters or fewer"),
});

function fieldErrorsFromZodIssues(
  issues: z.ZodIssue[],
): AuthFieldErrors | undefined {
  const fieldErrors: AuthFieldErrors = {};

  for (const issue of issues) {
    const field = issue.path[0];
    if (field === "username" && !fieldErrors.username) {
      fieldErrors.username = issue.message;
    }

    if (field === "password" && !fieldErrors.password) {
      fieldErrors.password = issue.message;
    }
  }

  return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined;
}

function mapSignUpError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("username already exists")) {
    return "That username is already taken.";
  }

  return "Could not create your account right now. Please try again.";
}

export async function signInWithPassword(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  "use server";

  const parsed = signInSchema.safeParse({
    username: String(formData.get("username") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsFromZodIssues(parsed.error.issues),
    };
  }

  try {
    await signIn("credentials", {
      username: parsed.data.username.toLowerCase(),
      password: parsed.data.password,
      redirectTo: "/app",
    });
  } catch (error) {
    if (!(error instanceof AuthError)) {
      throw error;
    }

    return {
      status: "error",
      message: error.type === "CredentialsSignin"
        ? "Invalid username or password."
        : "Could not sign in right now. Please try again.",
    };
  }

  return { status: "idle" };
}

export async function signUpWithPassword(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  "use server";

  const parsed = signUpSchema.safeParse({
    username: String(formData.get("username") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Please correct the highlighted fields.",
      fieldErrors: fieldErrorsFromZodIssues(parsed.error.issues),
    };
  }

  try {
    await createUser(parsed.data.username, parsed.data.password);
  } catch (error) {
    return {
      status: "error",
      message: mapSignUpError(error),
    };
  }

  redirect("/auth/sign-in?created=1");
}

export async function SignInContent({
  searchParams,
}: {
  searchParams: Promise<{ created?: string }>;
}) {
  const params = await searchParams;
  const created = params.created === "1";

  return (
    <main className="editorial-grid flex min-h-screen items-center justify-center p-6">
      <SignInForms
        created={created}
        signInAction={signInWithPassword}
        signUpAction={signUpWithPassword}
      />
    </main>
  );
}
