"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { CheckCircle, CreditCard, QrCode, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import NumberFlow from "@number-flow/react";

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

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: PricingPlan | null;
  isMonthly: boolean;
  onSuccess: (tier: Tier) => Promise<void>; // Make onSuccess async to handle API call
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  plan,
  isMonthly,
  onSuccess,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<"card" | "paynow">("card");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes in seconds
  const [timerActive, setTimerActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const getTierKey = (planName: string | undefined): Tier => {
    return (planName?.toLowerCase().replace(" ", "") ?? "tier1") as Tier;
  };

  const selectedTier = getTierKey(plan?.name);
  const price = plan
    ? isMonthly
      ? Number(plan.price)
      : Number(plan.yearlyPrice)
    : 0;
  const planDisplayName = `${isMonthly ? "Monthly" : "Annual"} ${plan?.name}`;

  // Timer logic for PayNow
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timerActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerActive) {
      setTimerActive(false);
      console.log("PayNow timer expired");
    }

    // Simulate success after 10 seconds (timer reaches 4:50 or 290 seconds)
    if (timerActive && timeLeft === 290) {
      handlePaymentSuccess();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerActive, timeLeft]);

  const handlePaymentSuccess = useCallback(async () => {
    if (!plan) return;
    setIsProcessing(true);
    setTimerActive(false); // Stop timer on success
    try {
      await onSuccess(selectedTier);
      setPaymentSuccess(true);
      // Keep modal open for a bit to show success, then close
      setTimeout(() => {
        onClose();
        // Reset state for next time
        setPaymentSuccess(false);
        setIsProcessing(false);
        setCardNumber("");
        setExpiry("");
        setCvv("");
        setTimeLeft(300);
      }, 2000); // Close after 2 seconds
    } catch (error) {
      console.error("Payment processing failed:", error);
      // Handle error display if needed
      setIsProcessing(false);
    }
  }, [plan, onSuccess, selectedTier, onClose]);

  const handleCardPayment = () => {
    // Validation removed for simulation
    handlePaymentSuccess();
  };

  const handlePayNowStart = () => {
    setTimeLeft(300); // Reset timer
    setTimerActive(true);
  };

  // Reset state when modal is closed or plan changes
  useEffect(() => {
    if (!isOpen) {
      setPaymentMethod("card");
      setCardNumber("");
      setExpiry("");
      setCvv("");
      setTimeLeft(300);
      setTimerActive(false);
      setIsProcessing(false);
      setPaymentSuccess(false);
    } else if (paymentMethod === "paynow" && !timerActive && !paymentSuccess) {
      // Start timer automatically if PayNow tab is selected and modal opens
      handlePayNowStart();
    }
  }, [isOpen, plan, paymentMethod, paymentSuccess, timerActive]); // Added dependencies

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  };

  if (!plan) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Complete Your Purchase</DialogTitle>
          <DialogDescription>
            You are subscribing to the{" "}
            <span className="font-semibold text-primary">
              {planDisplayName}
            </span>{" "}
            plan for{" "}
            <span className="font-semibold text-primary">
              S$
              <NumberFlow
                value={price}
                format={{
                  style: "decimal",
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }}
                className="font-variant-numeric: tabular-nums"
              />
              /{isMonthly ? "month" : "year"}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        {paymentSuccess ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Payment Successful!</h3>
            <p className="text-muted-foreground">
              Your subscription to {planDisplayName} is now active.
            </p>
          </div>
        ) : isProcessing ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              Processing Payment...
            </h3>
            <p className="text-muted-foreground">Please wait.</p>
          </div>
        ) : (
          <Tabs
            value={paymentMethod}
            onValueChange={(value) =>
              setPaymentMethod(value as "card" | "paynow")
            }
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="card">
                <CreditCard className="mr-2 h-4 w-4" />
                Card
              </TabsTrigger>
              <TabsTrigger value="paynow">
                <QrCode className="mr-2 h-4 w-4" />
                PayNow
              </TabsTrigger>
            </TabsList>

            {/* Card Payment Tab */}
            <TabsContent value="card">
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="card-number">Card Number</Label>
                  <Input
                    id="card-number"
                    placeholder="0000 0000 0000 0000"
                    value={cardNumber}
                    onChange={(e) => {
                      const inputVal = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 16); // Remove non-digits and limit length
                      const formattedVal = inputVal
                        .replace(/(.{4})/g, "$1 ")
                        .trim(); // Add spaces every 4 digits
                      setCardNumber(formattedVal);
                    }}
                    maxLength={19} // 16 digits + 3 spaces
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiry">Expiry Date</Label>
                    <Input
                      id="expiry"
                      placeholder="MM/YY"
                      value={expiry}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\D/g, "").slice(0, 4);
                        if (val.length > 2) {
                          val = val.slice(0, 2) + "/" + val.slice(2);
                        }
                        setExpiry(val);
                      }}
                      maxLength={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvv">CVV</Label>
                    <Input
                      id="cvv"
                      placeholder="123"
                      value={cvv}
                      onChange={(e) =>
                        setCvv(e.target.value.replace(/\D/g, "").slice(0, 3))
                      }
                      maxLength={3}
                      type="password"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCardPayment}
                  className="w-full"
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Pay S$
                  <NumberFlow
                    value={price}
                    format={{
                      style: "decimal", // Use decimal for S$ prefix
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }}
                    className="font-variant-numeric: tabular-nums ml-1"
                  />
                </Button>
              </DialogFooter>
            </TabsContent>

            {/* PayNow Tab */}
            <TabsContent value="paynow">
              <div className="flex flex-col items-center space-y-4 py-4">
                <p className="text-center text-muted-foreground">
                  Scan the QR code with your banking app to complete the
                  payment.
                </p>
                <div className="relative w-48 h-48 border rounded-md overflow-hidden">
                  <Image
                    src="/images/paynow-qr.svg"
                    alt="PayNow QR Code"
                    layout="fill"
                    objectFit="contain"
                  />
                </div>
                <div
                  className={cn(
                    "text-center font-mono text-2xl font-semibold",
                    timeLeft <= 60 ? "text-destructive" : "text-foreground"
                  )}
                >
                  Time left: {formatTime(timeLeft)}
                </div>
                {!timerActive && timeLeft > 0 && (
                  <Button
                    onClick={handlePayNowStart}
                    variant="outline"
                    disabled={isProcessing}
                  >
                    Restart Timer
                  </Button>
                )}
                {!timerActive && timeLeft === 0 && (
                  <p className="text-destructive text-sm">
                    Payment time expired. Please try again.
                  </p>
                )}
              </div>
              {/* No explicit pay button for PayNow, success is triggered by timer */}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={onClose}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentModal;
