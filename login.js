import { auth, authReady } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";

const $ = (id) => document.getElementById(id);
const form = $("authForm");
const message = $("formMessage");
let mode = "signin";
$("year").textContent = new Date().getFullYear();

function say(text, isError = false) {
  message.textContent = text;
  message.style.color = isError ? "#a32618" : "#17633b";
}
function setMode(nextMode) {
  mode = nextMode;
  const signingUp = mode === "signup";
  $("nameField").hidden = !signingUp;
  $("confirmField").hidden = !signingUp;
  $("resetPassword").hidden = signingUp;
  $("passwordHint").textContent = signingUp ? "Use at least 6 characters. Choose a password you do not use elsewhere." : "Enter your KaziAccess password.";
  $("password").autocomplete = signingUp ? "new-password" : "current-password";
  $("submitButton").textContent = signingUp ? "Create account" : "Sign in";
  $("showSignIn").classList.toggle("active", !signingUp);
  $("showSignUp").classList.toggle("active", signingUp);
  $("showSignIn").setAttribute("aria-pressed", String(!signingUp));
  $("showSignUp").setAttribute("aria-pressed", String(signingUp));
  say("");
}
$("showSignIn").addEventListener("click", () => setMode("signin"));
$("showSignUp").addEventListener("click", () => setMode("signup"));

const friendlyErrors = {
  "auth/email-already-in-use": "An account with this email already exists. Try signing in.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/invalid-credential": "Email or password is incorrect. Check your details and try again.",
  "auth/user-disabled": "This account has been disabled. Please contact support.",
  "auth/weak-password": "Choose a stronger password with at least 6 characters.",
  "auth/network-request-failed": "Network problem. Check your internet connection and try again.",
  "auth/too-many-requests": "Too many attempts. Wait a little before trying again.",
  "auth/operation-not-allowed": "Email/password sign-in is not enabled in Firebase yet. Check Authentication settings."
};


authReady.then(() => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      window.location.replace("dashboard.html");
    }
  });
}).catch((error) => {
  console.error("Firebase initialization failed:", error);
  say("Could not initialize your account session. Refresh and try again.", true);
});


form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = $("email").value.trim();
  const password = $("password").value;
  const name = $("fullName").value.trim();
  const confirm = $("confirmPassword").value;
  if (!email || !password) return say("Enter your email and password.", true);
  if (mode === "signup" && !name) return say("Please enter your name.", true);
  if (mode === "signup" && password !== confirm) return say("The passwords do not match.", true);
  if (mode === "signup" && password.length < 6) return say("Your password must contain at least 6 characters.", true);

  const submit = $("submitButton");
  submit.disabled = true;
  say(mode === "signup" ? "Creating your account…" : "Signing you in…");
  try {
    await authReady;
    if (mode === "signup") {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: name });
      say("Account created. Opening your dashboard…");
      window.location.replace("dashboard.html");
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      say("Signed in. Opening your dashboard…");
      window.location.replace("dashboard.html");
    }
  } catch (error) {
    say(friendlyErrors[error.code] || "We could not complete that request. Please try again.", true);
    submit.disabled = false;
  }
});

$("resetPassword").addEventListener("click", async () => {
  const email = $("email").value.trim();
  if (!email) return say("Enter your email address first, then select Forgot password.", true);
  try {
    await sendPasswordResetEmail(auth, email);
    say("If an account exists for that email, Firebase has sent a password-reset message.");
  } catch (error) {
    say(friendlyErrors[error.code] || "Could not send the reset email. Please try again.", true);
  }
});
