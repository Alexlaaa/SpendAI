"use client";

import { GoalResponse } from "@/app/api/goals/route";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { differenceInDays, parseISO, isValid } from "date-fns";
import {
  ListChecks,
  Target,
  TrendingUp,
  Clock,
  AlertTriangle,
} from "lucide-react";

interface GoalSummaryProps {
  goals: GoalResponse[];
}

export function GoalSummary({ goals }: GoalSummaryProps) {
  if (!goals || goals.length === 0) {
    return null; // Don't render anything if there are no goals
  }

  const totalGoals = goals.length;
  const totalTargetAmount = goals.reduce(
    (sum, goal) => sum + goal.targetAmount,
    0
  );
  const totalCurrentAmount = goals.reduce(
    (sum, goal) => sum + goal.currentAmount,
    0
  );
  const overallProgress =
    totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0;

  const now = new Date();
  const goalsNearingDeadline = goals.filter((goal) => {
    if (!goal.deadline) return false;
    const deadlineDate = parseISO(goal.deadline);
    if (!isValid(deadlineDate)) return false;
    const daysLeft = differenceInDays(deadlineDate, now);
    return daysLeft >= 0 && daysLeft <= 30; // Nearing deadline if within 30 days
  }).length;

  const goalsPastDeadline = goals.filter((goal) => {
    if (!goal.deadline) return false;
    const deadlineDate = parseISO(goal.deadline);
    if (!isValid(deadlineDate)) return false;
    return differenceInDays(deadlineDate, now) < 0;
  }).length;

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("en-SG", {
      style: "currency",
      currency: "SGD",
    });
  };

  return (
    <Card className="mb-6 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Goals Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
          <div className="flex flex-col items-center p-3 bg-secondary/30 rounded-lg">
            <ListChecks className="h-6 w-6 mb-1 text-blue-600" />
            <span className="text-2xl font-bold">{totalGoals}</span>
            <span className="text-xs text-muted-foreground">Total Goals</span>
          </div>
          <div className="flex flex-col items-center p-3 bg-secondary/30 rounded-lg">
            <Target className="h-6 w-6 mb-1 text-green-600" />
            <span className="text-2xl font-bold">
              {formatCurrency(totalTargetAmount)}
            </span>
            <span className="text-xs text-muted-foreground">Total Target</span>
          </div>
          <div className="flex flex-col items-center p-3 bg-secondary/30 rounded-lg">
            <TrendingUp className="h-6 w-6 mb-1 text-indigo-600" />
            <span className="text-2xl font-bold">
              {formatCurrency(totalCurrentAmount)}
            </span>
            <span className="text-xs text-muted-foreground">Total Saved</span>
          </div>
          <div className="flex flex-col items-center p-3 bg-secondary/30 rounded-lg">
            <Clock className="h-6 w-6 mb-1 text-yellow-600" />
            <span className="text-2xl font-bold">{goalsNearingDeadline}</span>
            <span className="text-xs text-muted-foreground">
              Nearing Deadline
            </span>
          </div>
          <div className="flex flex-col items-center p-3 bg-secondary/30 rounded-lg">
            <AlertTriangle className="h-6 w-6 mb-1 text-red-600" />
            <span className="text-2xl font-bold">{goalsPastDeadline}</span>
            <span className="text-xs text-muted-foreground">Past Deadline</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
