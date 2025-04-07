"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from '@/hooks/AuthProvider'
import { useFetchSecurityQuestions } from '@/hooks/useFetchSecurityQuestions';
import Link from 'next/link'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePasswordValidation } from "@/hooks/usePasswordValidation";
import PasswordRequirements from "@/components/shared/PasswordRequirements";

export default function SignUpPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        password: '',
        securityQuestion: '',
        securityAnswer: '',
    })
    const { toast } = useToast()
    const { signUp, loading } = useAuth();
    const { isLoading, error, securityQuestions } = useFetchSecurityQuestions();

    const { passwordValidations, validatePassword } = usePasswordValidation();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === 'password') {
            validatePassword(value);
        }
    }

    const handleSelectChange = (value: string) => {
        setFormData(prev => ({ ...prev, securityQuestion: value }));
    }

    const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        try {
            await signUp(formData)
            toast({ title: "Sign up success!" })
            router.push('/home')
        } catch (error: unknown) {
            if (error instanceof Error) {
                toast({
                    title: "Sign up failed!",
                    description: error.message,
                })
            } else {
                toast({
                    title: "Sign up failed!",
                    description: "An unexpected error occurred",
                })
            }
        }
    }

    const formatLabel = (field: string) => {
        if (field === 'firstName') return 'First Name';
        if (field === 'lastName') return 'Last Name';
        return field.charAt(0).toUpperCase() + field.slice(1);
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-[400px]">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">Create an Account</CardTitle>
                    <CardDescription className="text-center">Sign up to get started</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSignUp}>
                        <div className="space-y-4">
                            {['username', 'email', 'firstName', 'lastName', 'password'].map((field) => (
                                <div key={field} className="space-y-2">
                                    <Label htmlFor={field}>{formatLabel(field)}</Label>
                                    <Input
                                        id={field}
                                        name={field}
                                        type={field === 'password' ? 'password' : 'text'}
                                        value={formData[field as keyof typeof formData]}
                                        onChange={handleInputChange}
                                        required
                                    />
                                    {field === 'password' && formData['password'].length > 0 && (
                                        <PasswordRequirements validations={passwordValidations} />
                                    )}
                                </div>
                            ))}
                            <div className="space-y-2">
                                <Label htmlFor="securityQuestion">Security Question</Label>
                                <Select onValueChange={handleSelectChange} required>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a security question" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {securityQuestions.map((question, index) => (
                                            <SelectItem key={index} value={question}>
                                                {question}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="securityAnswer">Security Answer</Label>
                                <Input
                                    id="securityAnswer"
                                    name="securityAnswer"
                                    type="text"
                                    value={formData.securityAnswer}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>
                        <Button type="submit" className="w-full mt-6" disabled={loading}>
                            {loading ? "Signing Up..." : "Sign Up"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col items-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                        Already have an account?{' '}
                        <Link href="/signin" className="text-primary hover:underline">Sign In</Link>
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Forgot your password?{' '}
                        <Link href="/forgot-password" className="text-primary hover:underline">Reset Password</Link>
                    </p>
                    <p className="text-xs text-muted-foreground text-center">
                        By signing up, you agree to our{' '}
                        <a href="#" className="text-primary hover:underline">Terms of Service</a>
                    </p>
                </CardFooter>
            </Card>
        </div>
    )
}