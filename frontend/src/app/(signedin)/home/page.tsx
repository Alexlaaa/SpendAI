"use client";

import { useAuth } from "@/hooks/AuthProvider";
import { useEffect, useState } from "react";
import LineChartC from "@/components/charts/linechart";
import BarChartC from "@/components/charts/barchart";
import TableC from "@/components/table/TableC";
import {
  createColumns,
  ReceiptResponse,
} from "@/components/table/transactionCols";
import { useReceipt } from "@/hooks/useReceipt";
// import AIAnalysis from "@/components/shared/AIAnalysis"; // Removed old AI component
import DonutPieChart from "@/components/charts/donutpiechart";
import { BudgetForm, BudgetFormValues } from "@/components/forms/BudgetForm";
import {
  fetchBudgetsServerAction,
  createBudgetServerAction,
  updateBudgetServerAction,
  deleteBudgetServerAction,
  Budget,
} from "@/app/api/budgets/route";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  addMonths,
  addYears,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isWithinInterval,
  parseISO,
  format,
  differenceInCalendarMonths,
  differenceInCalendarYears,
} from "date-fns";
import { BudgetProgress } from "@/components/ui/BudgetProgress";

type EditingBudgetData = BudgetFormValues & { _id: string };

const HomePage = () => {
  const { user } = useAuth();
  const { getAllReceipts } = useReceipt();
  const { toast } = useToast();

  const [receiptData, setReceiptData] = useState<ReceiptResponse[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(true);
  const [loadingBudgets, setLoadingBudgets] = useState(true);
  const [isBudgetFormOpen, setIsBudgetFormOpen] = useState(false);
  const [isSubmittingBudget, setIsSubmittingBudget] = useState(false);
  const [editingBudget, setEditingBudget] = useState<EditingBudgetData | null>(
    null
  );

  // Fetch Receipts
  useEffect(() => {
    const fetchReceipts = async () => {
      setLoadingReceipts(true);
      try {
        const data = await getAllReceipts();
        setReceiptData(data);
      } catch (error) {
        console.error("Error fetching receipts:", error);
        toast({
          title: "Error",
          description: "Could not fetch receipts.",
          variant: "destructive",
        });
      } finally {
        setLoadingReceipts(false);
      }
    };
    fetchReceipts();
  }, [getAllReceipts, toast]);

  // Fetch Budgets
  useEffect(() => {
    const loadBudgets = async () => {
      setLoadingBudgets(true);
      try {
        // Call server action to fetch budgets
        const fetchedBudgets = await fetchBudgetsServerAction();
        setBudgets(fetchedBudgets);
      } catch (error: any) {
        // Catch specific error type if possible
        console.error("Error fetching budgets:", error);
        toast({
          title: "Error",
          description: "Could not fetch budgets.",
          variant: "destructive",
        });
      } finally {
        setLoadingBudgets(false);
      }
    };
    loadBudgets();
  }, [toast]);

  const columns = createColumns();

  // --- Budget Calculation Helper ---
  const calculateSpendingForBudget = (
    budget: Budget,
    receipts: ReceiptResponse[]
  ): number => {
    const now = new Date();
    let intervalStart: Date;
    let intervalEnd: Date;
    const budgetStartDate = parseISO(budget.startDate); // Ensure budget dates are Date objects

    switch (budget.period) {
      case "monthly":
        // Find the start of the month corresponding to the budget's start date, but within the current year/month cycle
        const monthDiff = differenceInCalendarMonths(now, budgetStartDate);
        intervalStart = startOfMonth(addMonths(budgetStartDate, monthDiff));
        intervalEnd = endOfMonth(intervalStart);
        break;
      case "yearly":
        // Find the start of the year corresponding to the budget's start date, but within the current year cycle
        const yearDiff = differenceInCalendarYears(now, budgetStartDate);
        intervalStart = startOfYear(addYears(budgetStartDate, yearDiff));
        intervalEnd = endOfYear(intervalStart);
        break;
      case "custom":
        intervalStart = budgetStartDate;
        intervalEnd = budget.endDate ? parseISO(budget.endDate) : now; // Use 'now' if no end date? Or throw error? Assume valid range for now.
        break;
      default:
        return 0; // Should not happen
    }

    // Filter receipts by category (case-insensitive) and date interval
    const relevantReceipts = receipts.filter((receipt) => {
      const receiptDate = parseISO(receipt.date);
      return (
        receipt.category?.toLowerCase() === budget.category.toLowerCase() &&
        isWithinInterval(receiptDate, {
          start: intervalStart,
          end: intervalEnd,
        })
      );
    });

    // Sum the total amount
    const totalSpent = relevantReceipts.reduce((sum, receipt) => {
      const cost = parseFloat(receipt.totalCost); // Parse string to number
      return sum + (isNaN(cost) ? 0 : cost); // Add cost, handle potential NaN
    }, 0);
    return totalSpent;
  };
  // --- End Budget Calculation Helper ---

  // Handler for opening the edit dialog
  const handleEditBudgetClick = (budget: Budget) => {
    // Parse dates back to Date objects for the form
    const formData = {
      ...budget,
      startDate: parseISO(budget.startDate),
      endDate: budget.endDate ? parseISO(budget.endDate) : undefined,
    };
    setEditingBudget(formData);
    setIsBudgetFormOpen(true); // Open the dialog
  };

  // Handler for deleting a budget
  const handleDeleteBudget = async (budgetId: string) => {
    // Simple confirmation
    if (!window.confirm("Are you sure you want to delete this budget?")) {
      return;
    }

    try {
      await deleteBudgetServerAction(budgetId);
      setBudgets((prevBudgets) =>
        prevBudgets.filter((b) => b._id !== budgetId)
      ); // Remove from state
      toast({ title: "Success", description: "Budget deleted successfully." });
    } catch (error: any) {
      console.error("Error deleting budget:", error);
      toast({
        title: "Error",
        description: error.message || "Could not delete budget.",
        variant: "destructive",
      });
    }
  };

  // Combined handler for submitting the budget form (Create or Update)
  const handleBudgetSubmit = async (data: BudgetFormValues) => {
    setIsSubmittingBudget(true);
    try {
      if (editingBudget) {
        // Update existing budget
        const updatedBudget = await updateBudgetServerAction(
          editingBudget._id,
          data
        );
        setBudgets((prevBudgets) =>
          prevBudgets.map((b) =>
            b._id === updatedBudget._id ? updatedBudget : b
          )
        );
        toast({
          title: "Success",
          description: "Budget updated successfully.",
        });
      } else {
        // Create new budget
        const newBudget = await createBudgetServerAction(data);
        setBudgets((prevBudgets) => [...prevBudgets, newBudget]);
        toast({
          title: "Success",
          description: "Budget created successfully.",
        });
      }
      setIsBudgetFormOpen(false); // Close dialog
      setEditingBudget(null); // Reset editing state
    } catch (error: any) {
      console.error(
        `Error ${editingBudget ? "updating" : "creating"} budget:`,
        error
      );
      toast({
        title: "Error",
        description:
          error.message ||
          `Could not ${editingBudget ? "update" : "create"} budget.`,
        variant: "destructive",
      });
    } finally {
      setIsSubmittingBudget(false);
    }
  };

  // Handler for closing the dialog (resets editing state)
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setEditingBudget(null); // Reset editing state when dialog closes
    }
    setIsBudgetFormOpen(open);
  };

  // Combine loading states or handle separately
  const isLoading = loadingReceipts || loadingBudgets;

  return (
    <div className="flex flex-col w-full gap-4 px-1 py-4">
      {isLoading ? (
        <div className="flex justify-center items-center w-full h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
        </div>
      ) : (
        <>
          {/* Budget Section Placeholder */}
          <div className="bg-card p-4 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Budget Overview</h2>
              <Dialog open={isBudgetFormOpen} onOpenChange={handleDialogClose}>
                <DialogTrigger asChild>
                  {/* Keep the main "Set New Budget" button */}
                  <Button onClick={() => setEditingBudget(null)}>
                    Set New Budget
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    {/* Dynamic Dialog Title */}
                    <DialogTitle>
                      {editingBudget ? "Edit Budget" : "Create Budget"}
                    </DialogTitle>
                  </DialogHeader>
                  {/* Pass initialData only when editing */}
                  <BudgetForm
                    onSubmit={handleBudgetSubmit}
                    isLoading={isSubmittingBudget}
                    initialData={editingBudget ?? undefined}
                    // Pass delete handler only when editing
                    onDelete={
                      editingBudget
                        ? () => handleDeleteBudget(editingBudget._id)
                        : undefined
                    }
                  />
                </DialogContent>
              </Dialog>
            </div>
            {/* Budget Display */}
            {loadingBudgets ? (
              <p>Loading budgets...</p>
            ) : budgets.length > 0 ? (
              <ul className="space-y-2">
                {" "}
                {budgets.map((budget) => {
                  const spent = calculateSpendingForBudget(budget, receiptData);
                  const remaining = budget.amount - spent;
                  // Removed duplicate declarations below
                  const isOverBudget = remaining < 0;
                  // Determine variant based on spending percentage
                  const percentage =
                    budget.amount === 0 ? 0 : (spent / budget.amount) * 100;
                  let variant: "default" | "success" | "warning" | "danger" =
                    "default";
                  if (percentage > 100) variant = "danger";
                  else if (percentage >= 75) variant = "warning";
                  else if (percentage >= 0) variant = "success"; // Use success for under 75%

                  return (
                    <li key={budget._id} className="p-3 border rounded-lg">
                      <BudgetProgress
                        current={spent}
                        total={budget.amount}
                        label={`${budget.category} (${budget.period})`}
                        variant={variant}
                        showAmount={true}
                        showPercentage={true}
                        // Pass edit handler to BudgetProgress
                        onEditClick={() => handleEditBudgetClick(budget)}
                      />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>No budgets set yet.</p>
            )}
          </div>{" "}
          {/* Existing Charts and Table */}
          <div className="flex flex-col md:flex-row gap-4 w-full">
            {" "}
            <div className="w-full md:w-1/2 flex-grow bg-card p-4 rounded-lg shadow">
              <LineChartC data={receiptData} />
            </div>
            <div className="w-full md:w-1/2 flex-grow bg-card p-4 rounded-lg shadow">
              <DonutPieChart data={receiptData} />
            </div>
          </div>
          <div className="w-full flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-1/2 bg-card p-4 rounded-lg shadow">
              <BarChartC data={receiptData} />
            </div>
            <div className="w-full md:w-1/2 bg-card p-4 rounded-lg shadow">
              <TableC columns={columns} data={receiptData} displayRows={5} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default HomePage;
