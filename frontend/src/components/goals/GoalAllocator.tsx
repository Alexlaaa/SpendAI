"use client";

import React, { useState } from "react";
import { GoalResponse } from "@/app/api/goals/route";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Calculator,
  Info,
  CheckCircle2,
  XCircle,
  MinusCircle,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  addMonths,
  addYears,
  differenceInMonths,
  differenceInYears,
  format,
  parseISO,
  isValid,
  differenceInDays,
} from "date-fns";

interface GoalAllocatorProps {
  goals: GoalResponse[];
}

type Frequency = "monthly" | "annually";

interface AllocationResult {
  goalId: string;
  goalName: string;
  requiredPerPeriod: number | null; // Required savings per period to meet deadline
  projectedPeriods: number | null; // Number of periods (months/years) to complete, null if target met or cannot be met reasonably
  projectedDate: Date | null; // Projected completion date
  deadline: Date | null; // Add original deadline for display
  deadlineMet: boolean | null; // null if no deadline, true/false otherwise
  timeDifference: string | null; // e.g., "2 months ahead", "1 year behind"
  statusIcon?: React.ElementType; // Optional icon for status
}

interface Verdict {
  allMetOnTime: boolean;
  additionalSavingsNeeded: number | null; // Per period
}

// Helper function to format currency
const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return "-";
  if (!isFinite(amount)) return "N/A"; // Handle Infinity case for requiredPerPeriod
  return amount.toLocaleString("en-SG", {
    style: "currency",
    currency: "SGD",
    minimumFractionDigits: 2,
  });
};

export function GoalAllocator({ goals }: GoalAllocatorProps) {
  const [savingsAmount, setSavingsAmount] = useState<number | undefined>(5000);
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [allocationResults, setAllocationResults] = useState<
    AllocationResult[] | null
  >(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculate = () => {
    if (!savingsAmount || savingsAmount <= 0) {
      alert("Please enter a positive savings amount.");
      return;
    }
    setIsCalculating(true);
    setAllocationResults(null); // Clear previous results
    setVerdict(null);

    // --- Allocation & Projection Logic ---
    const now = new Date();
    const periodsPerYear = frequency === "monthly" ? 12 : 1;
    const savingsPerPeriod = savingsAmount;

    // 1. Sort Goals: Deadline first (earliest), then Priority (lowest number first), then Target Amount (smallest first)
    const sortedGoals = [...goals].sort((a, b) => {
      const deadlineA = a.deadline ? parseISO(a.deadline) : null;
      const deadlineB = b.deadline ? parseISO(b.deadline) : null;

      if (deadlineA && deadlineB) {
        if (deadlineA < deadlineB) return -1;
        if (deadlineA > deadlineB) return 1;
      } else if (deadlineA) {
        return -1; // Goals with deadlines come first
      } else if (deadlineB) {
        return 1;
      }

      const priorityA = a.priority ?? 999;
      const priorityB = b.priority ?? 999;
      if (priorityA < priorityB) return -1;
      if (priorityA > priorityB) return 1;

      const remainingA = Math.max(0, a.targetAmount - a.currentAmount);
      const remainingB = Math.max(0, b.targetAmount - b.currentAmount);
      if (remainingA < remainingB) return -1;
      if (remainingA > remainingB) return 1;

      return 0;
    });

    // 2. Simulate Funding Sequentially
    let cumulativePeriodsElapsed = 0;
    const goalCompletionPeriods = new Map<string, number>(); // goalId -> cumulative periods when completed

    for (const goal of sortedGoals) {
      const amountNeeded = Math.max(0, goal.targetAmount - goal.currentAmount);
      if (amountNeeded <= 0) {
        goalCompletionPeriods.set(goal.id, 0); // Already met
        continue;
      }

      if (savingsPerPeriod <= 0) {
        // Cannot fund any more goals
        goalCompletionPeriods.set(goal.id, Infinity); // Mark as unreachable with current savings
        continue;
      }

      const periodsForThisGoal = Math.ceil(amountNeeded / savingsPerPeriod);
      cumulativePeriodsElapsed += periodsForThisGoal;
      goalCompletionPeriods.set(goal.id, cumulativePeriodsElapsed);
    }

    // 3. Calculate Results for each goal based on simulation
    const results: AllocationResult[] = goals.map((goal) => {
      const completedPeriod = goalCompletionPeriods.get(goal.id); // This is now cumulative periods
      let projectedDate: Date | null = null;
      let projectedPeriods: number | null = null;

      if (completedPeriod !== undefined && isFinite(completedPeriod)) {
        projectedPeriods = completedPeriod;
        if (projectedPeriods >= 0) {
          // Only calculate date if completion is possible
          projectedDate =
            frequency === "monthly"
              ? addMonths(now, projectedPeriods)
              : addYears(now, projectedPeriods);
        }
      } else {
        projectedPeriods = null; // Mark as null if Infinity (unreachable)
      }

      const deadlineDate = goal.deadline ? parseISO(goal.deadline) : null;
      let deadlineMet: boolean | null = null;
      let timeDifference: string | null = null;
      let requiredPerPeriod: number | null = null;
      let statusIcon: React.ElementType | null = null;

      if (deadlineDate && isValid(deadlineDate)) {
        deadlineMet = projectedDate ? projectedDate <= deadlineDate : false;

        if (projectedDate) {
          const diffPeriods =
            frequency === "monthly"
              ? differenceInMonths(deadlineDate, projectedDate)
              : differenceInYears(deadlineDate, projectedDate);
          const unit = frequency === "monthly" ? "month" : "year";
          const units = frequency === "monthly" ? "months" : "years";

          if (diffPeriods >= 0) {
            // Met on or before deadline
            timeDifference =
              diffPeriods === 0
                ? `On time`
                : `${diffPeriods} ${diffPeriods > 1 ? units : unit} ahead`;
            statusIcon = diffPeriods === 0 ? Minus : TrendingUp;
          } else {
            // Met after deadline
            timeDifference = `${Math.abs(diffPeriods)} ${
              Math.abs(diffPeriods) > 1 ? units : unit
            } behind`;
            statusIcon = TrendingDown;
          }
        } else {
          // Not projected to complete within reasonable timeframe
          timeDifference = "Projected Miss";
          statusIcon = XCircle;
          deadlineMet = false; // Explicitly false if has deadline but won't complete
        }

        // Calculate required savings per period to meet deadline exactly
        const periodsToDeadline =
          frequency === "monthly"
            ? differenceInMonths(deadlineDate, now)
            : differenceInYears(deadlineDate, now);
        if (periodsToDeadline > 0) {
          const amountNeededNow = Math.max(
            0,
            goal.targetAmount - goal.currentAmount
          );
          requiredPerPeriod = amountNeededNow / periodsToDeadline;
        } else {
          // Deadline is now or in the past
          requiredPerPeriod =
            goal.targetAmount > goal.currentAmount ? Infinity : 0; // Needs immediate funding or already met
        }
      } else {
        // No deadline
        statusIcon = MinusCircle;
        timeDifference = projectedDate ? "Completes" : "N/A*"; // Indicate if it completes even without deadline
      }

      return {
        goalId: goal.id,
        goalName: goal.name,
        requiredPerPeriod: requiredPerPeriod,
        projectedPeriods: projectedPeriods, // Use cumulative periods
        projectedDate: projectedDate,
        deadline: deadlineDate,
        deadlineMet: deadlineMet,
        timeDifference: timeDifference,
        statusIcon: statusIcon,
      };
    });

    // 4. Determine Verdict
    const allMetOnTime = !results.some((r) => r.deadlineMet === false);
    let calculatedShortfall = 0;
    if (!allMetOnTime) {
      // Sum the 'requiredPerPeriod' for all goals that have deadlines
      const totalRequiredForAllDeadlines = results.reduce((sum, r) => {
        if (r.requiredPerPeriod !== null && isFinite(r.requiredPerPeriod)) {
          return sum + r.requiredPerPeriod;
        }
        return sum;
      }, 0);
      // The additional needed is the total required by *all* goals with deadlines minus what's being saved
      calculatedShortfall = Math.max(
        0,
        totalRequiredForAllDeadlines - savingsPerPeriod
      );
    }

    const finalVerdict: Verdict = {
      allMetOnTime: allMetOnTime,
      additionalSavingsNeeded: allMetOnTime ? null : calculatedShortfall,
    };

    setAllocationResults(results);
    setVerdict(finalVerdict);
    setIsCalculating(false);
  };

  return (
    <Card className="mb-6 shadow-sm border border-dashed border-primary/50">
      <CardHeader>
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Goal Allocation & Projection
        </CardTitle>
        <CardDescription className="flex items-start gap-2 pt-1">
          <Info
            size={16}
            className="mt-1 text-muted-foreground flex-shrink-0"
          />
          <span>
            Enter a hypothetical savings amount to see how it could be allocated
            across your goals based on priority and deadlines. We'll project
            completion times and tell you if you're on track.
          </span>
        </CardDescription>
        <p className="text-sm text-muted-foreground italic mt-2 px-1">
          Tip: Save the money in your bank, we'll do the allocation/projection
          of your savings across your goals for you here.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 space-y-1">
            <Label htmlFor="savingsAmount">Savings Amount ($)</Label>
            <Input
              id="savingsAmount"
              type="number"
              placeholder="e.g., 5000"
              value={savingsAmount ?? ""}
              onChange={(e) =>
                setSavingsAmount(
                  e.target.value === "" ? undefined : Number(e.target.value)
                )
              }
              min="0.01"
              step="0.01"
            />
          </div>
          <div className="flex-1 space-y-1">
            <Label htmlFor="frequency">Savings Frequency</Label>
            <Select
              value={frequency}
              onValueChange={(value: Frequency) => setFrequency(value)}
            >
              <SelectTrigger id="frequency">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="annually">Annually</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={handleCalculate}
            disabled={isCalculating || !savingsAmount}
          >
            {isCalculating ? "Calculating..." : "Calculate Projection"}
          </Button>
        </div>

        {/* --- Results Display Area --- */}
        {isCalculating && <p className="text-center p-4">Calculating...</p>}

        {verdict && (
          <div
            className={`mt-4 p-3 rounded-lg ${
              verdict.allMetOnTime
                ? "bg-green-100 border border-green-300"
                : "bg-orange-100 border border-orange-300"
            }`}
          >
            {" "}
            {/* Changed red to orange */}
            <h4 className="font-semibold text-lg mb-2">Projection Verdict</h4>
            {verdict.allMetOnTime ? (
              <p className="text-green-800">
                ✅ Congratulations! Based on saving{" "}
                {formatCurrency(savingsAmount)} {frequency}, all your goals with
                deadlines are projected to be met on time.
              </p>
            ) : (
              <p className="text-orange-800">
                {" "}
                {/* Changed red to orange */}
                ⚠️ Based on saving {formatCurrency(savingsAmount)} {frequency},
                not all goals may be met by their deadline.
                {verdict.additionalSavingsNeeded !== null &&
                  verdict.additionalSavingsNeeded > 0 &&
                  ` You may need to save an additional ${formatCurrency(
                    verdict.additionalSavingsNeeded
                  )} ${frequency} to meet all deadlines.`}
                {verdict.additionalSavingsNeeded !== null &&
                  verdict.additionalSavingsNeeded <= 0 &&
                  ` Check individual goals below for details.`}
              </p>
            )}
          </div>
        )}

        {allocationResults && allocationResults.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="font-semibold text-lg mb-2">
              Allocation & Projection Details:
            </h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Goal</TableHead>
                  <TableHead className="text-right">
                    Required / {frequency === "monthly" ? "Month" : "Year"}
                  </TableHead>
                  <TableHead className="text-center">
                    Projected Completion
                  </TableHead>
                  <TableHead className="text-center">Deadline</TableHead>
                  <TableHead className="text-center">
                    Status (vs Deadline)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocationResults.map((result) => {
                  const StatusIcon = result.statusIcon;
                  let statusColor = "text-muted-foreground";
                  if (result.deadlineMet === true)
                    statusColor = "text-green-600";
                  if (result.deadlineMet === false)
                    statusColor = "text-red-600";
                  if (result.timeDifference === "On track")
                    statusColor = "text-blue-600";

                  return (
                    <TableRow key={result.goalId}>
                      <TableCell className="font-medium">
                        {result.goalName}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(result.requiredPerPeriod)}
                      </TableCell>
                      <TableCell className="text-center">
                        {result.projectedDate
                          ? format(result.projectedDate, "MMM yyyy")
                          : result.projectedPeriods === 0
                          ? "Already Met"
                          : "N/A*"}
                      </TableCell>
                      <TableCell className="text-center">
                        {result.deadline
                          ? format(result.deadline, "MMM yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell
                        className={`text-center text-xs ${statusColor}`}
                      >
                        {StatusIcon && (
                          <StatusIcon
                            className={`h-4 w-4 inline-block mr-1 ${statusColor}`}
                          />
                        )}
                        {result.timeDifference ?? "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground pt-1">
              *N/A: Goal might not be reachable within the simulation timeframe
              with the current savings amount.
            </p>
            {/* Optional: Add button to apply allocation */}
            {/* <Button variant="outline" size="sm" className="mt-2">Apply this allocation automatically (Coming Soon)</Button> */}
          </div>
        )}
        {/* --- End Results Display Area --- */}
      </CardContent>
    </Card>
  );
}
