"use server";

import { cookies } from "next/headers";
import { Category as BudgetCategoryEnum } from "@/components/forms/BudgetForm";

export interface Budget {
  _id: string;
  userId: string;
  category: BudgetCategoryEnum;
  amount: number;
  period: "monthly" | "yearly" | "custom";
  startDate: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}
import { BudgetFormValues } from "@/components/forms/BudgetForm";

// Interface for the payload sent to the backend API
interface BudgetApiPayload {
  category?: string;
  amount?: number;
  period?: "monthly" | "yearly" | "custom";
  startDate?: string;
  endDate?: string | null | undefined;
}

const BACKEND_URL = process.env.BACKEND_URL;

// Helper to get token and prepare headers
const getAuthHeaders = (): HeadersInit => {
  const token = cookies().get("jwt")?.value;
  if (!token) {
    console.error("[BudgetActions] No JWT token found in cookies");
    throw new Error("Not authorized. JWT cookie missing or invalid.");
  }
  return {
    "Content-Type": "application/json",
    Cookie: `jwt=${token}`,
  };
};

// Fetch all budgets
export async function fetchBudgetsServerAction(): Promise<Budget[]> {
  console.log(`[fetchBudgetsServerAction] GET from ${BACKEND_URL}/api/budgets`);
  try {
    const headers = getAuthHeaders();
    const response = await fetch(`${BACKEND_URL}/api/budgets`, {
      method: "GET",
      headers: headers,
      cache: "no-store", // Ensure fresh data
    });

    console.log("[fetchBudgetsServerAction] Response Status:", response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[fetchBudgetsServerAction] Error response body: ${errorText}`
      );
      throw new Error(
        `Failed to fetch budgets: ${response.statusText} (${response.status})`
      );
    }

    const result = await response.json();
    console.log("[fetchBudgetsServerAction] Received budgets:", result.length);
    return result;
  } catch (err: any) {
    console.error("[fetchBudgetsServerAction] error:", err);
    // Rethrow or handle specific errors
    throw new Error(
      err.message || "Failed to fetch budgets due to an unexpected error."
    );
  }
}

// Create a new budget
export async function createBudgetServerAction(
  budgetData: BudgetFormValues
): Promise<Budget> {
  console.log(`[createBudgetServerAction] POST to ${BACKEND_URL}/api/budgets`);
  try {
    const headers = getAuthHeaders();
    const payload: BudgetApiPayload = {
      category: budgetData.category,
      amount: budgetData.amount,
      period: budgetData.period,
      startDate: budgetData.startDate.toISOString(),
      endDate: budgetData.endDate
        ? budgetData.endDate.toISOString()
        : undefined,
    };

    const response = await fetch(`${BACKEND_URL}/api/budgets`, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
    });

    console.log("[createBudgetServerAction] Response Status:", response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[createBudgetServerAction] Error response body: ${errorText}`
      );
      throw new Error(
        `Failed to create budget: ${response.statusText} (${response.status})`
      );
    }

    const result = await response.json();
    console.log("[createBudgetServerAction] Budget created:", result._id);
    return result;
  } catch (err: any) {
    console.error("[createBudgetServerAction] error:", err);
    throw new Error(
      err.message || "Failed to create budget due to an unexpected error."
    );
  }
}

// Update an existing budget
export async function updateBudgetServerAction(
  id: string,
  budgetData: Partial<BudgetFormValues>
): Promise<Budget> {
  console.log(
    `[updateBudgetServerAction] PATCH to ${BACKEND_URL}/api/budgets/${id}`
  );
  try {
    const headers = getAuthHeaders();
    const payload: BudgetApiPayload = {};

    if (budgetData.category !== undefined)
      payload.category = budgetData.category;
    if (budgetData.amount !== undefined) payload.amount = budgetData.amount;
    if (budgetData.period !== undefined) payload.period = budgetData.period;
    if (budgetData.startDate && budgetData.startDate instanceof Date) {
      payload.startDate = budgetData.startDate.toISOString();
    }
    if (budgetData.endDate && budgetData.endDate instanceof Date) {
      payload.endDate = budgetData.endDate.toISOString();
    } else if (budgetData.period && budgetData.period !== "custom") {
      payload.endDate = undefined;
    } else if (budgetData.endDate === null) {
      payload.endDate = null;
    }

    const response = await fetch(`${BACKEND_URL}/api/budgets/${id}`, {
      method: "PATCH",
      headers: headers,
      body: JSON.stringify(payload),
    });

    console.log("[updateBudgetServerAction] Response Status:", response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[updateBudgetServerAction] Error response body: ${errorText}`
      );
      throw new Error(
        `Failed to update budget: ${response.statusText} (${response.status})`
      );
    }

    const result = await response.json();
    console.log("[updateBudgetServerAction] Budget updated:", result._id);
    return result;
  } catch (err: any) {
    console.error("[updateBudgetServerAction] error:", err);
    throw new Error(
      err.message || "Failed to update budget due to an unexpected error."
    );
  }
}

// Delete a budget
export async function deleteBudgetServerAction(
  id: string
): Promise<{ message: string }> {
  console.log(
    `[deleteBudgetServerAction] DELETE from ${BACKEND_URL}/api/budgets/${id}`
  );
  try {
    const headers = getAuthHeaders();
    // Remove Content-Type for DELETE if no body is sent
    delete (headers as any)["Content-Type"];

    const response = await fetch(`${BACKEND_URL}/api/budgets/${id}`, {
      method: "DELETE",
      headers: headers,
    });

    console.log("[deleteBudgetServerAction] Response Status:", response.status);
    // DELETE often returns 204 No Content on success
    if (!response.ok && response.status !== 204) {
      const errorText = await response.text();
      console.error(
        `[deleteBudgetServerAction] Error response body: ${errorText}`
      );
      throw new Error(
        `Failed to delete budget: ${response.statusText} (${response.status})`
      );
    }

    console.log("[deleteBudgetServerAction] Budget deleted:", id);
    return { message: "Budget successfully deleted." }; // Return success message
  } catch (err: any) {
    console.error("[deleteBudgetServerAction] error:", err);
    throw new Error(
      err.message || "Failed to delete budget due to an unexpected error."
    );
  }
}
