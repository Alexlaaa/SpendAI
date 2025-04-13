"use client";

import { Button2 } from "@/components/ui/button2";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useState, useRef, useEffect } from "react";
import { useApiTokens } from "@/hooks/useApiTokens";
import { exportReceiptsData } from "@/app/actions/settings";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2Icon,
  AlertTriangle,
  Key,
  Shield,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label2 } from "@/components/ui/label2";
import { useAuth } from "@/hooks/AuthProvider";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const SettingsPage = () => {
  const { user } = useAuth();
  const { loading, error, tokenStatus, updateTokens, fetchTokenStatus } =
    useApiTokens();

  const [formData, setFormData] = useState({
    geminiAPIKey: "",
    openaiAPIKey: "",
    primaryAIProvider: "Google Gemini",
  });

  const buttonRef = useRef<HTMLButtonElement>(null);
  const [dropdownWidth, setDropdownWidth] = useState<number | undefined>(
    undefined
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (buttonRef.current) {
      setDropdownWidth(buttonRef.current.offsetWidth);
    }

    if (tokenStatus) {
      setFormData((prevData) => ({
        ...prevData,
        primaryAIProvider: tokenStatus.defaultModel,
      }));
    }
  }, [tokenStatus]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleExport = async () => {
    // Keep the tier check here to prevent accidental clicks if UI state is slow
    if (!user || (user.tier !== "tier2" && user.tier !== "tier3")) {
      alert("Export feature requires Tier 2 or higher.");
      return;
    }
    setIsExporting(true);
    try {
      // Call the server action
      const result = await exportReceiptsData();

      if (!result.success || !result.data || !result.filename) {
        throw new Error(
          result.error || "Failed to export data. Unknown error."
        );
      }

      // Handle the file download using the data from the server action
      const blob = new Blob([result.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename; // Use filename from server action
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Error exporting data:", err);
      // Display error to user (e.g., using toast)
      alert(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload: {
      defaultModel: string;
      geminiKey?: string;
      openaiKey?: string;
    } = {
      defaultModel: formData.primaryAIProvider,
    };

    if (formData.geminiAPIKey) payload.geminiKey = formData.geminiAPIKey;
    if (formData.openaiAPIKey) payload.openaiKey = formData.openaiAPIKey;

    try {
      await updateTokens(payload);
      setSuccessMessage("Settings updated successfully!");
      await fetchTokenStatus();
    } catch {
      setSuccessMessage(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleProviderChange = (provider: string) => {
    setFormData((prevData) => ({
      ...prevData,
      primaryAIProvider: provider,
    }));
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
      {/*
      <Card className="w-full">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center">
              <Shield className="mr-2 h-6 w-6 text-blue-600" />
              Secure API Settings
            </h2>
            <p className="text-sm text-gray-600">
              Manage your AI provider preferences and API keys
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label2 htmlFor="dropdownDefaultButton">
                Select your default Provider
              </Label2>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button2
                    ref={buttonRef}
                    id="dropdownDefaultButton"
                    variant="outline"
                    className="w-full justify-between"
                    type="button"
                  >
                    Primary Provider: {formData.primaryAIProvider}
                    <svg
                      className="w-2.5 h-2.5 ms-3"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 10 6"
                    >
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="m1 1 4 4 4-4"
                      />
                    </svg>
                  </Button2>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  style={{
                    width: dropdownWidth ? `${dropdownWidth}px` : "auto",
                  }}
                >
                  <DropdownMenuItem
                    onSelect={() => handleProviderChange("OPENAI")}
                  >
                    OpenAI
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => handleProviderChange("GEMINI")}
                  >
                    Google Gemini
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="space-y-2">
              <Label2 htmlFor="geminiAPIKey">Gemini API Key</Label2>
              <div className="relative">
                <Input
                  type={showGeminiKey ? "text" : "password"}
                  name="geminiAPIKey"
                  id="geminiAPIKey"
                  value={formData.geminiAPIKey}
                  onChange={handleChange}
                  className="pl-10 pr-10"
                  placeholder="Enter your new Gemini API Key"
                />
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Button2
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2"
                  onClick={() => setShowGeminiKey(!showGeminiKey)}
                >
                  {showGeminiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button2>
              </div>
              <p className="text-sm text-gray-500">
                Status:{" "}
                {tokenStatus?.geminiKey === "SET" ? (
                  <span className="text-green-600 font-semibold">SET</span>
                ) : (
                  <span className="text-yellow-600 font-semibold">UNSET</span>
                )}
              </p>
            </div>

            <div className="space-y-2">
              <Label2 htmlFor="openaiAPIKey">OpenAI API Key</Label2>
              <div className="relative">
                <Input
                  type={showOpenAIKey ? "text" : "password"}
                  name="openaiAPIKey"
                  id="openaiAPIKey"
                  value={formData.openaiAPIKey}
                  onChange={handleChange}
                  className="pl-10 pr-10"
                  placeholder="Enter your new OpenAI API Key"
                />
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Button2
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2"
                  onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                >
                  {showOpenAIKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button2>
              </div>
              <p className="text-sm text-gray-500">
                Status:{" "}
                {tokenStatus?.openaiKey === "SET" ? (
                  <span className="text-green-600 font-semibold">SET</span>
                ) : (
                  <span className="text-yellow-600 font-semibold">UNSET</span>
                )}
              </p>
            </div>

            {successMessage && (
              <Alert variant="default" className="bg-green-50 border-green-200">
                <CheckCircle2Icon className="h-5 w-5 text-green-600" />
                <AlertDescription className="text-green-700">
                  {successMessage}
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter>
            <Button2
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save Changes Securely"}
              <Lock className="ml-2 h-4 w-4" />
            </Button2>
          </CardFooter>
        </form>
      </Card>
      */}

      {/* Data Export Section - Always Rendered */}
      <Card className="w-full mt-6">
          <CardHeader>
             <div className="flex justify-between items-center"> {/* Flex container for title and badge */}
                <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                    <Download className="mr-2 h-6 w-6 text-blue-600" />
                    Data Export
                </h2>
                {user?.tier === 'tier1' && (
                    <span className="text-xs font-semibold px-2 py-1 bg-gray-200 text-gray-600 rounded-full">Tier 2+ Feature</span>
                )}
             </div>
            <p className="text-sm text-gray-600 pt-1"> {/* Added padding top */}
              Download your spending data.
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 mb-4">
              Export all your receipt data as a CSV file. This includes merchant
              name, date, total cost, category, and itemized details (if
              available).
            </p>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleExport}
              disabled={isExporting || user?.tier === 'tier1'} // Disable if exporting OR tier 1
              className="w-full disabled:grayscale disabled:opacity-60 disabled:pointer-events-none" // Add disabled styles
              title={user?.tier === 'tier1' ? "Requires Tier 2 or higher" : undefined} // Add tooltip for disabled state
            >
              {isExporting ? "Exporting..." : "Export Spending Data (.csv)"}
              {!isExporting && <Download className="ml-2 h-4 w-4" />}
            </Button>
          </CardFooter>
        </Card>
    </div>
  );
};

export default SettingsPage;
