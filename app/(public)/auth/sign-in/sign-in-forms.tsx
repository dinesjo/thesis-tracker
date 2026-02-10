"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  INITIAL_AUTH_FORM_STATE,
  type AuthFormState,
} from "./auth-form-state";

type AuthAction = (
  state: AuthFormState,
  formData: FormData,
) => Promise<AuthFormState>;

function InlineAuthMessage({
  state,
  id,
}: {
  state: AuthFormState;
  id: string;
}) {
  if (state.status !== "error" || !state.message) {
    return null;
  }

  return (
    <p
      id={id}
      role="alert"
      className="rounded-md border border-red-300/70 bg-red-100/80 px-3 py-2 text-sm text-red-800 dark:border-red-500/50 dark:bg-red-950/45 dark:text-red-200"
    >
      {state.message}
    </p>
  );
}

export function SignInForms({
  created,
  signInAction,
  signUpAction,
}: {
  created: boolean;
  signInAction: AuthAction;
  signUpAction: AuthAction;
}) {
  const [signInState, signInFormAction, isSigningIn] = useActionState(
    signInAction,
    INITIAL_AUTH_FORM_STATE,
  );
  const [signUpState, signUpFormAction, isSigningUp] = useActionState(
    signUpAction,
    INITIAL_AUTH_FORM_STATE,
  );

  return (
    <Card className="w-full max-w-lg border-border bg-card/90 backdrop-blur">
      <CardHeader>
        <CardTitle className="font-[var(--font-display)] text-3xl text-foreground">
          KTH Thesis Tracker
        </CardTitle>
        <CardDescription>
          Sign in with username and password to access your thesis board, timeline, and deliverables.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={signInFormAction} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              type="text"
              placeholder="linus"
              autoComplete="username"
              required
              aria-invalid={Boolean(signInState.fieldErrors?.username)}
              aria-describedby={signInState.fieldErrors?.username ? "signin-username-error" : undefined}
              className={cn(signInState.fieldErrors?.username ? "border-red-300 focus-visible:ring-red-500" : "")}
            />
            {signInState.fieldErrors?.username ? (
              <p id="signin-username-error" className="text-xs text-red-700">
                {signInState.fieldErrors.username}
              </p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={Boolean(signInState.fieldErrors?.password)}
              aria-describedby={signInState.fieldErrors?.password ? "signin-password-error" : undefined}
              className={cn(
                signInState.fieldErrors?.password
                  ? "border-red-300 focus-visible:ring-red-500"
                  : "",
              )}
            />
            {signInState.fieldErrors?.password ? (
              <p id="signin-password-error" className="text-xs text-red-700">
                {signInState.fieldErrors.password}
              </p>
            ) : null}
          </div>
          <InlineAuthMessage state={signInState} id="signin-message" />
          <Button type="submit" className="w-full" disabled={isSigningIn}>
            {isSigningIn ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <form
          action={signUpFormAction}
          className="space-y-3 rounded-md border border-dashed border-border p-3"
          noValidate
        >
          <p className="text-sm text-muted-foreground">No account yet? Create one:</p>
          <div className="space-y-2">
            <Label htmlFor="signup-username">Username</Label>
            <Input
              id="signup-username"
              name="username"
              type="text"
              placeholder="linus"
              autoComplete="username"
              required
              aria-invalid={Boolean(signUpState.fieldErrors?.username)}
              aria-describedby={signUpState.fieldErrors?.username ? "signup-username-error" : "signup-username-hint"}
              className={cn(signUpState.fieldErrors?.username ? "border-red-300 focus-visible:ring-red-500" : "")}
            />
            {signUpState.fieldErrors?.username ? (
              <p id="signup-username-error" className="text-xs text-red-700">
                {signUpState.fieldErrors.username}
              </p>
            ) : (
              <p id="signup-username-hint" className="text-xs text-muted-foreground">
                3-32 chars, letters/numbers/dot/underscore/dash.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-password">Password</Label>
            <Input
              id="signup-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              aria-invalid={Boolean(signUpState.fieldErrors?.password)}
              aria-describedby={signUpState.fieldErrors?.password ? "signup-password-error" : "signup-password-hint"}
              className={cn(
                signUpState.fieldErrors?.password
                  ? "border-red-300 focus-visible:ring-red-500"
                  : "",
              )}
            />
            {signUpState.fieldErrors?.password ? (
              <p id="signup-password-error" className="text-xs text-red-700">
                {signUpState.fieldErrors.password}
              </p>
            ) : (
              <p id="signup-password-hint" className="text-xs text-muted-foreground">
                Use at least 8 characters.
              </p>
            )}
          </div>
          <InlineAuthMessage state={signUpState} id="signup-message" />
          <Button type="submit" variant="outline" className="w-full" disabled={isSigningUp}>
            {isSigningUp ? "Creating account..." : "Create account"}
          </Button>
        </form>

        {created ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-300">Account created. You can now sign in.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
