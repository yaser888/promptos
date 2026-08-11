import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center pt-20 pb-16">
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/3 via-transparent to-transparent pointer-events-none" />
      <div className="relative">
        <SignIn
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'bg-zinc-900 border border-zinc-800 shadow-2xl rounded-2xl',
              headerTitle: 'text-white text-2xl font-bold',
              headerSubtitle: 'text-zinc-400',
              formFieldLabel: 'text-zinc-300',
              formFieldInput: 'bg-zinc-800/50 border-zinc-700 text-white rounded-xl focus:ring-emerald-500 focus:border-emerald-500',
              formButtonPrimary: 'bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl',
              footerActionLink: 'text-emerald-400 hover:text-emerald-300',
              dividerLine: 'bg-zinc-800',
              dividerText: 'text-zinc-500',
              socialButtonsBlockButton: 'bg-zinc-800/50 border-zinc-700 text-white hover:bg-zinc-700 rounded-xl',
              socialButtonsBlockButtonText: 'text-white',
              formFieldAction: 'text-emerald-400 hover:text-emerald-300',
              identityPreviewEditButton: 'text-emerald-400',
              otpCodeFieldInput: 'bg-zinc-800 border-zinc-700 text-white',
            },
          }}
        />
      </div>
    </div>
  )
}
