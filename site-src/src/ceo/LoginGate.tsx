import { useState, type FormEvent } from "react";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { login } from "./api";

type LoginGateProps = {
  initialError?: string;
  onSuccess: () => void;
};

export function LoginGate({ initialError, onSuccess }: LoginGateProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError ?? "");
  const [isSubmitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password) {
      setError("Enter the CEO password.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await login(password);
      setPassword("");
      onSuccess();
    } catch (loginError) {
      setError(loginError instanceof Error && loginError.message !== "AUTH_REQUIRED"
        ? loginError.message
        : "That password was not accepted.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="ceo-login-shell">
      <section className="ceo-login-panel" aria-labelledby="ceo-login-title">
        <div className="ceo-login-mark" aria-hidden="true">
          <LockKeyhole />
        </div>
        <div className="ceo-login-copy">
          <p className="ceo-brand-wordmark">ANCBuddy</p>
          <h1 id="ceo-login-title">CEO Inbox</h1>
          <p>Only approved actions can leave this system.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="ceo-password">Password</FieldLabel>
              <Input
                id="ceo-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                aria-invalid={Boolean(error)}
                autoFocus
              />
              <FieldDescription>A secure HTTP-only session cookie keeps this device signed in.</FieldDescription>
              {error ? <FieldError>{error}</FieldError> : null}
            </Field>
          </FieldGroup>
          <Button type="submit" variant="approve" disabled={isSubmitting}>
            {isSubmitting ? "Opening…" : "Open inbox"}
            <ArrowRight data-icon="inline-end" />
          </Button>
        </form>
      </section>
    </main>
  );
}
