import { SignIn } from "@clerk/nextjs";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { LocalAuthForm } from "@/components/auth/local-auth-form";

const clerkConfigured = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function SignInPage() {
  return (
    <AuthPageShell>
      {clerkConfigured ? (
        <SignIn
          appearance={{
            elements: {
              rootBox: "w-full max-w-md",
              card: "bg-charcoal-900/50 border border-charcoal-800 shadow-2xl backdrop-blur-xl",
              headerTitle: "text-charcoal-100 text-xl font-semibold",
              headerSubtitle: "text-charcoal-400",
              socialButtonsBlockButton:
                "bg-charcoal-800 border-charcoal-700 text-charcoal-200 hover:bg-charcoal-700 rounded-lg",
              dividerLine: "bg-charcoal-800",
              dividerText: "text-charcoal-600",
              formFieldLabel: "text-charcoal-300",
              formFieldInput:
                "bg-charcoal-900/50 border-charcoal-700 text-charcoal-100 rounded-lg focus:border-emerald-500/50 focus:ring-emerald-500/20",
              formButtonPrimary:
                "bg-emerald-500 hover:bg-emerald-400 text-black rounded-lg",
              footerActionLink: "text-emerald-400 hover:text-emerald-300",
              footerActionText: "text-charcoal-400",
              identityPreviewText: "text-charcoal-300",
              identityPreviewEditButton: "text-emerald-400",
              otpCodeFieldInput:
                "bg-charcoal-900/50 border-charcoal-700 text-charcoal-100",
              otpCodeFieldInputFocused: "border-emerald-500/50",
              formFieldInputGroup: "bg-charcoal-900/50 border-charcoal-700",
              formFieldInputGroupFocused:
                "border-emerald-500/50 ring-emerald-500/20",
              formFieldAction: "text-emerald-400 hover:text-emerald-300",
              alert: "bg-charcoal-800 border-charcoal-700 text-charcoal-200",
              alertText: "text-charcoal-300",
              alertIcon: "text-emerald-400",
            },
          }}
        />
      ) : (
        <LocalAuthForm mode="signin" />
      )}
    </AuthPageShell>
  );
}
