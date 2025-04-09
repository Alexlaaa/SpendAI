"use server";

import { cookies } from "next/headers";
import {
  encryptWithBackendPublicKey,
  decryptWithFrontendPrivateKey,
} from "@/utils/encryption";
import { revalidatePath } from "next/cache";

type UpdateTierPayload = {
  tier: "tier1" | "tier2" | "tier3";
  billingCycle?: 'monthly' | 'annual'; // Add optional billing cycle
};

// Function to update user's tier and billing cycle
export async function updateUserTier(payload: UpdateTierPayload) {
  try {
    const jwt = cookies().get("jwt");
    if (!jwt) {
      return { success: false, error: "Not authenticated" };
    }

    const response = await fetch(`${process.env.BACKEND_URL}/api/users/tier`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Cookie: `jwt=${jwt.value}`,
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();

    if (response.ok) {
      console.log("[API Settings Route] Tier update successful:", responseData);
      // Revalidate relevant paths if needed after tier change
      revalidatePath("/settings");
      revalidatePath("/pricing");

      return { success: true, user: responseData };
    } else {
      console.error("[API Settings Route] Tier update failed:", responseData);
      return {
        success: false,
        error: responseData.message || "Failed to update tier",
      };
    }
  } catch (error: any) {
    console.error("[API Settings Route] Error updating tier:", error);
    return {
      success: false,
      error: error.message || "An unexpected error occurred",
    };
  }
}

type ApiTokenResponse = {
  defaultModel: string;
  geminiKey?: string;
  openaiKey?: string;
};

export async function fetchUserApiTokenStatus(): Promise<ApiTokenResponse> {
  const token = cookies().get("jwt")?.value;

  if (!token) {
    console.error("[fetchUserApiTokenStatus] No JWT token found in cookies");
    throw new Error("Not authorized. JWT cookie missing or invalid.");
  }

  try {
    const headers = {
      Cookie: `jwt=${token}`,
    };

    console.log("[fetchUserApiTokenStatus] Request details:");
    console.log("URL:", `${process.env.BACKEND_URL}/api/users/v2/api-token`);
    console.log("Method: GET");
    console.log("Headers:", JSON.stringify(headers, null, 2));

    const response = await fetch(
      `${process.env.BACKEND_URL}/api/users/v2/api-token`,
      {
        method: "GET",
        headers: headers,
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error(
        `Error fetching API token status: ${response.statusText}`
      );
    }

    // const data: ApiTokenResponse = await response.json();

    // Parse the JSON response first
    const jsonResponse = await response.json();
    console.log(
      "[fetchUserApiTokenStatus] Raw response:",
      JSON.stringify(jsonResponse, null, 2)
    );

    // Extract the encrypted payload
    const encryptedData = jsonResponse.payload;
    console.log("[fetchUserApiTokenStatus] Encrypted payload:", encryptedData);

    // Decrypt the payload
    const decryptedData = decryptWithFrontendPrivateKey(encryptedData);
    const data: ApiTokenResponse = JSON.parse(decryptedData);

    console.log(
      "[fetchUserApiTokenStatus] Received data:",
      JSON.stringify(data, null, 2)
    );

    return data;
  } catch (err) {
    console.error("[fetchUserApiTokenStatus] Error:", err);
    throw err;
  }
}

export async function updateUserApiTokens({
  defaultModel,
  geminiKey,
  openaiKey,
}: ApiTokenResponse): Promise<void> {
  const token = cookies().get("jwt")?.value;

  const ENCRYPTION_TOGGLE: boolean = true; // ALEX

  if (!token) {
    console.error("[updateUserApiTokens] No JWT token found in cookies");
    throw new Error("Not authorized. JWT cookie missing or invalid.");
  }

  if (ENCRYPTION_TOGGLE) {
    const dataToEncrypt = JSON.stringify({
      defaultModel,
      geminiKey,
      openaiKey,
    });
    const encryptedData = encryptWithBackendPublicKey(dataToEncrypt);

    try {
      const headers = {
        Cookie: `jwt=${token}`,
        "Content-Type": "application/json",
      };

      console.log("[updateUserApiTokens] Request details:");
      console.log("URL:", `${process.env.BACKEND_URL}/api/users/api-token`);
      console.log("Method: PUT");
      console.log("Headers:", JSON.stringify(headers, null, 2));
      console.log(
        "Body:",
        JSON.stringify({ defaultModel, geminiKey, openaiKey }, null, 2)
      );

      const response = await fetch(
        `${process.env.BACKEND_URL}/api/users/api-token`,
        {
          method: "PUT",
          headers: headers,
          body: JSON.stringify({
            payload: encryptedData,
          }),
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[updateUserApiTokens] Error response: ${errorText}`);
        throw new Error(`Error updating API tokens: ${response.statusText}`);
      }

      console.log("[updateUserApiTokens] Successfully updated tokens");
    } catch (err) {
      console.error("[updateUserApiTokens] Error:", err);
      throw err;
    }
  } else {
    try {
      const headers = {
        Cookie: `jwt=${token}`,
        "Content-Type": "application/json",
      };

      console.log("[updateUserApiTokens] Request details:");
      console.log("URL:", `${process.env.BACKEND_URL}/api/users/api-token`);
      console.log("Method: PUT");
      console.log("Headers:", JSON.stringify(headers, null, 2));
      console.log(
        "Body:",
        JSON.stringify({ defaultModel, geminiKey, openaiKey }, null, 2)
      );

      const response = await fetch(
        `${process.env.BACKEND_URL}/api/users/api-token`,
        {
          method: "PUT",
          headers: headers,
          body: JSON.stringify({
            defaultModel,
            geminiKey,
            openaiKey,
          }),
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[updateUserApiTokens] Error response: ${errorText}`);
        throw new Error(`Error updating API tokens: ${response.statusText}`);
      }

      console.log("[updateUserApiTokens] Successfully updated tokens");
    } catch (err) {
      console.error("[updateUserApiTokens] Error:", err);
      throw err;
    }
  }
}
