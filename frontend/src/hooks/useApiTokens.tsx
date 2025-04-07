import { useState, useEffect } from 'react';
import { fetchUserApiTokenStatus, updateUserApiTokens } from '@/app/api/settings/route';

export function useApiTokens() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenStatus, setTokenStatus] = useState<{
    defaultModel: string;
    geminiKey: string;
    openaiKey: string;
  } | null>(null);

  const fetchTokenStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserApiTokenStatus();
      // Ensure geminiKey and openaiKey are always strings, use "" as default if undefined
      setTokenStatus({
        defaultModel: data.defaultModel,
        geminiKey: data.geminiKey || "",
        openaiKey: data.openaiKey || "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch token status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokenStatus();
  }, []);

  const updateTokens = async (formData: {
    defaultModel: string;
    geminiKey?: string;
    openaiKey?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      await updateUserApiTokens(formData);
      // Re-fetch token status after updating tokens
      await fetchTokenStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tokens');
    } finally {
      setLoading(false);
    }
  };

  return { loading, error, tokenStatus, updateTokens, fetchTokenStatus };
}
