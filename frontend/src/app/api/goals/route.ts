// frontend/src/app/api/goals/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  GoalType,
  CreateGoalPayload,
  UpdateGoalPayload,
  GoalResponse,
} from "@/types/goals"; // Import types from the new file

const BACKEND_URL = process.env.BACKEND_URL;

// GET all goals
export async function GET(): Promise<
  NextResponse<GoalResponse[] | { error: string }>
> {
  // Get token inline for this route handler
  const token = cookies().get("jwt")?.value;
  if (!token) {
    return NextResponse.json(
      { error: "Unauthorized - Missing JWT" },
      { status: 401 }
    );
  }
  const headers = {
    "Content-Type": "application/json",
    Cookie: `jwt=${token}`,
  };

  try {
    // const headers = getAuthHeaders(); // Removed
    const response = await fetch(`${BACKEND_URL}/api/goals`, {
      method: "GET",
      headers: headers,
      cache: "no-store", // Ensure fresh data like budgets
    });

    console.log("[Goals API Route - GET] Response Status:", response.status);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})); // Handle non-JSON errors
      console.error(
        `[Goals API Route - GET] Error response body: ${JSON.stringify(
          errorData
        )}`
      );
      throw new Error(
        `Failed to fetch goals: ${response.statusText} (${response.status})`
      );
    }

    const result = await response.json();
    console.log("[Goals API Route - GET] Received goals:", result.length);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Goals API Route - GET] error:", error);
    // Return error response
    return NextResponse.json(
      {
        error:
          error.message || "Failed to fetch goals due to an unexpected error.",
      },
      { status: 500 }
    );
  }
}

// POST create goal
export async function POST(
  request: Request
): Promise<NextResponse<GoalResponse | { error: string }>> {
  // Get token inline for this route handler
  const token = cookies().get("jwt")?.value;
  if (!token) {
    return NextResponse.json(
      { error: "Unauthorized - Missing JWT" },
      { status: 401 }
    );
  }
  const headers = {
    "Content-Type": "application/json",
    Cookie: `jwt=${token}`,
  };

  try {
    const payload: CreateGoalPayload = await request.json();

    if (!payload.name || !payload.targetAmount || !payload.type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/goals`, {
      // Use BACKEND_URL and correct path
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload),
    });

    console.log("[Goals API Route - POST] Response Status:", response.status);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})); // Handle non-JSON errors
      console.error(
        `[Goals API Route - POST] Error response body: ${JSON.stringify(
          errorData
        )}`
      );
      throw new Error(
        `Failed to create goal: ${response.statusText} (${response.status})`
      );
    }

    const result = await response.json();
    console.log("[Goals API Route - POST] Goal created:", result.id); // Use id from response
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("[Goals API Route - POST] error:", error);
    // Return error response
    return NextResponse.json(
      {
        error:
          error.message || "Failed to create goal due to an unexpected error.",
      },
      { status: 500 }
    );
  }
}

// PATCH update goal
export async function PATCH(
  request: Request
): Promise<NextResponse<GoalResponse | { error: string }>> {
  // Get token inline for this route handler
  const token = cookies().get("jwt")?.value;
  if (!token) {
    return NextResponse.json(
      { error: "Unauthorized - Missing JWT" },
      { status: 401 }
    );
  }
  const headers = {
    "Content-Type": "application/json",
    Cookie: `jwt=${token}`,
  };

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Goal ID is required" },
        { status: 400 }
      );
    }

    const payload: UpdateGoalPayload = await request.json();

    const response = await fetch(`${BACKEND_URL}/api/goals/${id}`, {
      method: "PATCH",
      headers: headers,
      body: JSON.stringify(payload),
    });

    console.log("[Goals API Route - PATCH] Response Status:", response.status);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})); // Handle non-JSON errors
      console.error(
        `[Goals API Route - PATCH] Error response body: ${JSON.stringify(
          errorData
        )}`
      );
      throw new Error(
        `Failed to update goal ${id}: ${response.statusText} (${response.status})`
      );
    }

    const result = await response.json();
    console.log("[Goals API Route - PATCH] Goal updated:", result.id); // Use id from response
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Goals API Route - PATCH] error:", error);
    // Return error response
    return NextResponse.json(
      {
        error:
          error.message || "Failed to update goal due to an unexpected error.",
      },
      { status: 500 }
    );
  }
}

// DELETE goal
export async function DELETE(
  request: Request
): Promise<NextResponse<{ message: string } | { error: string }>> {
  // Get token inline for this route handler
  const token = cookies().get("jwt")?.value;
  if (!token) {
    return NextResponse.json(
      { error: "Unauthorized - Missing JWT" },
      { status: 401 }
    );
  }
  const headers = {
    // No Content-Type needed for DELETE with no body
    Cookie: `jwt=${token}`,
  };

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { error: "Goal ID is required" },
        { status: 400 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/goals/${id}`, {
      // Use BACKEND_URL and correct path
      method: "DELETE",
      headers: headers,
    });

    console.log("[Goals API Route - DELETE] Response Status:", response.status);
    // DELETE often returns 204 No Content on success
    if (!response.ok && response.status !== 204) {
      const errorData = await response.json().catch(() => ({})); // Handle non-JSON errors
      console.error(
        `[Goals API Route - DELETE] Error response body: ${JSON.stringify(
          errorData
        )}`
      );
      throw new Error(
        `Failed to delete goal ${id}: ${response.statusText} (${response.status})`
      );
    }

    console.log("[Goals API Route - DELETE] Goal deleted:", id);
    // Return success message consistent with budgets
    return NextResponse.json(
      { message: "Goal successfully deleted." },
      { status: response.status === 204 ? 204 : 200 }
    );
  } catch (error: any) {
    console.error("[Goals API Route - DELETE] error:", error);
    // Return error response
    return NextResponse.json(
      {
        error:
          error.message || "Failed to delete goal due to an unexpected error.",
      },
      { status: 500 }
    );
  }
}
