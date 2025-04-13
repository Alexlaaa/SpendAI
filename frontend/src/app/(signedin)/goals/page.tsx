// frontend/src/app/(signedin)/goals/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/AuthProvider";
import { GoalResponse, GoalType } from "@/types/goals"; // Corrected import path
import { addContributionToAction } from "@/app/actions/goals";
import { toast } from "@/hooks/use-toast";
import { GoalForm, GoalFormData } from "@/components/forms/GoalForm";
import {
  ContributionForm,
  ContributionFormData,
} from "@/components/forms/ContributionForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { GoalCard } from "@/components/cards/GoalCard";
import { GoalSummary } from "@/components/goals/GoalSummary";
import { GoalAllocator } from "@/components/goals/GoalAllocator";
import {
  AutoAllocateModal,
  AllocationPlanItem,
} from "@/components/modals/AutoAllocateModal";

const GoalsPage = () => {
  const { user } = useAuth(); // Get user info including tier
  const [goals, setGoals] = useState<GoalResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isContribModalOpen, setIsContribModalOpen] = useState(false);
  const [isAutoAllocateModalOpen, setIsAutoAllocateModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalResponse | null>(null);
  const [contributingGoal, setContributingGoal] = useState<GoalResponse | null>(
    null
  );

  const fetchGoals = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/goals");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to fetch goals (${response.status})`
        );
      }
      const data: GoalResponse[] = await response.json();
      setGoals(data);
    } catch (err: any) {
      console.error("Error fetching goals:", err);
      setError(err.message || "An unexpected error occurred.");
      toast({
        title: "Error Fetching Goals",
        description: err.message || "Could not load your financial goals.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    // Fetch goals only if user is Tier 2 or higher
    if (user && (user.tier === "tier2" || user.tier === "tier3")) {
      fetchGoals();
    } else {
      setIsLoading(false); // Stop loading if user doesn't have access
    }
  }, [user, fetchGoals]);

  const handleFormSubmit = async (formData: GoalFormData) => {
    setIsSubmitting(true);
    const isEditing = !!formData.id;
    const url = isEditing ? `/api/goals?id=${formData.id}` : "/api/goals";
    const method = isEditing ? "PATCH" : "POST";

    // Prepare payload, removing id if present
    const { id, ...payload } = formData;

    try {
      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to ${isEditing ? "update" : "create"} goal`
        );
      }

      toast({
        title: `Goal ${isEditing ? "Updated" : "Created"}`,
        description: `Your financial goal "${
          payload.name
        }" has been successfully ${isEditing ? "updated" : "saved"}.`,
      });
      setIsEditModalOpen(false); // Close EDIT modal on success
      setEditingGoal(null); // Reset editing state
      fetchGoals(); // Refresh the list
    } catch (err: any) {
      console.error(`Error ${isEditing ? "updating" : "creating"} goal:`, err);
      toast({
        title: `Error ${isEditing ? "Updating" : "Creating"} Goal`,
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this goal? This action cannot be undone."
      )
    )
      return;

    setIsLoading(true); // Use isLoading to indicate deletion process
    try {
      const response = await fetch(`/api/goals?id=${id}`, {
        method: "DELETE",
      });

      // Check for 204 No Content or other success statuses
      if (!response.ok && response.status !== 204) {
        const errorData = await response.json().catch(() => ({})); // Handle cases where body might be empty on error
        throw new Error(
          errorData.error || `Failed to delete goal (${response.status})`
        );
      }

      toast({
        title: "Goal Deleted",
        description: "The financial goal has been successfully deleted.",
      });
      fetchGoals(); // Refresh the list
    } catch (err: any) {
      console.error("Error deleting goal:", err);
      toast({
        title: "Error Deleting Goal",
        description: err.message || "Could not delete the goal.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false); // Stop loading indicator
    }
  };

  const openEditModal = (goal: GoalResponse) => {
    // Map GoalResponse to GoalFormData for the form, including new fields
    const formData: GoalFormData = {
      id: goal.id,
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      deadline: goal.deadline ? goal.deadline.split("T")[0] : undefined,
      type: goal.type as GoalType,
      category: goal.category, // Include category
      priority: goal.priority, // Include priority
    };
    setEditingGoal(goal); // Keep original response for context if needed
    setIsEditModalOpen(true); // Open EDIT modal
  };

  const openCreateModal = () => {
    setEditingGoal(null); // Ensure no initial data for create
    setIsEditModalOpen(true); // Open EDIT modal
  };

  // Handler to open the contribution modal
  const handleAddContributionClick = (goal: GoalResponse) => {
    setContributingGoal(goal);
    setIsContribModalOpen(true); // Open CONTRIB modal
  };

  // Handler for submitting contribution
  const handleContributionSubmit = async (data: ContributionFormData) => {
    if (!contributingGoal) return; // Should not happen if modal is open

    setIsSubmitting(true);
    try {
      const result = await addContributionToAction(
        contributingGoal.id,
        data.amount
      );
      if ("error" in result) {
        throw new Error(result.error);
      }
      toast({
        title: "Contribution Added",
        description: `Successfully added contribution to "${contributingGoal.name}".`,
      });
      setIsContribModalOpen(false); // Close modal
      setContributingGoal(null); // Clear target goal
      fetchGoals(); // Refresh goals list to show updated amount
    } catch (err: any) {
      console.error("Error adding contribution:", err);
      toast({
        title: "Error Adding Contribution",
        description: err.message || "Could not add contribution.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler to cancel contribution modal
  const handleContributionCancel = () => {
    setIsContribModalOpen(false);
    setContributingGoal(null);
  };

  // Handler for confirming auto-allocation
  const handleAutoAllocateConfirm = async (
    allocationPlan: AllocationPlanItem[]
  ) => {
    setIsSubmitting(true); // Use the general submitting state
    let successCount = 0;
    let errorCount = 0;
    let firstErrorMessage = "";

    try {
      const results = await Promise.allSettled(
        allocationPlan.map((item) =>
          addContributionToAction(item.goalId, item.amountToAllocate)
        )
      );

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          if ("error" in result.value) {
            // Server action returned an error object
            errorCount++;
            if (!firstErrorMessage)
              firstErrorMessage =
                result.value.error ?? "Unknown allocation error.";
            console.error(
              `Error allocating to ${allocationPlan[index].goalName}:`,
              result.value.error
            );
          } else {
            successCount++;
          }
        } else {
          // Promise itself rejected (network error, etc.)
          errorCount++;
          if (!firstErrorMessage)
            firstErrorMessage =
              result.reason?.message ??
              "Network or unexpected error during allocation.";
          console.error(
            `Failed to allocate to ${allocationPlan[index].goalName}:`,
            result.reason
          );
        }
      });

      if (errorCount > 0) {
        toast({
          title: "Allocation Partially Failed",
          description: `Allocated ${successCount} contribution(s). Failed to allocate ${errorCount} contribution(s). First error: ${firstErrorMessage}`,
          variant: "default",
        });
      } else {
        toast({
          title: "Allocation Successful",
          description: `Successfully allocated savings to ${successCount} goal(s).`,
        });
      }
    } catch (err: any) {
      // Catch any unexpected error during the Promise.allSettled or setup
      console.error("Unexpected error during auto-allocation:", err);
      toast({
        title: "Auto-Allocation Failed",
        description:
          err.message ||
          "An unexpected error occurred during the allocation process.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      setIsAutoAllocateModalOpen(false); // Close modal regardless of outcome
      fetchGoals(); // Refresh goals list
    }
  };

  // Render based on tier
  if (!user || (user.tier !== "tier2" && user.tier !== "tier3")) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8 text-center">
        <h1 className="text-3xl font-bold mb-6">Financial Goals</h1>
        <p className="text-lg text-muted-foreground">
          This feature requires a Tier 2 or Tier 3 subscription.
        </p>
        {/* Optionally add a link to the pricing page */}
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        {" "}
        {/* Use flex-wrap and gap */}
        <h1 className="text-3xl font-bold">Financial Goals</h1>
        <div className="flex gap-2">
          {" "}
          {/* Group buttons */}
          <Button
            variant="outline"
            onClick={() => setIsAutoAllocateModalOpen(true)}
          >
            Allocate Savings
          </Button>
          <Button onClick={openCreateModal}>Set New Goal</Button>
        </div>
      </div>

      {/* Render Goal Summary */}
      <GoalSummary goals={goals} />

      {/* Render Goal Allocator/Projector */}
      <GoalAllocator goals={goals} />

      {isLoading && !isSubmitting && <p>Loading goals...</p>}
      {error && <p className="text-destructive">Error: {error}</p>}

      {!isLoading && !error && goals.length === 0 && (
        <p>
          {`You haven't set any financial goals yet. Click "Set New Goal" to start!`}
        </p>
      )}

      {!isLoading && !error && goals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {" "}
          {/* Increased gap */}
          {/* Map through goals and render GoalCard components */}
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={openEditModal}
              onDelete={handleDeleteGoal}
              onAddContribution={handleAddContributionClick}
              isLoading={isLoading || isSubmitting}
            />
          ))}
        </div>
      )}

      {/* Goal Form Dialog (for Create/Edit) */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader></DialogHeader>
          <GoalForm
            onSubmit={handleFormSubmit}
            onCancel={() => setIsEditModalOpen(false)}
            initialData={
              editingGoal
                ? {
                    id: editingGoal.id,
                    name: editingGoal.name,
                    targetAmount: editingGoal.targetAmount,
                    currentAmount: editingGoal.currentAmount,
                    deadline: editingGoal.deadline
                      ? editingGoal.deadline.split("T")[0]
                      : undefined,
                    type: editingGoal.type as GoalType,
                    category: editingGoal.category,
                    priority: editingGoal.priority,
                  }
                : null
            }
            isLoading={isSubmitting}
          />
          {/* Footer actions are handled within GoalForm */}
        </DialogContent>
      </Dialog>

      {/* Contribution Modal Dialog */}
      <Dialog open={isContribModalOpen} onOpenChange={setIsContribModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          {/* Render only if contributingGoal is set */}
          {contributingGoal && (
            <ContributionForm
              onSubmit={handleContributionSubmit}
              onCancel={handleContributionCancel}
              goalName={contributingGoal.name}
              isLoading={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Auto-Allocate Modal Dialog */}
      <AutoAllocateModal
        goals={goals}
        isOpen={isAutoAllocateModalOpen}
        onClose={() => setIsAutoAllocateModalOpen(false)}
        onConfirm={handleAutoAllocateConfirm}
        isLoading={isSubmitting}
      />
    </div>
  );
};

export default GoalsPage;
