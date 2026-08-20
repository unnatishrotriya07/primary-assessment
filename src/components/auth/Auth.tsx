"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import authService from "@/services/auth.service";
import { STORAGE_KEYS } from "@/utils/constants";
import { extractErrorMessage } from "@/utils/helpers";

// --------------------------------
// Types and Enums
// --------------------------------

export enum AuthView {
  SIGN_IN = "sign-in",
  SIGN_UP = "sign-up",
  FORGOT_PASSWORD = "forgot-password",
  RESET_SUCCESS = "reset-success",
}

export interface AuthState {
  view: AuthView;
}

export interface FormState {
  isLoading: boolean;
  error: string | null;
  showPassword: boolean;
}

export interface AuthProps extends React.ComponentProps<"div"> {
  initialView?: AuthView;
  redirectTo?: string;
  onSuccess?: (user: any) => void;
}

// --------------------------------
// Schemas
// --------------------------------

export const signInSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  terms: z.boolean().refine((val) => val === true, {
    message: "You must agree to the terms and institutional privacy policy",
  }),
});

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
});

export type SignInFormValues = z.infer<typeof signInSchema>;
export type SignUpFormValues = z.infer<typeof signUpSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

// --------------------------------
// Shared Sub-Components
// --------------------------------

export interface AuthFormProps<T> {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  children: React.ReactNode;
  className?: string;
}

export function AuthForm<T>({ onSubmit, children, className }: AuthFormProps<T>) {
  return (
    <form
      onSubmit={onSubmit}
      data-slot="auth-form"
      className={cn("space-y-5", className)}
    >
      {children}
    </form>
  );
}

export interface AuthErrorProps {
  message: string | null;
}

export function AuthError({ message }: AuthErrorProps) {
  if (!message) return null;
  return (
    <div
      data-slot="auth-error"
      className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3.5 text-sm font-medium text-red-700 animate-in fade-in"
    >
      {message}
    </div>
  );
}

export interface AuthSocialButtonsProps {
  isLoading: boolean;
  onSocialAuth?: (provider: "google") => void;
}

export function AuthSocialButtons({
  isLoading,
  onSocialAuth,
}: AuthSocialButtonsProps) {
  return (
    <div data-slot="auth-social-buttons" className="w-full mt-5">
      <Button
        type="button"
        variant="outline"
        className="w-full h-11 bg-white/80 border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm"
        disabled={isLoading}
        onClick={() => onSocialAuth?.("google")}
      >
        <svg className="mr-2.5 h-4 w-4" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
          <path d="M1 1h22v22H1z" fill="none" />
        </svg>
        Continue with Google
      </Button>
    </div>
  );
}

export interface AuthSeparatorProps {
  text?: string;
}

export function AuthSeparator({ text = "Or continue with email" }: AuthSeparatorProps) {
  return (
    <div data-slot="auth-separator" className="relative mt-5">
      <div className="absolute inset-0 flex items-center">
        <Separator className="bg-slate-200" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-white px-2.5 text-slate-500 font-medium">{text}</span>
      </div>
    </div>
  );
}

// --------------------------------
// Sign In View Component
// --------------------------------

export interface AuthSignInProps {
  onForgotPassword: () => void;
  onSignUp: () => void;
  onSuccess?: (user: any) => void;
  redirectTo?: string;
}

export function AuthSignIn({
  onForgotPassword,
  onSignUp,
  onSuccess,
  redirectTo = "/dashboard",
}: AuthSignInProps) {
  const router = useRouter();
  const [formState, setFormState] = React.useState<FormState>({
    isLoading: false,
    error: null,
    showPassword: false,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: SignInFormValues) => {
    setFormState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await authService.login({
        email: data.email,
        password: data.password,
      });

      localStorage.setItem(STORAGE_KEYS.TOKEN, response.token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
      document.cookie = `token=${response.token}; path=/; max-age=86400; SameSite=Lax`;

      if (onSuccess) {
        onSuccess(response.user);
      } else {
        router.push(redirectTo);
      }
    } catch (err: any) {
      setFormState((prev) => ({
        ...prev,
        error: extractErrorMessage(err, "Invalid email or password."),
      }));
    } finally {
      setFormState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <motion.div
      data-slot="auth-sign-in"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="p-8 sm:p-10"
    >
      <div className="mb-7 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Welcome back
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Sign in to your academic console
        </p>
      </div>

      <AuthError message={formState.error} />

      <AuthForm onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-1.5">
          <Label htmlFor="signin-email">Email Address</Label>
          <Input
            id="signin-email"
            type="email"
            placeholder="director@school.edu"
            disabled={formState.isLoading}
            className={cn(errors.email && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-200")}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs font-medium text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="signin-password">Password</Label>
            <Button
              type="button"
              variant="link"
              className="text-xs text-primary font-semibold hover:underline"
              onClick={onForgotPassword}
              disabled={formState.isLoading}
            >
              Forgot password?
            </Button>
          </div>
          <div className="relative">
            <Input
              id="signin-password"
              type={formState.showPassword ? "text" : "password"}
              placeholder="••••••••"
              disabled={formState.isLoading}
              className={cn(
                "pr-10",
                errors.password && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-200"
              )}
              {...register("password")}
            />
            <button
              type="button"
              className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              onClick={() =>
                setFormState((prev) => ({
                  ...prev,
                  showPassword: !prev.showPassword,
                }))
              }
              disabled={formState.isLoading}
              tabIndex={-1}
              aria-label={formState.showPassword ? "Hide password" : "Show password"}
            >
              {formState.showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs font-medium text-red-600">{errors.password.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-11 text-base font-semibold shadow-md transition-all"
          disabled={formState.isLoading}
        >
          {formState.isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </Button>
      </AuthForm>

      <AuthSeparator />
      <AuthSocialButtons isLoading={formState.isLoading} />

      <p className="mt-8 text-center text-sm text-slate-600">
        Need to set up a new school tenant?{" "}
        <Button
          type="button"
          variant="link"
          className="text-sm font-bold text-primary hover:underline ml-1"
          onClick={onSignUp}
          disabled={formState.isLoading}
        >
          Create one
        </Button>
      </p>
    </motion.div>
  );
}

// --------------------------------
// Sign Up View Component
// --------------------------------

export interface AuthSignUpProps {
  onSignIn: () => void;
  onSuccess?: (user: any) => void;
  redirectTo?: string;
}

export function AuthSignUp({
  onSignIn,
  onSuccess,
  redirectTo = "/dashboard",
}: AuthSignUpProps) {
  const router = useRouter();
  const [formState, setFormState] = React.useState<FormState>({
    isLoading: false,
    error: null,
    showPassword: false,
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "", terms: false as any },
  });

  const terms = watch("terms");

  const onSubmit = async (data: SignUpFormValues) => {
    setFormState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      await authService.signup({
        name: data.name,
        email: data.email,
        password: data.password,
        schoolName: data.name,
      });

      const loginResponse = await authService.login({
        email: data.email,
        password: data.password,
      });

      localStorage.setItem(STORAGE_KEYS.TOKEN, loginResponse.token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(loginResponse.user));
      document.cookie = `token=${loginResponse.token}; path=/; max-age=86400; SameSite=Lax`;

      if (onSuccess) {
        onSuccess(loginResponse.user);
      } else {
        router.push(redirectTo);
      }
    } catch (err: any) {
      setFormState((prev) => ({
        ...prev,
        error: extractErrorMessage(
          err,
          "Failed to create account. Email might already be registered."
        ),
      }));
    } finally {
      setFormState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <motion.div
      data-slot="auth-sign-up"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="p-8 sm:p-10"
    >
      <div className="mb-7 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Create account
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Get started with your school workspace
        </p>
      </div>

      <AuthError message={formState.error} />

      <AuthForm onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-1.5">
          <Label htmlFor="signup-name">Full Name / School Name</Label>
          <Input
            id="signup-name"
            type="text"
            placeholder="Principal Jane Doe / Oakridge Academy"
            disabled={formState.isLoading}
            className={cn(errors.name && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-200")}
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs font-medium text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="signup-email">Official Email</Label>
          <Input
            id="signup-email"
            type="email"
            placeholder="director@school.edu"
            disabled={formState.isLoading}
            className={cn(errors.email && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-200")}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs font-medium text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="signup-password">Password</Label>
          <div className="relative">
            <Input
              id="signup-password"
              type={formState.showPassword ? "text" : "password"}
              placeholder="••••••••"
              disabled={formState.isLoading}
              className={cn(
                "pr-10",
                errors.password && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-200"
              )}
              {...register("password")}
            />
            <button
              type="button"
              className="absolute right-0 top-0 h-full px-3 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
              onClick={() =>
                setFormState((prev) => ({
                  ...prev,
                  showPassword: !prev.showPassword,
                }))
              }
              disabled={formState.isLoading}
              tabIndex={-1}
              aria-label={formState.showPassword ? "Hide password" : "Show password"}
            >
              {formState.showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs font-medium text-red-600">{errors.password.message}</p>
          )}
        </div>

        <div className="flex items-start space-x-2.5 pt-1">
          <Checkbox
            id="terms"
            checked={terms === true}
            onCheckedChange={(checked) => setValue("terms", checked, { shouldValidate: true })}
            disabled={formState.isLoading}
          />
          <div className="space-y-0.5 leading-none">
            <Label htmlFor="terms" className="text-xs text-slate-700 cursor-pointer">
              I agree to the academic terms and institutional privacy policy
            </Label>
            {errors.terms && (
              <p className="text-xs font-medium text-red-600">{errors.terms.message}</p>
            )}
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-11 text-base font-semibold shadow-md transition-all mt-2"
          disabled={formState.isLoading}
        >
          {formState.isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Workspace...
            </>
          ) : (
            "Create Account"
          )}
        </Button>
      </AuthForm>

      <AuthSeparator />
      <AuthSocialButtons isLoading={formState.isLoading} />

      <p className="mt-8 text-center text-sm text-slate-600">
        Already have a school tenant?{" "}
        <Button
          type="button"
          variant="link"
          className="text-sm font-bold text-primary hover:underline ml-1"
          onClick={onSignIn}
          disabled={formState.isLoading}
        >
          Sign in
        </Button>
      </p>
    </motion.div>
  );
}

// --------------------------------
// Forgot Password View Component
// --------------------------------

export interface AuthForgotPasswordProps {
  onSignIn: () => void;
  onSuccess: () => void;
}

export function AuthForgotPassword({
  onSignIn,
  onSuccess,
}: AuthForgotPasswordProps) {
  const [formState, setFormState] = React.useState<FormState>({
    isLoading: false,
    error: null,
    showPassword: false,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setFormState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      // Simulate/trigger password reset request
      await new Promise((resolve) => setTimeout(resolve, 800));
      onSuccess();
    } catch {
      setFormState((prev) => ({
        ...prev,
        error: "Unable to process password reset. Please try again.",
      }));
    } finally {
      setFormState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <motion.div
      data-slot="auth-forgot-password"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="p-8 sm:p-10 relative"
    >
      <button
        type="button"
        className="absolute left-6 top-6 p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
        onClick={onSignIn}
        disabled={formState.isLoading}
        aria-label="Back to sign in"
      >
        <ArrowLeft className="h-4 w-4" />
      </button>

      <div className="mb-7 text-center pt-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Reset password
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Enter your registered school email to receive a recovery link
        </p>
      </div>

      <AuthError message={formState.error} />

      <AuthForm onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-1.5">
          <Label htmlFor="forgot-email">Email Address</Label>
          <Input
            id="forgot-email"
            type="email"
            placeholder="director@school.edu"
            disabled={formState.isLoading}
            className={cn(errors.email && "border-red-400 focus-visible:border-red-500 focus-visible:ring-red-200")}
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs font-medium text-red-600">{errors.email.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full h-11 text-base font-semibold shadow-md transition-all mt-2"
          disabled={formState.isLoading}
        >
          {formState.isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending instructions...
            </>
          ) : (
            "Send Reset Link"
          )}
        </Button>
      </AuthForm>

      <p className="mt-8 text-center text-sm text-slate-600">
        Remember your password?{" "}
        <Button
          type="button"
          variant="link"
          className="text-sm font-bold text-primary hover:underline ml-1"
          onClick={onSignIn}
          disabled={formState.isLoading}
        >
          Sign in
        </Button>
      </p>
    </motion.div>
  );
}

// --------------------------------
// Reset Success View Component
// --------------------------------

export interface AuthResetSuccessProps {
  onSignIn: () => void;
}

export function AuthResetSuccess({ onSignIn }: AuthResetSuccessProps) {
  return (
    <motion.div
      data-slot="auth-reset-success"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.25, ease: "easeInOut" }}
      className="flex flex-col items-center p-8 sm:p-10 text-center"
    >
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 border border-blue-100 shadow-sm text-primary">
        <MailCheck className="h-8 w-8 text-primary" />
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
        Check your email
      </h1>
      <p className="mt-2 text-sm text-slate-600 max-w-xs">
        We have dispatched instructions to reset your password if an account is associated with that email.
      </p>

      <Button
        type="button"
        variant="outline"
        className="mt-6 w-full max-w-xs h-11"
        onClick={onSignIn}
      >
        Back to sign in
      </Button>
    </motion.div>
  );
}

// --------------------------------
// Main Auth Orchestrator Component
// --------------------------------

export function Auth({
  initialView = AuthView.SIGN_IN,
  redirectTo,
  onSuccess,
  className,
  ...props
}: AuthProps) {
  const [state, setState] = React.useState<AuthState>({ view: initialView });

  const setView = React.useCallback((view: AuthView) => {
    setState((prev) => ({ ...prev, view }));
  }, []);

  return (
    <div
      data-slot="auth"
      className={cn("mx-auto w-full max-w-md", className)}
      style={{ width: "100%", maxWidth: "440px", margin: "0 auto", ...(props.style || {}) }}
      {...props}
    >
      <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/95 shadow-2xl backdrop-blur-xl transition-all">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-sky-500/5 pointer-events-none" />
        <div className="relative z-10">
          <AnimatePresence mode="wait">
            {state.view === AuthView.SIGN_IN && (
              <AuthSignIn
                key="sign-in"
                onForgotPassword={() => setView(AuthView.FORGOT_PASSWORD)}
                onSignUp={() => setView(AuthView.SIGN_UP)}
                onSuccess={onSuccess}
                redirectTo={redirectTo}
              />
            )}
            {state.view === AuthView.SIGN_UP && (
              <AuthSignUp
                key="sign-up"
                onSignIn={() => setView(AuthView.SIGN_IN)}
                onSuccess={onSuccess}
                redirectTo={redirectTo}
              />
            )}
            {state.view === AuthView.FORGOT_PASSWORD && (
              <AuthForgotPassword
                key="forgot-password"
                onSignIn={() => setView(AuthView.SIGN_IN)}
                onSuccess={() => setView(AuthView.RESET_SUCCESS)}
              />
            )}
            {state.view === AuthView.RESET_SUCCESS && (
              <AuthResetSuccess
                key="reset-success"
                onSignIn={() => setView(AuthView.SIGN_IN)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default Auth;
