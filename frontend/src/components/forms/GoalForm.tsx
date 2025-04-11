"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Target } from "lucide-react";

// Interface matching backend DTOs (CreateGoalPayload) + optional ID for editing
export interface GoalFormData {
  id?: string; // Optional: for identifying goal during update
  name: string;
  targetAmount: number;
  currentAmount?: number; // Optional, defaults to 0 on backend if not provided
  deadline?: string; // ISO string format YYYY-MM-DD
  type: "short-term" | "long-term";
  category?: string;
  priority?: number;
}

interface FinancialGoalFormProps {
  onSubmit: (data: GoalFormData) => void;
  onCancel?: () => void;
  initialData?: GoalFormData | null;
  isLoading?: boolean;
}

export function GoalForm({
  onSubmit,
  onCancel,
  initialData,
  isLoading,
}: FinancialGoalFormProps) {
  const [formData, setFormData] = React.useState<GoalFormData>({
    name: initialData?.name || "",
    targetAmount: initialData?.targetAmount || 1000,
    currentAmount: initialData?.currentAmount || 0,
    deadline: initialData?.deadline ? initialData.deadline.split("T")[0] : "", // Format for date input
    type: initialData?.type || "short-term",
    category: initialData?.category || "",
    priority: initialData?.priority || undefined,
  });

  // Update form state if initialData changes (e.g., when opening edit modal)
  React.useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id,
        name: initialData.name,
        targetAmount: initialData.targetAmount,
        currentAmount: initialData.currentAmount || 0,
        deadline: initialData.deadline
          ? initialData.deadline.split("T")[0]
          : "",
        type: initialData.type,
        category: initialData.category || "",
        priority: initialData.priority || undefined,
      });
    } else {
      // Reset form for creation
      setFormData({
        name: "",
        targetAmount: 1000,
        currentAmount: 0,
        deadline: "",
        type: "short-term",
        category: "",
        priority: undefined,
      });
    }
  }, [initialData]);

  const handleChange = (
    field: keyof GoalFormData,
    value: string | number | undefined
  ) => {
    // Handle number conversion carefully
    if (
      field === "targetAmount" ||
      field === "currentAmount" ||
      field === "priority"
    ) {
      const numValue = value === "" ? undefined : Number(value); // Allow clearing number fields
      // Prevent negative numbers for amounts, allow range for priority
      if (
        (field === "targetAmount" || field === "currentAmount") &&
        numValue !== undefined &&
        numValue < 0
      )
        return;
      // Add priority validation if needed (e.g., 1-5) - handled by input type="number" min/max for now
      setFormData((prev) => ({ ...prev, [field]: numValue }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Ensure targetAmount is provided
    if (formData.targetAmount === undefined || formData.targetAmount <= 0) {
      alert("Target Amount must be a positive number."); // Simple validation
      return;
    }
    // Ensure currentAmount is not negative if provided
    if (formData.currentAmount !== undefined && formData.currentAmount < 0) {
      alert("Current Amount cannot be negative.");
      return;
    }

    // Prepare data for submission (handle potential undefined currentAmount)
    const submissionData: GoalFormData = {
      ...formData,
      currentAmount: formData.currentAmount ?? 0, // Default to 0 if undefined
      // Ensure deadline is either a valid date string or undefined
      deadline: formData.deadline || undefined,
      // Include category and priority, ensuring they are undefined if empty/not set
      category: formData.category || undefined,
      priority: formData.priority || undefined,
    };

    onSubmit(submissionData);
  };

  const isEditing = !!initialData;

  return (
    // Using Card structure from generated code, but can be simplified if used in a Dialog
    <Card className="w-full border-none shadow-none">
      <form onSubmit={handleSubmit}>
        <CardHeader className="p-0 mb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-primary" />
            {isEditing ? "Edit Financial Goal" : "Create New Financial Goal"}
          </CardTitle>
          <CardDescription>
            {isEditing
              ? "Update the details of your financial goal."
              : "Set up a new goal to track your progress."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 p-0">
          {/* Name */}
          <div className="space-y-1">
            <Label htmlFor="name">Goal Name</Label>
            <Input
              id="name"
              placeholder="e.g., Save for Down Payment"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          {/* Target Amount */}
          <div className="space-y-1">
            <Label htmlFor="targetAmount">Target Amount ($)</Label>
            <Input
              id="targetAmount"
              type="number"
              placeholder="e.g., 20000"
              value={formData.targetAmount ?? ""} // Handle potential undefined
              onChange={(e) => handleChange("targetAmount", e.target.value)}
              required
              min="0.01" // Minimum target
              step="0.01" // Allow cents
              disabled={isLoading}
            />
          </div>

          {/* Current Amount */}
          <div className="space-y-1">
            <Label htmlFor="currentAmount">Current Amount ($)</Label>
            <Input
              id="currentAmount"
              type="number"
              placeholder="e.g., 5000 (Optional)"
              value={formData.currentAmount ?? ""} // Handle potential undefined
              onChange={(e) => handleChange("currentAmount", e.target.value)}
              min="0"
              step="0.01"
              disabled={isLoading}
            />
          </div>

          {/* Deadline */}
          <div className="space-y-1">
            <Label htmlFor="deadline">Target Date (Optional)</Label>
            <Input
              id="deadline"
              type="date"
              value={formData.deadline || ""} // Handle potential undefined
              onChange={(e) => handleChange("deadline", e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Type */}
          <div className="space-y-1">
            <Label htmlFor="type">Goal Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: "short-term" | "long-term") =>
                handleChange("type", value)
              }
              required
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select goal type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short-term">Short-Term</SelectItem>
                <SelectItem value="long-term">Long-Term</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category */}
          <div className="space-y-1">
            <Label htmlFor="category">Category (Optional)</Label>
            <Input
              id="category"
              placeholder="e.g., Travel, Housing, Investment"
              value={formData.category || ""}
              onChange={(e) => handleChange("category", e.target.value)}
              disabled={isLoading}
              maxLength={50} // Match DTO validation
            />
          </div>

          {/* Priority */}
          <div className="space-y-1">
            <Label htmlFor="priority">Priority (Optional, 1-5)</Label>
            <Input
              id="priority"
              type="number"
              placeholder="e.g., 3 (1=Highest)"
              value={formData.priority ?? ""} // Handle potential undefined
              onChange={(e) => handleChange("priority", e.target.value)}
              min="1"
              max="5"
              step="1"
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2 p-0 pt-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? "Saving..."
              : isEditing
              ? "Update Goal"
              : "Create Goal"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
