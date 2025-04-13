"use client";

import * as React from "react";
import { useState } from "react"; // Import useState
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format, startOfMonth } from "date-fns"; // Import startOfMonth
import { CalendarIcon, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";

// Define budget periods matching the backend enum
const BudgetPeriodEnum = z.enum(["monthly", "yearly", "custom"]);

// Define categories matching the backend enum
const CategoryEnum = z.enum([
  "Transport",
  "Clothing",
  "Healthcare",
  "Food",
  "Leisure",
  "Housing",
  "Others",
]);
export type Category = z.infer<typeof CategoryEnum>;
const categoryOptions = CategoryEnum.options;

const budgetFormSchema = z
  .object({
    category: CategoryEnum,
    amount: z.coerce.number().positive({ message: "Amount must be positive." }), // Coerce to number
    period: BudgetPeriodEnum,
    startDate: z.date({ required_error: "Start date is required." }),
    endDate: z.date().optional(),
  })
  .refine(
    (data) => {
      // Require endDate only if period is 'custom'
      if (data.period === "custom" && !data.endDate) {
        return false;
      }
      // Ensure endDate is after startDate if both exist
      if (data.endDate && data.startDate && data.endDate <= data.startDate) {
        return false;
      }
      return true;
    },
    {
      message:
        "End date is required for custom period and must be after start date.",
      path: ["endDate"],
    }
  );

export type BudgetFormValues = z.infer<typeof budgetFormSchema>;

const defaultValues: Partial<BudgetFormValues> = {
  category: undefined,
  // amount: 0,
  period: "monthly",
  startDate: new Date(),
};

interface BudgetFormProps {
  onSubmit: (data: BudgetFormValues) => void;
  initialData?: Partial<BudgetFormValues>;
  isLoading?: boolean;
  onDelete?: () => void;
}

export function BudgetForm({
  onSubmit,
  initialData = defaultValues,
  isLoading = false,
  onDelete,
}: BudgetFormProps) {
  // State for controlling Popover open status (only EndDate needed now)
  const [isEndDatePopoverOpen, setIsEndDatePopoverOpen] = useState(false);

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: initialData,
    mode: "onChange",
  });

  const watchPeriod = form.watch("period");

  function handleFormSubmit(data: BudgetFormValues) {
    // Calculate start date as the first day of the current month
    const calculatedStartDate = startOfMonth(new Date());
    const submissionData = {
      ...data,
      startDate: calculatedStartDate,
    };
    console.log("Submitting budget data:", submissionData);
    onSubmit(submissionData); // Pass data with calculated start date
  }

  function onError(errors: any) {
    console.error("Form validation errors:", errors);
    toast({
      title: "Validation Error",
      description: "Please check the form fields for errors.",
      variant: "destructive",
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleFormSubmit, onError)}
        className="space-y-6"
      >
        {/* Category Dropdown */}
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categoryOptions.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Amount */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (S$)</FormLabel>
              <FormControl>
                {/* Use valueAsNumber or parse manually to avoid leading zero issues */}
                <Input
                  type="number"
                  placeholder="e.g., 500"
                  {...field}
                  onChange={(event) => {
                    // Check if value is empty string or just '-', handle appropriately
                    if (
                      event.target.value === "" ||
                      event.target.value === "-"
                    ) {
                      field.onChange(event.target.value); // Allow empty or negative sign temporarily
                    } else {
                      field.onChange(event.target.valueAsNumber); // Use valueAsNumber for direct number conversion
                    }
                  }}
                  value={
                    field.value === 0 && form.formState.dirtyFields.amount
                      ? ""
                      : field.value
                  } // Show empty string if user cleared the default 0
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Period */}
        <FormField
          control={form.control}
          name="period"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Period</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select budget period" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Start Date Field Removed */}

        {/* End Date (Conditional) */}
        {watchPeriod === "custom" && (
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>End Date</FormLabel>
                 {/* Control Popover open state */}
                <Popover open={isEndDatePopoverOpen} onOpenChange={setIsEndDatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={isLoading}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick an end date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-auto p-0"
                    align="start"
                    onInteractOutside={(e) => {
                      e.preventDefault(); // Prevent closing Dialog when interacting with Calendar
                    }}
                  >
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date, selectedDay, activeModifiers, e) => {
                        field.onChange(date); // Update form value
                        setIsEndDatePopoverOpen(false); // Explicitly close popover
                        e?.stopPropagation(); // Keep stopping propagation just in case
                      }}
                      disabled={(date) =>
                        // Disable dates before the calculated start of the current month
                        date <= startOfMonth(new Date()) || isLoading
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="flex justify-between items-center">
          {" "}
          {/* Footer for buttons */}
          <Button type="submit" disabled={isLoading}>
            {isLoading
              ? "Saving..."
              : initialData?.category
              ? "Update Budget"
              : "Create Budget"}
          </Button>
          {/* Conditionally render Delete button in edit mode */}
          {initialData?.category && onDelete && (
            <Button
              type="button" // Important: prevent form submission
              variant="destructive"
              onClick={onDelete}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4 mr-2" /> Delete
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
