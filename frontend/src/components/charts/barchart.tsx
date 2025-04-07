'use client';

import React, { useMemo, useState, useEffect } from "react";
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReceiptResponse } from "@/components/table/transactionCols";
import moment from "moment";

const generateMonthOptions = () => {
  const months = [];
  const now = moment();

  for (let i = 0; i < 12; i++) {
    months.push(now.format('MMMM YYYY'));
    now.subtract(1, 'month');
  }

  return months;
};

interface ChartDataPoint {
  category: string;
  total: number;
}

interface BarChartCProps {
  data: ReceiptResponse[];
}

export default function BarChartC({ data }: BarChartCProps): JSX.Element {
  const [timeFilter, setTimeFilter] = useState<string>('6m');
  const [filteredData, setFilteredData] = useState<ReceiptResponse[]>(data);

  useEffect(() => {
    const now = moment();
    let filteredReceipts: ReceiptResponse[];

    if (timeFilter === '6m') {
      filteredReceipts = data.filter(receipt => moment(receipt.date).isAfter(now.clone().subtract(6, 'months')));
    } else if (timeFilter === '3m') {
      filteredReceipts = data.filter(receipt => moment(receipt.date).isAfter(now.clone().subtract(3, 'months')));
    } else if (timeFilter === '2m') {
      filteredReceipts = data.filter(receipt => moment(receipt.date).isAfter(now.clone().subtract(2, 'months')));
    } else {
      const [monthName, year] = timeFilter.split(' ');
      filteredReceipts = data.filter(receipt => {
        const receiptDate = moment(receipt.date);
        return receiptDate.format('MMMM') === monthName && receiptDate.format('YYYY') === year;
      });
    }

    setFilteredData(filteredReceipts);
  }, [timeFilter, data]);

  const chartData: ChartDataPoint[] = useMemo(() => {
    const categoryTotals: { [key: string]: number } = filteredData.reduce((acc, receipt) => {
      if (!acc[receipt.category]) {
        acc[receipt.category] = 0;
      }
      acc[receipt.category] += parseFloat(receipt.totalCost);
      return acc;
    }, {} as { [key: string]: number });

    return Object.entries(categoryTotals)
      .map(([category, total]) => ({
        category,
        total,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredData]);

  const monthOptions = generateMonthOptions();

  return (
    <Card className="w-full bg-transparent border-slate-200 border-2">
      <CardHeader>
        <CardTitle>
          Spending by Category for {timeFilter === '6m'
            ? 'Past 6 Months'
            : timeFilter === '3m'
              ? 'Past 3 Months'
              : timeFilter === '2m'
                ? 'Past 2 Months'
                : timeFilter}
        </CardTitle>
        <CardDescription>Total spending by category</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-start mb-4">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="border border-gray-300 rounded p-2"
          >
            <option value="6m">Past 6 Months</option>
            <option value="3m">Past 3 Months</option>
            <option value="2m">Past 2 Months</option>
            {monthOptions.map((month, index) => (
              <option key={index} value={month}>
                {month}
              </option>
            ))}
          </select>
        </div>

        {chartData.length === 0 ? (
          <div className="text-center text-gray-500">No data available for the selected period</div>
        ) : (
          <ResponsiveContainer width="100%" height={450}>
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
              <XAxis
                dataKey="category"
                angle={-45}
                textAnchor="end"
                interval={0}
                style={{ fontWeight: 'bold' }}
              />
              <YAxis tickFormatter={(value: number) => `$${value.toFixed(0)}`} />
              <Tooltip
                formatter={(value: number) => [`$${value.toFixed(2)}`, "Total"]}
                labelFormatter={(label: string) => `Category: ${label}`}
              />
              <Bar dataKey="total" fill="#89ca9d" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
