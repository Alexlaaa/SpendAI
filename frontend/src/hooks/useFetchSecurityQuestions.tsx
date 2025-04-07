"use client"

import { useState, useEffect } from 'react';

export function useFetchSecurityQuestions() {

    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);
    const [securityQuestions, setSecurityQuestions] = useState<string[]>([]);

    useEffect(()=> {

        async function fetchSecurityQuestions() {
            setIsLoading(true);
            setError(null);

            try {

                const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/users/security-questions`)
                const data = await response.json()

                setSecurityQuestions(data.questions);

            } catch(error) {
                setError(error instanceof Error ? error : new Error('An unknown error occurred'));
            }
            finally {
                setIsLoading(false);
            }
        }

        fetchSecurityQuestions()


    }, [])

    return { isLoading, error, securityQuestions }
}
