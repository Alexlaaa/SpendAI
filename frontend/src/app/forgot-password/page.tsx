'use client'

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null); 

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setAlert(null);
    try {
      const response = await fetch('http://localhost:8080/api/users/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json(); 

      if (response.ok) {
        setAlert({ type: 'success', message: data.message || "Password reset link sent!" });
      } else {
        setAlert({ type: 'error', message: data.message || "Password reset failed." });
      }
    } catch (error) {
      setAlert({ type: 'error', message: "An unexpected error occurred. Please try again later." });
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-[400px]">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Forgot Password</CardTitle>
        </CardHeader>
        <CardContent>
        {alert && (
            <div
              className={`p-4 mb-4 rounded-lg ${
                alert.type === "error"
                  ? "border border-red-500 bg-red-100 text-red-800"
                  : "border border-green-500 bg-green-100 text-green-800"
              }`}
            >
              <div className="flex items-center space-x-2">
                <AlertDescription>{alert.message}</AlertDescription>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>
            <Button type="submit" className="w-full mt-6" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Remembered your password?{' '}
            <a href="/signin" className="text-primary hover:underline">Sign In</a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
