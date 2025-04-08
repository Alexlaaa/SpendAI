'use client';

import React, { useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReceiptResponse } from "@/components/table/transactionCols";
import { Button2 } from "../ui/button2";

interface ChartDataPoint {
  monthYear: string;
  totalSpent: number;
}

interface LineChartCProps {
  data: ReceiptResponse[];
}

export default function LineChartC({ data }: LineChartCProps): JSX.Element {
  const [timeRange, setTimeRange] = useState<"2m" | "3m" | "6m" | "1y">("6m");

  const { chartData, filterDate, today, missingMonths } = useMemo(() => {
    const groupedData: { [key: string]: ChartDataPoint } = data.reduce((acc, receipt) => {
      const date = new Date(receipt.date);
      const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
      if (!acc[monthYear]) {
        acc[monthYear] = { monthYear, totalSpent: 0 };
      }
      acc[monthYear].totalSpent += parseFloat(receipt.totalCost);
      return acc;
    }, {} as { [key: string]: ChartDataPoint });

    let filteredData = Object.values(groupedData).sort((a, b) =>
      new Date(`${a.monthYear.split('/')[1]}-${a.monthYear.split('/')[0]}-01`).getTime() -
      new Date(`${b.monthYear.split('/')[1]}-${b.monthYear.split('/')[0]}-01`).getTime()
    );

    const today = new Date();
    const timeRanges = {
      "2m": new Date(today.getFullYear(), today.getMonth() - 2, 1),
      "3m": new Date(today.getFullYear(), today.getMonth() - 3, 1),
      "6m": new Date(today.getFullYear(), today.getMonth() - 6, 1),
      "1y": new Date(today.getFullYear() - 1, today.getMonth(), 1),
    };

    const filterDate = timeRanges[timeRange];
    filteredData = filteredData.filter((entry) => {
      const [month, year] = entry.monthYear.split('/');
      const entryDate = new Date(Number(year), Number(month) - 1, 1);
      return entryDate >= filterDate && entryDate <= today;
    });

    // Find missing months in the filtered range
    const missingMonths: string[] = [];
    for (let d = new Date(filterDate); d <= today; d.setMonth(d.getMonth() + 1)) {
      const monthYear = `${d.getMonth() + 1}/${d.getFullYear()}`;
      if (!filteredData.some((entry) => entry.monthYear === monthYear)) {
        missingMonths.push(d.toLocaleDateString('default', { month: 'short', year: 'numeric' }));
      }
    }

    return { chartData: filteredData, filterDate, today, missingMonths };
  }, [data, timeRange]);

  const formatMonthYear = (monthYear: string) => {
    const [month, year] = monthYear.split('/');
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleString('default', { month: 'short' });
  };

  const startDate = filterDate.toLocaleDateString('default', { month: 'long', year: 'numeric' });
  const endDate = today.toLocaleDateString('default', { month: 'long', year: 'numeric' });

  // Format missing months message
  const missingDataMessage =
    missingMonths.length === 0
      ? ""
      : missingMonths.length <= 2
        ? `No data available for: ${missingMonths.join(", ")}`
        : `No data available from ${missingMonths[0]} to ${missingMonths[missingMonths.length - 1]}`;

  return (
    <Card className="w-full bg-transparent border-slate-200 border-2">
      <CardHeader>
        <CardTitle>Monthly Spending Trend</CardTitle>
        <CardDescription>Total spending by month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap justify-start gap-2 mb-4 pb-2">
          <Button2
            variant={timeRange === "2m" ? "default" : "outline"}
            onClick={() => setTimeRange("2m")}
            className="p-2 border border-gray-300 rounded w-full sm:w-auto"
            disabled={timeRange === "2m"}
          >
            Past 2 Months
          </Button2>
          <Button2
            variant={timeRange === "3m" ? "default" : "outline"}
            onClick={() => setTimeRange("3m")}
            className="p-2 border border-gray-300 rounded w-full sm:w-auto"
            disabled={timeRange === "3m"}
          >
            Past 3 Months
          </Button2>
          <Button2
            variant={timeRange === "6m" ? "default" : "outline"}
            onClick={() => setTimeRange("6m")}
            className="p-2 border border-gray-300 rounded w-full sm:w-auto"
            disabled={timeRange === "6m"}
          >
            Past 6 Months
          </Button2>
          <Button2
            variant={timeRange === "1y" ? "default" : "outline"}
            onClick={() => setTimeRange("1y")}
            className="p-2 border border-gray-300 rounded w-full sm:w-auto"
            disabled={timeRange === "1y"}
          >
            Past 1 Year
          </Button2>
        </div>

        {chartData.length === 0 ? (
          <div className="text-center text-gray-500">
            No data available from {startDate} to {endDate}
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="monthYear"
                  tickFormatter={formatMonthYear}
                  tick={{ fontWeight: 'bold' }}
                  tickMargin={10}
                />
                <YAxis tickFormatter={(value: number) => `$${value.toFixed(0)}`} />
                <Tooltip
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Total Spent"]}
                  labelFormatter={(label: string) => `Month: ${formatMonthYear(label)}`}
                />
                <Line type="monotone" dataKey="totalSpent" stroke="#8884d8" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
            {missingDataMessage && (
              <div className="text-center text-gray-500 mt-2">
                {missingDataMessage}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
