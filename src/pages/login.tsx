import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  Button,
  Field,
  InlineAlert,
  OtpField,
  SegmentedControl,
} from "@/design-system/components";
import { ButterflyMark } from "@/components/app-shell";
import { appPath } from "@/lib/app-location";
import { signInFixture } from "@/lib/fixture-auth";
import "@/pages/login.css";

type Channel = "email" | "phone";
type AuthState =
  | "idle"
  | "sending"
  | "send-failure"
  | "google-failure"
  | "code"
  | "verifying"
  | "verify-failure"
  | "expired"
  | "cooldown"
  | "storage-failure";
const DEMO_CODE = "204815";

export function Login() {
  const [params] = useSearchParams();
  const requestedState = params.get("state");
  const initial = ["code", "send-failure", "google-failure", "verify-failure", "expired", "cooldown", "sending", "verifying", "storage-failure"].includes(requestedState ?? "") ? requestedState as AuthState : null;
  const [channel, setChannel] = useState<Channel>("email");
  const [authState, setAuthState] = useState<AuthState>(initial || "idle");
  const [fixturePreview, setFixturePreview] = useState(Boolean(initial));
  const [identity, setIdentity] = useState(
    initial &&
      initial !== "idle" &&
      initial !== "google-failure"
      ? "owner@kindred.example"
      : "",
  );
  const [code, setCode] = useState(
    initial === "verify-failure" ? "111111" :
      ["verifying", "expired", "storage-failure"].includes(initial ?? "") ? DEMO_CODE : "",
  );
  const [error, setError] = useState("");
  const identityInput = useRef<HTMLInputElement>(null);
  const codeForm = useRef<HTMLFormElement>(null);
  const navigate = useNavigate();
  const [googlePending, setGooglePending] = useState(false);
  const codeStep = [
    "code",
    "verifying",
    "verify-failure",
    "expired",
    "cooldown",
    "storage-failure",
  ].includes(authState);

  useEffect(() => {
    if (authState !== "cooldown" || fixturePreview) return;
    const timer = window.setTimeout(() => setAuthState("code"), 1200);
    return () => window.clearTimeout(timer);
  }, [authState, fixturePreview]);

  useEffect(() => {
    if (authState !== "sending" || fixturePreview) return;
    const timer = window.setTimeout(() => setAuthState("code"), 450);
    return () => window.clearTimeout(timer);
  }, [authState, fixturePreview]);

  function finishSignIn() {
    if (signInFixture()) navigate(appPath("/add"));
    else { setError("The preview session could not be saved. Enable site storage and try again."); setAuthState(googlePending ? "google-failure" : "storage-failure"); setGooglePending(false); }
  }

  useEffect(() => {
    if ((authState !== "verifying" && !googlePending) || fixturePreview) return;
    const timer = window.setTimeout(finishSignIn, 400);
    return () => window.clearTimeout(timer);
  }, [authState, googlePending, fixturePreview]);

  function changeChannel(next: string) {
    setFixturePreview(false);
    setGooglePending(false);
    setChannel(next as Channel);
    setIdentity("");
    setError("");
    setAuthState("idle");
  }
  function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFixturePreview(false);
    const trimmed = identity.trim();
    const valid =
      channel === "email"
        ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
        : /^\+?[\d\s().-]{7,20}$/.test(trimmed) &&
          trimmed.replace(/\D/g, "").length >= 7;
    if (!valid) {
      setError(
        channel === "email"
          ? "Enter a valid email address."
          : "Enter a valid phone number.",
      );
      identityInput.current?.focus();
      return;
    }
    setIdentity(trimmed);
    setCode("");
    setError("");
    setAuthState("sending");
  }
  function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFixturePreview(false);
    if (authState === "expired") {
      setError("This code has expired. Request a new one.");
      codeForm.current?.querySelector("input")?.focus();
      return;
    }
    if (code.length < 6) {
      setError("Enter all six digits.");
      codeForm.current?.querySelector("input")?.focus();
      return;
    }
    if (code !== DEMO_CODE) {
      setError("That code does not match the preview code.");
      setAuthState("verify-failure");
      codeForm.current?.querySelector("input")?.focus();
      return;
    }
    setError("");
    setAuthState("verifying");
  }
  function resend() {
    setFixturePreview(false);
    setCode("");
    setError("");
    setAuthState("cooldown");
  }

  return (
    <div className="login-layout">
      <main className="login-main">
        <div className="login-panel">
          <Link to="/" className="login-brand" aria-label="Butterfly home">
            <ButterflyMark className="login-brand-mark" />
            <span className="login-brand-wordmark">butterfly</span>
          </Link>
          {!codeStep ? (
            <>
              <div className="login-heading">
                <h1>Sign In to Butterfly</h1>
                <p>
                  Review your own Meta creative and turn the findings into the
                  next test.
                </p>
              </div>
              <Button
                variant="secondary"
                className="login-google"
                onClick={() => { setFixturePreview(false); setGooglePending(true) }}
                loading={googlePending}
                icon={<GoogleMark />}
              >
                {authState === "google-failure" ? "Try Google Again" : "Continue With Google"}
              </Button>
              {authState === "google-failure" ? <InlineAlert tone="error" title="Google Sign-In Failed">{error || "Google sign-in wasn’t completed. Try again or continue with a code."}</InlineAlert> : null}
              <div className="login-divider">
                <span>Or Use a Code</span>
              </div>
              <SegmentedControl
                label="Code delivery method"
                value={channel}
                onValueChange={changeChannel}
                options={[
                  { value: "email", label: "Email" },
                  { value: "phone", label: "Phone" },
                ]}
              />
              {authState === "send-failure" ? (
                <InlineAlert tone="error" title="Code Was Not Sent">
                  We couldn’t prepare a code. Check the address and try again.
                </InlineAlert>
              ) : null}
              <form className="login-form" onSubmit={requestCode} noValidate>
                <Field
                  ref={identityInput}
                  id="login-identity"
                  name={channel}
                  label={channel === "email" ? "Email Address" : "Phone Number"}
                  type={channel === "email" ? "email" : "tel"}
                  autoComplete={channel === "email" ? "email" : "tel"}
                  inputMode={channel === "email" ? "email" : "tel"}
                  spellCheck={false}
                  placeholder={
                    channel === "email" ? "you@company.com" : "+44 7700 900000"
                  }
                  value={identity}
                  error={error || undefined}
                  disabled={authState === "sending"}
                  onChange={(event) => {
                    setIdentity(event.target.value);
                    setError("");
                  }}
                />
                <Button
                  type="submit"
                  variant="primary"
                  loading={authState === "sending"}
                  className="login-submit"
                >
                  {authState === "sending"
                    ? "Sending Code"
                    : `Continue With ${channel === "email" ? "Email" : "Phone"}`}
                </Button>
              </form>
              <p className="login-fixture-note">
                <span>Sample Access</span>
                Saved on this device. No Meta connection required.
              </p>
            </>
          ) : (
            <>
              <Button
                variant="quiet"
                size="sm"
                className="login-back"
                icon={<ArrowLeft />}
                onClick={() => {
                  setFixturePreview(false);
                  setAuthState("idle");
                  setError("");
                }}
              >
                Back
              </Button>
              <div className="login-heading">
                <h1>Enter Your Code</h1>
                <p>
                  {channel === "email" ? "Email" : "Text message"} code for{" "}
                  <strong>{identity}</strong>
                </p>
              </div>
              <InlineAlert tone="neutral" title="Preview Code">
                Use <span className="login-code">{DEMO_CODE}</span>. No message
                was sent.
              </InlineAlert>
              {authState === "expired" ? (
                <InlineAlert tone="warning" title="Code Expired">
                  Request another code to continue.
                </InlineAlert>
              ) : null}
              {authState === "verify-failure" && !error ? (
                <InlineAlert tone="error" title="Verification Failed">
                  The fixture could not verify this code. Try again.
                </InlineAlert>
              ) : null}
              {authState === "storage-failure" ? (
                <InlineAlert tone="error" title="Session Could Not Be Saved">
                  {error || "Enable site storage, then try the preview code again."}
                </InlineAlert>
              ) : null}
              <form ref={codeForm} className="login-form" onSubmit={verifyCode}>
                <OtpField
                  value={code}
                  onChange={(next) => {
                    setCode(next);
                    setError("");
                    if (authState === "verify-failure") setAuthState("code");
                  }}
                  error={error || undefined}
                  disabled={
                    authState === "verifying" || authState === "cooldown"
                  }
                  autoFocus
                />
                <Button
                  type="submit"
                  variant="primary"
                  loading={authState === "verifying"}
                  disabled={authState === "cooldown"}
                  trailingIcon={<ArrowRight />}
                  className="login-submit"
                >
                  {authState === "verifying" ? "Verifying" : "Continue"}
                </Button>
              </form>
              <Button
                variant="quiet"
                size="sm"
                disabled={authState === "cooldown" || authState === "verifying"}
                onClick={resend}
              >
                {authState === "cooldown"
                  ? "Send Again in a Moment"
                  : "Send Another Code"}
              </Button>
              <p className="login-status" role="status" aria-live="polite">
                {authState === "cooldown"
                  ? "Preview code reset. Resend is briefly unavailable."
                  : ""}
              </p>
            </>
          )}
        </div>
      </main>
      <aside className="login-visual" aria-label="Kindred sample workspace">
        <div className="login-visual-geometry" aria-hidden="true"><i /><i /><i /></div>
        <div className="login-visual-brand"><ButterflyMark /> Butterfly</div>
        <div className="login-visual-frame" aria-hidden="true"><span>Kindred / First Drop</span></div>
        <div className="login-visual-proof" aria-hidden="true"><span>Opening</span><strong>Product Visible From the First Frame</strong><small><span>0:00</span><span>97% Confidence</span></small></div>
        <div className="login-visual-copy">
          <span>Sample Workspace</span>
          <strong>
            See the Creative. Inspect the Read. Make the Next Test.
          </strong>
          <p>One workspace for the source, the evidence and the next move.</p>
        </div>
      </aside>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.9Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.4 14.4a7.2 7.2 0 0 1 0-4.6V6.7H1.4a12 12 0 0 0 0 10.8l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.7l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z"
      />
    </svg>
  );
}
