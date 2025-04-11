"use server";

import { cookies } from "next/headers";
import { GoalResponse } from "@/app/api/goals/route";

const BACKEND_URL = process.env.BACKEND_URL;

const getAuthHeaders = (): HeadersInit => {
  const token = cookies().get("jwt")?.value; // Use 'jwt' cookie
  if (!token) {
    console.error("[Goals Actions] No JWT token found in cookies");
    throw new Error("Not authorized. JWT cookie missing or invalid.");
  }
  return {
    "Content-Type": "application/json",
    Cookie: `jwt=${token}`, // Use Cookie header
  };
};

// Server Action to add a contribution (moved here)
export async function addContributionToAction(
  goalId: string,
  amount: number
): Promise<GoalResponse | { error: string }> {
  try {
    const headers = getAuthHeaders();
    const payload = { amount };

    if (!goalId) {
      return { error: "Goal ID is required" };
    }
    if (amount <= 0) {
      return { error: "Contribution amount must be positive" };
    }

    const response = await fetch(
      `${BACKEND_URL}/api/goals/${goalId}/contribute`,
      {
        method: "POST",
        headers: headers,
        body: JSON.stringify(payload),
      }
    );

    console.log(
      "[Goals Action - Add Contribution] Response Status:",
      response.status
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})); // Handle non-JSON errors
      console.error(
        `[Goals Action - Add Contribution] Error response body: ${JSON.stringify(
          errorData
        )}`
      );
      throw new Error(
        `Failed to add contribution: ${response.statusText} (${response.status})`
      );
    }

    const result: GoalResponse = await response.json();
    console.log(
      "[Goals Action - Add Contribution] Contribution added to goal:",
      goalId
    );
    return result; // Return the updated goal
  } catch (error: any) {
    console.error("[Goals Action - Add Contribution] error:", error);
    // Return error response
    return {
      error:
        error.message ||
        "Failed to add contribution due to an unexpected error.",
    };
  }
}
