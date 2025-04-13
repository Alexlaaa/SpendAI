"use client";

import * as React from "react";
import { useState } from "react";
import { GoalResponse } from "@/types/goals"; // Corrected import path
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, differenceInDays, isValid } from "date-fns";
import { Target, Edit, Trash2, PlusCircle, Settings } from "lucide-react";

interface GoalCardProps {
  goal: GoalResponse;
  onEdit: (goal: GoalResponse) => void;
  onDelete: (id: string) => void;
  onAddContribution: (goal: GoalResponse) => void;
  isLoading?: boolean;
}

export function GoalCard({
  goal,
  onEdit,
  onDelete,
  onAddContribution,
  isLoading,
}: GoalCardProps) {
  const [showActions, setShowActions] = useState(false);

  const progress =
    goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
  const remainingAmount = goal.targetAmount - goal.currentAmount;
  const formattedTarget = goal.targetAmount.toLocaleString("en-SG", {
    style: "currency",
    currency: "SGD",
  });
  const formattedCurrent = goal.currentAmount.toLocaleString("en-SG", {
    style: "currency",
    currency: "SGD",
  });
  const formattedRemaining = remainingAmount.toLocaleString("en-SG", {
    style: "currency",
    currency: "SGD",
  });

  let deadlineText = "No deadline";
  let daysLeftText = "";
  let progressColor = "bg-blue-600"; // Default progress color

  if (goal.deadline) {
    const deadlineDate = parseISO(goal.deadline);
    if (isValid(deadlineDate)) {
      deadlineText = `Deadline: ${format(deadlineDate, "dd MMM yyyy")}`;
      const daysLeft = differenceInDays(deadlineDate, new Date());
      if (daysLeft < 0) {
        daysLeftText = "(Past due)";
        progressColor = "bg-red-600"; // Red if past due
      } else if (daysLeft <= 30) {
        daysLeftText = `(${daysLeft} day${daysLeft !== 1 ? "s" : ""} left)`;
        progressColor = "bg-yellow-500"; // Yellow if deadline near
      } else {
        daysLeftText = `(${daysLeft} days left)`;
      }
    }
  }

  // Adjust color based on progress if not past due or near deadline
  if (progress >= 100 && !progressColor.includes("red")) {
    progressColor = "bg-green-600"; // Green if completed
  }

  const toggleActions = () => setShowActions(!showActions);

  return (
    <Card className="flex flex-col justify-between h-full shadow-md hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              {goal.name}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground mt-1">
              {deadlineText} <span className="text-xs">{daysLeftText}</span>
            </CardDescription>
          </div>
          {/* Display Category and Priority Badges if they exist */}
          <div className="flex flex-col items-end gap-1">
            {goal.category && <Badge variant="outline">{goal.category}</Badge>}
            {goal.priority && (
              <Badge variant="secondary">P{goal.priority}</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow space-y-3 pt-2 pb-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-muted-foreground">Progress</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          <Progress
            value={progress}
            className="h-2"
            indicatorClassName={progressColor}
          />
          <div className="flex justify-between text-xs mt-1 text-muted-foreground">
            <span>{formattedCurrent}</span>
            <span>Target: {formattedTarget}</span>
          </div>
        </div>
        <p className="text-sm text-center">
          {remainingAmount > 0
            ? `${formattedRemaining} remaining`
            : "Goal achieved! 🎉"}
        </p>
        {/* Placeholder for Projection Info */}
        {/* <p className="text-xs text-center text-muted-foreground italic">Est. completion: Dec 2025</p> */}
      </CardContent>
      <CardFooter className="pt-2 pb-3 px-4 flex justify-end items-center gap-2">
        {showActions ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onAddContribution(goal)}
              disabled={isLoading}
              aria-label="Add Contribution"
              title="Add Contribution"
              className="h-8 w-8"
            >
              <PlusCircle className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(goal)}
              disabled={isLoading}
              aria-label="Edit Goal"
              title="Edit Goal"
              className="h-8 w-8"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(goal.id)}
              disabled={isLoading}
              className="text-destructive hover:text-destructive h-8 w-8"
              aria-label="Delete Goal"
              title="Delete Goal"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleActions}
              className="h-8 w-8"
              aria-label="Hide Actions"
              title="Hide Actions"
            >
              <Settings className="h-4 w-4" />{" "}
              {/* Use Settings icon to close */}
            </Button>
          </>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={toggleActions}
            disabled={isLoading}
            className="h-8"
          >
            <Settings className="h-4 w-4 mr-1" /> Modify
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
