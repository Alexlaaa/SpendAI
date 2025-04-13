"use client";

import React, { useState, useEffect, Suspense } from "react"; // Import Suspense
import { useSearchParams, useRouter } from "next/navigation";
import { Button2 } from "@/components/ui/button2";
import { Input } from "@/components/ui/input";
import { Label2 } from "@/components/ui/label2";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Check } from "lucide-react";
import { AlertDescription, AlertTitle } from "@/components/ui/alert";
import { usePasswordValidation } from "@/hooks/usePasswordValidation";
import PasswordRequirements from "@/components/shared/PasswordRequirements";

// Component containing the client-side logic using useSearchParams
function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // Start at step 1 (fetching question)
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState<"error" | "success">("success");
  const { passwordValidations, validatePassword } = usePasswordValidation();

  // Step 1: Fetch the security question using the token
  useEffect(() => {
    if (token) {
      const fetchSecurityQuestion = async () => {
        setLoading(true);
        setAlertMessage(""); // Clear previous messages
        try {
          const response = await fetch(
            // Ensure BACKEND_URL is available or use relative path if applicable
            `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'}/api/users/get-security-question?token=${token}`
          );
          const data = await response.json();
          if (response.ok) {
            setSecurityQuestion(data.question);
            setStep(2); // Move to answer step
          } else {
            setAlertMessage(
              data.message || "Failed to load security question. Invalid or expired token."
            );
            setAlertType("error");
            setStep(99); // Error step
          }
        } catch (error) {
          console.error("Fetch security question error:", error);
          setAlertMessage("An unexpected error occurred while fetching security question.");
          setAlertType("error");
          setStep(99); // Error step
        }
        setLoading(false);
      };

      fetchSecurityQuestion();
    } else {
        setAlertMessage("Reset token is missing from the URL.");
        setAlertType("error");
        setStep(99); // Error step if no token
    }
  }, [token]); // Depend only on token

  // Handle password input change
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPasswordValue = e.target.value;
    setNewPassword(newPasswordValue);
    validatePassword(newPasswordValue);
  };

  // Step 2: Verify security question answer
  const handleVerifyAnswer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setAlertMessage("");
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'}/api/users/verify-security-question`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, answer: securityAnswer }),
        }
      );

      const data = await response.json();
      if (response.ok && data.verified) {
        setStep(3); // Move to step 3: reset password
      } else {
        setAlertMessage(
          data.message || "Incorrect answer to the security question."
        );
        setAlertType("error");
      }
    } catch (error) {
      console.error("Verify answer error:", error);
      setAlertMessage("An unexpected error occurred while verifying the answer.");
      setAlertType("error");
    }
    setLoading(false);
  };

  // Step 3: Handle resetting the password
  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Re-validate before submitting
    const isValidPassword = Object.values(passwordValidations).every(v => v);
    if (!isValidPassword) {
      setAlertMessage("Password does not meet complexity requirements.");
      setAlertType("error");
      return;
    }

    setLoading(true);
    setAlertMessage("");
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080'}/api/users/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, newPassword }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        setStep(4); // Password reset is complete

        // Redirect to sign-in page after 3 seconds
        setTimeout(() => {
          router.push("/signin");
        }, 3000);
      } else {
        setAlertMessage(data.message || "Password reset failed.");
        setAlertType("error");
      }
    } catch (error) {
      console.error("Reset password error:", error);
      setAlertMessage("An unexpected error occurred during password reset.");
      setAlertType("error");
    }
    setLoading(false);
  };

  // Render different steps based on state
  const renderStep = () => {
    switch (step) {
      case 1: // Initial loading/fetching question
        return <p className="text-center text-muted-foreground">Loading security question...</p>;
      case 2: // Show question, ask for answer
        return (
          <form onSubmit={handleVerifyAnswer}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label2>{securityQuestion}</Label2>
                <Input
                  id="answer"
                  name="answer"
                  type="text"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>
            <Button2 type="submit" className="w-full mt-6" disabled={loading}>
              {loading ? "Verifying..." : "Submit Answer"}
            </Button2>
          </form>
        );
      case 3: // Show password reset form
        return (
          <form onSubmit={handleResetPassword}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label2 htmlFor="newPassword">New Password</Label2>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={handlePasswordChange}
                  required
                  disabled={loading}
                />
                <PasswordRequirements validations={passwordValidations} />
              </div>
            </div>
            <Button2 type="submit" className="w-full mt-6" disabled={loading || !Object.values(passwordValidations).every(v => v)}>
              {loading ? "Resetting..." : "Reset Password"}
            </Button2>
          </form>
        );
      case 4: // Success message and redirect
        return (
          <div className="space-y-4 text-center">
            <div className="flex justify-center items-center space-x-2">
              <Check className="text-green-600" size={24} />
              <p className="text-sm text-muted-foreground">
                Password successfully reset.
              </p>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Redirecting to sign-in page in 3 seconds...
            </p>
            <Button2
              className="w-full mt-6"
              onClick={() => router.push("/signin")}
            >
              Sign In Now
            </Button2>
          </div>
        );
       case 99: // Error state (e.g., invalid token)
        // Alert message is already shown above
        return (
             <Button2
              variant="outline"
              className="w-full mt-6"
              onClick={() => router.push("/forgot-password")}
            >
              Request New Reset Link
            </Button2>
        );
      default:
        return <p className="text-center text-muted-foreground">Loading...</p>;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-[400px]">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Reset Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alertMessage && (
            <div
              className={`p-4 mb-4 rounded-lg ${
                alertType === "error"
                  ? "border border-red-500 bg-red-100 text-red-800"
                  : "border border-green-500 bg-green-100 text-green-800"
              }`}
            >
              <div className="flex items-center space-x-2">
                <AlertDescription>{alertMessage}</AlertDescription>
              </div>
            </div>
          )}
          {renderStep()}
        </CardContent>
      </Card>
    </div>
  );
}

// The main page component that wraps the form in Suspense
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
