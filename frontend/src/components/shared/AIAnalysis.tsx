'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useAIPrompt } from '@/hooks/useAIPrompt';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import useTypewriter from '@/hooks/useTypewriter';

const AIAnalysis: React.FC = () => {
    const [userPrompt, setUserPrompt] = useState<string>('');
    const { loading, prompt, error, fetchAIPrompt } = useAIPrompt();
    const { displayedText, isTyping } = useTypewriter(prompt);

    const handleUserPromptSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        console.log("User prompt submitted:", userPrompt);
        await fetchAIPrompt(userPrompt);

        if (!error) {
            setUserPrompt("");
        }
    };

    useEffect(() => {
        console.log('Displayed Text:', displayedText);
    }, [displayedText]);

    return (
        <Card className="w-full bg-transparent border-slate-200 border-2">
            <CardHeader>
                <CardTitle>
                    AI Insights
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>{error.message}</AlertDescription>
                    </Alert>
                )}

                {(displayedText || isTyping) && (
                    <div className="mt-4 p-4 bg-muted rounded-md">
                        <div className="pb-2">
                            <Avatar>
                                <AvatarImage src="/images/ai_dp.jpg" alt="AI Avatar" />
                                <AvatarFallback>AI</AvatarFallback>
                            </Avatar>
                        </div>
                        <p className="whitespace-pre-line">
                            {displayedText}
                            {isTyping && (
                                <span className="text-primary blinking-cursor">▊</span>
                            )}
                        </p>
                    </div>
                )}

                <form onSubmit={handleUserPromptSubmit} className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Can you provide some insights into my spending habits..."
                            value={userPrompt}
                            onChange={(e) => setUserPrompt(e.target.value)}
                            className="flex-grow"
                            required
                        />
                        <Button type="submit" disabled={loading || !userPrompt || isTyping}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    AI is thinking...
                                </>
                            ) : (
                                'Ask AI ✨'
                            )}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};

export default AIAnalysis;
