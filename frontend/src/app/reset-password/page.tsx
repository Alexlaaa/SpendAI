"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // To track the step of the reset process
  const [alertMessage, setAlertMessage] = useState(""); // For error/success messages
  const [alertType, setAlertType] = useState<"error" | "success">("success");
  const { passwordValidations, validatePassword } = usePasswordValidation();

  // Step 1: Fetch the security question using the token
  useEffect(() => {
    if (token) {
      const fetchSecurityQuestion = async () => {
        setLoading(true);
        try {
          const response = await fetch(
            `http://localhost:8080/api/users/get-security-question?token=${token}`
          );
          const data = await response.json();
          if (response.ok) {
            setSecurityQuestion(data.question);
            setStep(2);
          } else {
            setAlertMessage(
              data.message || "Failed to load security question."
            );
            setAlertType("error");
          }
        } catch (error) {
          setAlertMessage("An unexpected error occurred.");
          setAlertType("error");
        }
        setLoading(false);
      };

      fetchSecurityQuestion();
    }
  }, [token]);

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
    try {
      const response = await fetch(
        `http://localhost:8080/api/users/verify-security-question`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, answer: securityAnswer }),
        }
      );

      const data = await response.json();
      if (response.ok && data.verified) {
        setAlertMessage("");
        setStep(3); // Move to step 3: reset password
      } else {
        setAlertMessage(
          data.message || "Incorrect answer to the security question."
        );
        setAlertType("error");
      }
    } catch (error) {
      setAlertMessage("An unexpected error occurred.");
      setAlertType("error");
    }
    setLoading(false);
  };

  // Step 3: Handle resetting the password
  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validatePassword(newPassword)) {
      setAlertMessage("Password does not meet complexity requirements.");
      setAlertType("error");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:8080/api/users/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, newPassword }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        setAlertMessage("");
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
      setAlertMessage("An unexpected error occurred.");
      setAlertType("error");
    }
    setLoading(false);
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

          {step === 2 && (
            <form onSubmit={handleVerifyAnswer}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{securityQuestion}</Label>
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
              <Button type="submit" className="w-full mt-6" disabled={loading}>
                {loading ? "Verifying..." : "Submit Answer"}
              </Button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleResetPassword}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
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
              <Button type="submit" className="w-full mt-6" disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          )}

          {step === 4 && (
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
              <Button
                className="w-full mt-6"
                onClick={() => router.push("/signin")}
              >
                Sign In Now
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
