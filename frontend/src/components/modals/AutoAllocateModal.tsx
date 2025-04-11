"use client";

import React, { useState, useEffect, useMemo } from "react";
import { GoalResponse } from "@/app/api/goals/route";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { parseISO, differenceInMonths, differenceInYears } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface AllocationPlanItem {
  goalId: string;
  goalName: string;
  amountToAllocate: number;
  currentAmount: number;
  targetAmount: number;
}

interface AutoAllocateModalProps {
  goals: GoalResponse[];
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (allocationPlan: AllocationPlanItem[]) => Promise<void>;
  isLoading?: boolean;
}

const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return "$0.00";
  return amount.toLocaleString("en-SG", { style: "currency", currency: "SGD" });
};

export function AutoAllocateModal({
  goals,
  isOpen,
  onClose,
  onConfirm,
  isLoading,
}: AutoAllocateModalProps) {
  const [amountSaved, setAmountSaved] = useState<number | undefined>(undefined);
  const [allocationPlan, setAllocationPlan] = useState<
    AllocationPlanItem[] | null
  >(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Reset state when modal opens/closes or goals change
  useEffect(() => {
    if (!isOpen) {
      setAmountSaved(undefined);
      setAllocationPlan(null);
      setShowConfirmation(false);
    }
  }, [isOpen]);

  const calculateAllocation = () => {
    if (!amountSaved || amountSaved <= 0 || !goals || goals.length === 0) {
      setAllocationPlan([]);
      return;
    }

    const now = new Date();
    let remainingToAllocate = amountSaved;
    const plan: AllocationPlanItem[] = [];
    const currentBalances = new Map<string, number>(
      goals.map((g) => [g.id, g.currentAmount])
    );

    // Sort goals: Deadline first, then Priority, then remaining amount needed
    const sortedGoals = [...goals].sort((a, b) => {
      const deadlineA = a.deadline ? parseISO(a.deadline) : null;
      const deadlineB = b.deadline ? parseISO(b.deadline) : null;

      if (deadlineA && deadlineB) {
        if (deadlineA < deadlineB) return -1;
        if (deadlineA > deadlineB) return 1;
      } else if (deadlineA) return -1;
      else if (deadlineB) return 1;

      const priorityA = a.priority ?? 999;
      const priorityB = b.priority ?? 999;
      if (priorityA < priorityB) return -1;
      if (priorityA > priorityB) return 1;

      const remainingA = Math.max(0, a.targetAmount - a.currentAmount);
      const remainingB = Math.max(0, b.targetAmount - b.currentAmount);
      return remainingA - remainingB;
    });

    for (const goal of sortedGoals) {
      const currentBalance = currentBalances.get(goal.id) ?? 0;
      const amountNeeded = Math.max(0, goal.targetAmount - currentBalance);
      let allocated = 0;

      if (amountNeeded > 0 && remainingToAllocate > 0) {
        allocated = Math.min(amountNeeded, remainingToAllocate);
        remainingToAllocate -= allocated;
        currentBalances.set(goal.id, currentBalance + allocated); // Update balance for subsequent calcs if needed, though not strictly necessary here
      }

      plan.push({
        goalId: goal.id,
        goalName: goal.name,
        amountToAllocate: allocated,
        currentAmount: goal.currentAmount, // Original current amount
        targetAmount: goal.targetAmount,
      });
    }

    setAllocationPlan(plan);
    setShowConfirmation(true); // Show the confirmation view
  };

  const handleConfirm = async () => {
    if (!allocationPlan) return;
    // Filter out goals with zero allocation before confirming
    const finalPlan = allocationPlan.filter(
      (item) => item.amountToAllocate > 0
    );
    await onConfirm(finalPlan);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShowConfirmation(false); // Hide confirmation if amount changes
    setAllocationPlan(null);
    const value = e.target.value === "" ? undefined : Number(e.target.value);
    if (value !== undefined && value < 0) {
      setAmountSaved(0);
    } else {
      setAmountSaved(value);
    }
  };

  // Calculate total allocated in the plan
  const totalAllocated = useMemo(() => {
    if (!allocationPlan) return 0;
    return allocationPlan.reduce((sum, item) => sum + item.amountToAllocate, 0);
  }, [allocationPlan]);

  const amountLeftOver = useMemo(() => {
    if (amountSaved === undefined) return 0;
    return amountSaved - totalAllocated;
  }, [amountSaved, totalAllocated]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Auto-Allocate Savings</DialogTitle>
          <DialogDescription>
            Enter the total amount saved this period. We'll propose an
            allocation based on goal deadlines and priorities.
          </DialogDescription>
        </DialogHeader>

        {!showConfirmation ? (
          // Step 1: Enter Amount
          <div className="py-4 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="amountSaved">Amount Saved This Period ($)</Label>
              <Input
                id="amountSaved"
                type="number"
                placeholder="e.g., 1500"
                value={amountSaved ?? ""}
                onChange={handleAmountChange}
                min="0.01"
                step="0.01"
              />
            </div>
            <Button
              onClick={calculateAllocation}
              disabled={!amountSaved || amountSaved <= 0}
              className="w-full"
            >
              Calculate Allocation
            </Button>
          </div>
        ) : (
          // Step 2: Confirmation View
          <div className="py-4">
            <h4 className="font-semibold mb-3 text-center">
              Proposed Allocation for {formatCurrency(amountSaved)}:
            </h4>
            <ScrollArea className="h-[300px] mb-4 border rounded-md p-2">
              {" "}
              {/* Make list scrollable */}
              <div className="space-y-3">
                {allocationPlan?.map((item) => {
                  const currentProgress =
                    item.targetAmount > 0
                      ? (item.currentAmount / item.targetAmount) * 100
                      : 0;
                  const allocationPercentage =
                    item.targetAmount > 0
                      ? (item.amountToAllocate / item.targetAmount) * 100
                      : 0;
                  const newProgress =
                    item.targetAmount > 0
                      ? ((item.currentAmount + item.amountToAllocate) /
                          item.targetAmount) *
                        100
                      : 0;

                  return (
                    <div key={item.goalId} className="text-sm">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium">{item.goalName}</span>
                        <span className="text-primary font-semibold">
                          +{formatCurrency(item.amountToAllocate)}
                        </span>
                      </div>
                      <div className="relative h-4 w-full bg-secondary rounded overflow-hidden">
                        {/* New Progress (Yellow) */}
                        <div
                          className="absolute top-0 left-0 h-full bg-yellow-400 transition-all duration-500"
                          style={{ width: `${Math.min(newProgress, 100)}%` }}
                        />
                        {/* Existing Progress (Blue) */}
                        <div
                          className="absolute top-0 left-0 h-full bg-blue-600"
                          style={{
                            width: `${Math.min(currentProgress, 100)}%`,
                          }}
                        />
                      </div>
                      <div className="flex justify-end text-xs text-muted-foreground mt-1">
                        <span>
                          {formatCurrency(
                            item.currentAmount + item.amountToAllocate
                          )}{" "}
                          / {formatCurrency(item.targetAmount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {allocationPlan?.length === 0 && (
                  <p className="text-muted-foreground text-center">
                    No allocation needed for this amount.
                  </p>
                )}
              </div>
            </ScrollArea>
            {amountLeftOver > 0 && (
              <p className="text-sm text-center text-muted-foreground mb-3">
                {formatCurrency(amountLeftOver)} will be left over after this
                allocation.
              </p>
            )}
            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setShowConfirmation(false)}
                disabled={isLoading}
              >
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isLoading || totalAllocated <= 0}
              >
                {isLoading
                  ? "Allocating..."
                  : `Confirm & Allocate ${formatCurrency(totalAllocated)}`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
