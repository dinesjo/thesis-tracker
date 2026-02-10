export type AuthFieldErrors = {
  username?: string;
  password?: string;
};

export type AuthFormState = {
  status: "idle" | "error";
  message?: string;
  fieldErrors?: AuthFieldErrors;
};

export const INITIAL_AUTH_FORM_STATE: AuthFormState = {
  status: "idle",
};
