"use client";

import * as React from "react";
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
import { DollarSign } from "lucide-react";

export interface ContributionFormData {
  amount: number;
}

interface ContributionFormProps {
  onSubmit: (data: ContributionFormData) => void;
  onCancel: () => void;
  goalName: string; // To display which goal is being contributed to
  isLoading?: boolean;
}

export function ContributionForm({
  onSubmit,
  onCancel,
  goalName,
  isLoading,
}: ContributionFormProps) {
  const [amount, setAmount] = React.useState<number | undefined>(undefined);
  const [error, setError] = React.useState<string | null>(null);

  const handleChange = (value: string) => {
    setError(null); // Clear error on change
    const numValue = value === "" ? undefined : Number(value);
    if (numValue !== undefined && numValue < 0) {
      setError("Amount cannot be negative.");
      setAmount(0);
    } else if (numValue !== undefined && isNaN(numValue)) {
      setError("Please enter a valid number.");
      setAmount(undefined);
    } else {
      setAmount(numValue);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount === undefined || amount <= 0) {
      setError("Please enter a positive contribution amount.");
      return;
    }
    setError(null);
    onSubmit({ amount });
  };

  return (
    <Card className="w-full border-none shadow-none">
      <form onSubmit={handleSubmit}>
        <CardHeader className="p-0 mb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5 text-primary" />
            Add Contribution to {goalName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-0">
          <div className="space-y-1">
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="e.g., 50.00"
              value={amount ?? ""}
              onChange={(e) => handleChange(e.target.value)}
              required
              min="0.01"
              step="0.01"
              disabled={isLoading}
              className={error ? "border-red-500" : ""}
            />
            {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2 p-0 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isLoading || amount === undefined || amount <= 0}
          >
            {isLoading ? "Adding..." : "Add Contribution"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
