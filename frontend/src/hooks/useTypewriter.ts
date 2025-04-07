"use client"

import { useState, useEffect, useRef } from 'react';

interface TypewriterReturn {
    displayedText: string;
    isTyping: boolean;
}

const useTypewriter = (text: string, speed: number = 30): TypewriterReturn => {
    const [displayedText, setDisplayedText] = useState<string>('');
    const [isTyping, setIsTyping] = useState<boolean>(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!text) {
            setDisplayedText('');
            setIsTyping(false);
            return;
        }

        setDisplayedText('');
        setIsTyping(true);

        let index = 0;
        const characters = Array.from(text);

        const typeNextCharacter = () => {
            if (index < characters.length) {
                const nextChar = characters[index];
                if (nextChar !== undefined) {
                    setDisplayedText((current) => current + nextChar);
                }
                index++;
                timeoutRef.current = setTimeout(typeNextCharacter, speed);
            } else {
                setIsTyping(false);
            }
        };

        typeNextCharacter();

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            setIsTyping(false);
        };
    }, [text, speed]);

    return { displayedText, isTyping };
};

export default useTypewriter;
