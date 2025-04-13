"use client"; // Add use client directive

import React, { useState } from "react"; // Remove useEffect
import { Pricing } from "@/components/blocks/pricing";
import { pricingPlans } from "@/constants";
// Import User type and useAuth hook
import { useAuth, User } from "@/hooks/AuthProvider";
// Removed getLoggedInUser import as we use refreshUser from context
import { updateUserTier } from "@/app/actions/settings";
import { useToast } from "@/hooks/use-toast";

// Define Tier type locally
type Tier = "tier1" | "tier2" | "tier3";

const PricingPage = () => {
  // Get user and refreshUser from context
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  // Remove local currentUser state
  const [loadingTier, setLoadingTier] = useState<Tier | null>(null);

  // Update handleChoosePlan to accept cycle
  const handleChoosePlan = async (
    newTier: Tier,
    newCycle: "monthly" | "annual"
  ) => {
    // Use user directly from context
    // Check if both tier and cycle match the current ones
    if (!user || (user.tier === newTier && user.billingCycle === newCycle)) {
      return; // Do nothing if no user or already on this tier/cycle combination
    }

    setLoadingTier(newTier); // Set loading state for the clicked button
    try {
      // Pass both tier and billingCycle to the API call
      const updateResult = await updateUserTier({
        tier: newTier,
        billingCycle: newCycle,
      });

      if (updateResult.success) {
        // Call refreshUser from context to update global state
        await refreshUser(); // Refresh user data to get updated tier and cycle
        toast({
          title: "Success!",
          description: `Successfully updated to ${newTier} (${newCycle}).`, // Include cycle in message
          variant: "default",
        });
      } else {
        throw new Error(updateResult.error || "Failed to update tier.");
      }
    } catch (error: any) {
      console.error("Failed to update tier:", error);
      toast({
        title: "Error",
        description: error.message || "Could not update subscription tier.",
        variant: "destructive",
      });
    } finally {
      setLoadingTier(null); // Reset loading state
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Pricing
        plans={pricingPlans}
        currentTier={user?.tier}
        currentBillingCycle={user?.billingCycle}
        onChoosePlan={handleChoosePlan}
        loadingTier={loadingTier}
      />
    </div>
  );
};

export default PricingPage;
