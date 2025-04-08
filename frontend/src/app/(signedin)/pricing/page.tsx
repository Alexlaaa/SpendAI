import React from "react";
import { Pricing } from "@/components/blocks/pricing";
import { pricingPlans } from "@/constants";

const PricingPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <Pricing plans={pricingPlans} />
      {/* TODO: Implement actual signup/upgrade logic */}
    </div>
  );
};

export default PricingPage;
