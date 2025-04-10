"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

interface BudgetProgressProps {
  current: number;
  total: number;
  label?: string;
  className?: string;
  showAmount?: boolean;
  showPercentage?: boolean;
  variant?: "default" | "success" | "warning" | "danger";
  onEditClick?: () => void;
}

export const BudgetProgress = ({
  current,
  total,
  label = "Budget",
  className,
  showAmount = true,
  showPercentage = true,
  variant = "default",
  onEditClick,
}: BudgetProgressProps) => {
  // Ensure total is not zero to avoid division by zero
  const safeTotal = total === 0 ? 1 : total;
  // Ensure current is not negative for percentage calculation
  const safeCurrent = Math.max(current, 0);
  // Calculate percentage, cap at 100% for visual representation if current <= total
  // Allow > 100% if current exceeds total to show overspending, but cap Progress component value at 100
  const rawPercentage = (safeCurrent / safeTotal) * 100;
  const displayPercentage = Math.round(rawPercentage);
  const progressValue = Math.min(displayPercentage, 100); // Cap value for Progress component at 100

  const getProgressColor = () => {
    // Use explicit variant color if provided
    if (variant === "success") return "bg-green-500";
    if (variant === "warning") return "bg-yellow-500";
    if (variant === "danger") return "bg-red-500";

    // Default color logic based on percentage (including overspending)
    if (rawPercentage > 100) return "bg-red-500"; // Over budget
    if (rawPercentage >= 75) return "bg-yellow-500"; // Approaching limit
    if (rawPercentage >= 50) return "bg-primary"; // Halfway
    return "bg-green-500"; // Default green for under 50%
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-SG", {
      style: "currency",
      currency: "SGD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <div className={cn("w-full space-y-2", className)}>
      <div className="flex w-full justify-between items-center gap-2">
        <div className="flex items-center gap-2 flex-grow min-w-0">
          <Label className="text-sm font-medium truncate">{label}</Label>
          {onEditClick && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 flex-shrink-0"
              onClick={onEditClick}
            >
              <Pencil className="h-3 w-3" />
              <span className="sr-only">Edit Budget</span>
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm flex-shrink-0">
          {showAmount && (
            <span className="text-foreground font-medium">
              {formatCurrency(current)} / {formatCurrency(total)}
            </span>
          )}
          {showPercentage && (
            <span className="text-muted-foreground">
              ({displayPercentage}%)
            </span>
          )}
        </div>
      </div>
      <Progress
        value={progressValue}
        className="h-2 w-full"
        indicatorClassName={getProgressColor()}
      />
    </div>
  );
};
