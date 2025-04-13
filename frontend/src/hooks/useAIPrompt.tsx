"use client"

import { useState } from 'react';
import { fetchAIPromptServerAction } from '@/app/actions/aiprompt';

export function useAIPrompt() {
    const [loading, setLoading] = useState<boolean>(false);
    const [prompt, setPrompt] = useState<string>("");
    const [error, setError] = useState<Error | null>(null);

    const fetchAIPrompt = async (userPrompt : string): Promise<void> => {
        setLoading(true);
        setError(null);
        setPrompt("");
        try {
            const aIPrompt = await fetchAIPromptServerAction(userPrompt);
            if (typeof aIPrompt === 'string') {
                setPrompt(aIPrompt);
                console.log('Fetched Prompt:', aIPrompt);
            } else {
                throw new Error('Invalid prompt format received from server.');
            }
        } catch (err) {
            console.error('Error fetching AI prompt:', err);
            setError(err as Error);
        } finally {
            setLoading(false);
            
        }
    };

    return { loading, prompt, error, fetchAIPrompt };
}
