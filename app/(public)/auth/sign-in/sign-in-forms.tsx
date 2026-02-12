"use client";

import { useActionState, useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { INITIAL_AUTH_FORM_STATE, type AuthFormState } from "./auth-form-state";

type AuthAction = (state: AuthFormState, formData: FormData) => Promise<AuthFormState>;

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

function PasswordField({
  id,
  name,
  autoComplete,
  ariaInvalid,
  ariaDescribedBy,
  error,
  hint,
  visible,
  onToggle,
}: {
  id: string;
  name: string;
  autoComplete: string;
  ariaInvalid: boolean;
  ariaDescribedBy?: string;
  error?: string;
  hint?: string;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Password</Label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          required
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          className={cn(error ? "border-red-300 pr-10 focus-visible:ring-red-500" : "pr-10")}
        />
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
          onClick={onToggle}
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error ? <p className="text-xs text-red-700">{error}</p> : hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
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
  const [signInState, signInFormAction, isSigningIn] = useActionState(signInAction, INITIAL_AUTH_FORM_STATE);
  const [signUpState, signUpFormAction, isSigningUp] = useActionState(signUpAction, INITIAL_AUTH_FORM_STATE);
  const [activeTab, setActiveTab] = useState<"sign_in" | "sign_up">("sign_in");
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  useEffect(() => {
    if (created) {
      setActiveTab("sign_in");
    }
  }, [created]);

  return (
    <Card className="w-full max-w-lg border-border bg-card/90 backdrop-blur">
      <CardHeader>
        <CardTitle className="font-[var(--font-display)] text-3xl text-foreground">KTH Thesis Tracker</CardTitle>
        <CardDescription>
          Plan, track, and deliver your thesis work from one workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {created ? (
          <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
            Account created. You can now sign in.
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2 rounded-md border border-border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("sign_in")}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition",
              activeTab === "sign_in" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sign_up")}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition",
              activeTab === "sign_up" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            Create account
          </button>
        </div>

        {activeTab === "sign_in" ? (
          <form action={signInFormAction} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="signin-username">Username</Label>
              <Input
                id="signin-username"
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

            <PasswordField
              id="signin-password"
              name="password"
              autoComplete="current-password"
              ariaInvalid={Boolean(signInState.fieldErrors?.password)}
              ariaDescribedBy={signInState.fieldErrors?.password ? "signin-password-error" : undefined}
              error={signInState.fieldErrors?.password}
              visible={showSignInPassword}
              onToggle={() => setShowSignInPassword((value) => !value)}
            />

            <InlineAuthMessage state={signInState} id="signin-message" />
            <Button type="submit" className="w-full" disabled={isSigningIn}>
              {isSigningIn ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        ) : (
          <form action={signUpFormAction} className="space-y-4" noValidate>
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

            <PasswordField
              id="signup-password"
              name="password"
              autoComplete="new-password"
              ariaInvalid={Boolean(signUpState.fieldErrors?.password)}
              ariaDescribedBy={signUpState.fieldErrors?.password ? "signup-password-error" : "signup-password-hint"}
              error={signUpState.fieldErrors?.password}
              hint="Use at least 8 characters."
              visible={showSignUpPassword}
              onToggle={() => setShowSignUpPassword((value) => !value)}
            />

            <InlineAuthMessage state={signUpState} id="signup-message" />
            <Button type="submit" className="w-full" disabled={isSigningUp}>
              {isSigningUp ? "Creating account..." : "Create account"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
