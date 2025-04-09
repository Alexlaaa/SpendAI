"use client";

import { buttonVariants } from "@/components/ui/button2";
import { Label2 } from "@/components/ui/label2";
import { Switch } from "@/components/ui/switch";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Check, Star, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import confetti from "canvas-confetti";
import NumberFlow from "@number-flow/react";
import PaymentModal from "@/components/modals/PaymentModal";
import DowngradeConfirmationModal from "@/components/modals/DowngradeConfirmationModal";
import { Button2 } from "@/components/ui/button2";

// Define Tier type matching backend/frontend usage
type Tier = "tier1" | "tier2" | "tier3";

interface PricingPlan {
  name: string; // e.g., "Tier 1"
  price: string;
  yearlyPrice: string;
  period: string;
  features: string[];
  description: string;
  buttonText: string;
  href: string;
  isPopular: boolean;
}

interface PricingProps {
  plans: PricingPlan[];
  title?: string;
  description?: string;
  currentTier?: Tier;
  currentBillingCycle?: "monthly" | "annual";
  onChoosePlan?: (tier: Tier, cycle: "monthly" | "annual") => Promise<void>;
  loadingTier?: string | null;
}

export function Pricing({
  plans,
  title = "Simple, Transparent Pricing",
  description = "Choose the plan that works for you\nAll plans include access to our platform, lead generation tools, and dedicated support.",
  currentTier,
  currentBillingCycle,
  onChoosePlan,
  loadingTier,
}: PricingProps) {
  const [isMonthly, setIsMonthly] = useState(true);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const switchRef = useRef<HTMLButtonElement>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isDowngradeModalOpen, setIsDowngradeModalOpen] = useState(false);
  const [selectedPlanForModal, setSelectedPlanForModal] =
    useState<PricingPlan | null>(null);

  // Tier order for comparison
  const tierOrder: Record<Tier, number> = { tier1: 1, tier2: 2, tier3: 3 };

  const handleToggle = (checked: boolean) => {
    setIsMonthly(!checked);
    if (checked && switchRef.current) {
      const rect = switchRef.current.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top + rect.height / 2;

      confetti({
        particleCount: 50,
        spread: 60,
        origin: {
          x: x / window.innerWidth,
          y: y / window.innerHeight,
        },
        colors: [
          "hsl(var(--primary))",
          "hsl(var(--accent))",
          "hsl(var(--secondary))",
          "hsl(var(--muted))",
        ],
        ticks: 200,
        gravity: 1.2,
        decay: 0.94,
        startVelocity: 30,
        shapes: ["circle"],
      });
    }
  };

  // Helper to get tier key from plan name (e.g., "Tier 1" -> "tier1")
  const getTierKey = (planName: string): Tier => {
    return planName.toLowerCase().replace(" ", "") as Tier;
  };

  // Renamed to handleChoosePlanClick for clarity
  const handleChoosePlanClick = (plan: PricingPlan) => {
    setSelectedPlanForModal(plan);
    const targetTier = getTierKey(plan.name);
    const targetBillingCycle = isMonthly ? "monthly" : "annual";

    // Determine action: Upgrade, Downgrade, Cycle Change, or No Change
    if (currentTier && targetTier === currentTier) {
      // Same Tier: Check for billing cycle change
      if (currentBillingCycle && targetBillingCycle !== currentBillingCycle) {
        // Billing cycle change (treat as upgrade for payment)
        setIsPaymentModalOpen(true);
      }
      // If cycle also matches, button should be disabled (handled below), do nothing here.
    } else if (currentTier && tierOrder[targetTier] < tierOrder[currentTier]) {
      // Different Tier: Downgrade
      setIsDowngradeModalOpen(true);
    } else {
      // Different Tier: Upgrade (or no current tier)
      setIsPaymentModalOpen(true);
    }
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setSelectedPlanForModal(null);
  };

  const handleCloseDowngradeModal = () => {
    setIsDowngradeModalOpen(false);
    setSelectedPlanForModal(null);
  };

  // This function is passed to BOTH modals as the final action after confirmation/payment
  // It now needs the target billing cycle as well
  const handleConfirmTierChange = async (
    tier: Tier,
    cycle: "monthly" | "annual"
  ) => {
    if (onChoosePlan) {
      await onChoosePlan(tier, cycle);
    }
    // Modals handle closing themselves after success simulation
  };

  return (
    <div className="container py-20">
      <div className="text-center space-y-4 mb-12">
        <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {title}
        </h2>
        <p className="text-muted-foreground text-lg whitespace-pre-line">
          {description}
        </p>
      </div>

      {/* Only show toggle if there are non-free plans */}
      {plans.some((p) => p.price !== "0") && (
        <div className="flex justify-center mb-10">
          <label className="relative inline-flex items-center cursor-pointer">
            <Label2>
              <Switch
                ref={switchRef as any}
                checked={!isMonthly}
                onCheckedChange={handleToggle}
                className="relative"
              />
            </Label2>
          </label>
          <span className="ml-2 font-semibold">
            Annual billing <span className="text-primary">(Save ~20%)</span>
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 sm:2 gap-4">
        {plans.map((plan, index) => {
          const tierKey = getTierKey(plan.name);
          const isCurrentPlan = currentTier === tierKey;
          const isLoading = loadingTier === tierKey;
          const isFreePlan = plan.price === "0";

          let buttonText = plan.buttonText;
          if (isCurrentPlan) {
            buttonText = "Current Plan";
          } else if (isLoading) {
            buttonText = "Processing...";
          }

          // Determine if the *specific* plan option (tier + displayed cycle) is the current one
          const displayedBillingCycle = isMonthly ? "monthly" : "annual";
          const isCurrentPlanAndCycle =
            isCurrentPlan && currentBillingCycle === displayedBillingCycle;

          // Disable if it's the exact current plan/cycle OR if any tier change is loading
          // OR if it's the free plan and the user is currently on it (regardless of cycle)
          const isDisabled =
            isCurrentPlanAndCycle ||
            (isFreePlan && isCurrentPlan) ||
            !!loadingTier;

          // Adjust button text only for non-free plans if the cycle differs
          if (isCurrentPlan && !isCurrentPlanAndCycle && !isFreePlan) {
            buttonText = `Switch to ${
              displayedBillingCycle === "monthly" ? "Monthly" : "Annual"
            }`;
          } else if (isCurrentPlanAndCycle || (isCurrentPlan && isFreePlan)) {
            // Keep "Current Plan" if tier/cycle match OR if it's the free plan
            buttonText = "Current Plan";
          }

          return (
            <motion.div
              key={index}
              initial={{ y: 50, opacity: 1 }}
              whileInView={
                isDesktop
                  ? {
                      y: plan.isPopular ? -20 : 0,
                      opacity: 1,
                      x: index === 2 ? -30 : index === 0 ? 30 : 0,
                      scale: index === 0 || index === 2 ? 0.94 : 1.0,
                    }
                  : {}
              }
              viewport={{ once: true }}
              transition={{
                duration: 1.6,
                type: "spring",
                stiffness: 100,
                damping: 30,
                delay: 0.4,
                opacity: { duration: 0.5 },
              }}
              className={cn(
                `rounded-2xl border-[1px] p-6 bg-background text-center lg:flex lg:flex-col lg:justify-center relative`,
                plan.isPopular ? "border-primary border-2" : "border-border",
                "flex flex-col",
                !plan.isPopular && "mt-5", // Adjust margin based on popularity
                index === 0 || index === 2
                  ? "z-0 transform translate-x-0 translate-y-0 -translate-z-[50px] rotate-y-[10deg]"
                  : "z-10",
                index === 0 && "origin-right",
                index === 2 && "origin-left"
              )}
            >
              {plan.isPopular && (
                <div className="absolute top-0 right-0 bg-primary py-0.5 px-2 rounded-bl-xl rounded-tr-xl flex items-center">
                  <Star className="text-primary-foreground h-4 w-4 fill-current" />
                  <span className="text-primary-foreground ml-1 font-sans font-semibold">
                    Popular
                  </span>
                </div>
              )}
              <div className="flex-1 flex flex-col">
                <p className="text-base font-semibold text-muted-foreground">
                  {plan.name}
                </p>
                <div className="mt-6 flex items-center justify-center gap-x-2">
                  {isFreePlan ? (
                    <span className="text-5xl font-bold tracking-tight text-foreground">
                      Free
                    </span>
                  ) : (
                    <>
                      <span className="text-5xl font-bold tracking-tight text-foreground">
                        <NumberFlow
                          value={
                            isMonthly
                              ? Number(plan.price)
                              : Number(plan.yearlyPrice)
                          }
                          format={{
                            style: "currency",
                            currency: "SGD",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }}
                          transformTiming={{
                            duration: 500,
                            easing: "ease-out",
                          }}
                          willChange
                          className="font-variant-numeric: tabular-nums"
                        />
                      </span>
                      {plan.period !== "Next 3 months" && ( // Condition might need adjustment based on plan data
                        <span className="text-sm font-semibold leading-6 tracking-wide text-muted-foreground">
                          / {isMonthly ? "month" : "year"}
                        </span>
                      )}
                    </>
                  )}
                </div>

                {!isFreePlan && (
                  <p className="text-xs leading-5 text-muted-foreground mt-1">
                    {isMonthly ? "billed monthly" : "billed annually"}
                  </p>
                )}

                <ul className="mt-5 gap-2 flex flex-col">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
                      <span className="text-left">{feature}</span>
                    </li>
                  ))}
                </ul>

                <hr className="w-full my-4" />

                <Button2
                  // Determine which modal to open based on upgrade/downgrade/cycle change
                  onClick={() => handleChoosePlanClick(plan)} // Allow click even if current tier, logic inside handles it
                  disabled={isDisabled} // Use updated isDisabled logic
                  className={cn(
                    buttonVariants({
                      // Use secondary variant only if tier AND cycle match current
                      variant: isCurrentPlanAndCycle ? "secondary" : "outline",
                    }),
                    "group relative w-full gap-2 overflow-hidden text-lg font-semibold tracking-tighter",
                    "transform-gpu ring-offset-current transition-all duration-300 ease-out",
                    // Apply hover only if not the exact current plan/cycle
                    !isCurrentPlanAndCycle &&
                      "hover:ring-2 hover:ring-primary hover:ring-offset-1 hover:bg-primary hover:text-primary-foreground",
                    // Style popular plan button differently if not current plan/cycle
                    plan.isPopular && !isCurrentPlanAndCycle
                      ? "bg-primary text-primary-foreground"
                      : isCurrentPlanAndCycle
                      ? "cursor-default" // Style for current plan/cycle
                      : "bg-background text-foreground" // Default style
                  )}
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {buttonText}
                </Button2>
                <p className="mt-6 text-xs leading-5 text-muted-foreground">
                  {plan.description}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Render the Payment Modal (for upgrades) */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={handleClosePaymentModal}
        plan={selectedPlanForModal}
        isMonthly={isMonthly}
        // Pass the target cycle along with the tier
        onSuccess={(tier) =>
          handleConfirmTierChange(tier, isMonthly ? "monthly" : "annual")
        }
      />

      {/* Render the Downgrade Confirmation Modal */}
      <DowngradeConfirmationModal
        isOpen={isDowngradeModalOpen}
        onClose={handleCloseDowngradeModal}
        planName={selectedPlanForModal?.name}
        currentTierName={
          plans.find((p) => getTierKey(p.name) === currentTier)?.name
        } // Find current plan name
        onConfirm={async () => {
          if (selectedPlanForModal) {
            // Pass the target cycle along with the tier
            await handleConfirmTierChange(
              getTierKey(selectedPlanForModal.name),
              isMonthly ? "monthly" : "annual" // Pass the displayed cycle
            );
          } else {
            console.error(
              "Cannot confirm downgrade/cycle change: selected plan is null."
            );
          }
        }}
      />
    </div>
  );
}
