"use client";

import * as React from "react";
import { Pie, PieChart, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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

const COLORS = [
  '#2E86C1', '#C0392B', '#239B56', '#8E44AD', '#D68910',
  '#1F618D', '#A93226', '#117A65', '#B9770E', '#6E2C00'
];

interface DonutPieChartProps {
  data: ReceiptResponse[];
}

export default function DonutPieChart({ data }: DonutPieChartProps) {
  const [timeFilter, setTimeFilter] = React.useState<string>('6m');
  const [filteredData, setFilteredData] = React.useState<ReceiptResponse[]>(data);
  const [chartSize, setChartSize] = React.useState({ innerRadius: 80, outerRadius: 120 });
  const [isMobile, setIsMobile] = React.useState<boolean>(false);

  React.useEffect(() => {
    const now = moment();
    const endOfCurrentMonth = now.clone().endOf("month"); // Ensure we only include dates within the current month
    let filteredReceipts: ReceiptResponse[] = [];

    if (timeFilter === '6m') {
      const boundaryDate = now.clone().subtract(6, 'months').startOf('month');
      filteredReceipts = data.filter(receipt =>
        moment(receipt.date).isSameOrAfter(boundaryDate, 'day') &&
        moment(receipt.date).isSameOrBefore(endOfCurrentMonth, 'day')
      );
    } else if (timeFilter === '3m') {
      const boundaryDate = now.clone().subtract(3, 'months').startOf('month');
      filteredReceipts = data.filter(receipt =>
        moment(receipt.date).isSameOrAfter(boundaryDate, 'day') &&
        moment(receipt.date).isSameOrBefore(endOfCurrentMonth, 'day')
      );
    } else if (timeFilter === '2m') {
      const boundaryDate = now.clone().subtract(2, 'months').startOf('month');
      filteredReceipts = data.filter(receipt =>
        moment(receipt.date).isSameOrAfter(boundaryDate, 'day') &&
        moment(receipt.date).isSameOrBefore(endOfCurrentMonth, 'day')
      );
    } else {
      const [monthName, year] = timeFilter.split(' ');
      filteredReceipts = data.filter(receipt => {
        const receiptDate = moment(receipt.date);
        return (
          receiptDate.format('MMMM') === monthName &&
          receiptDate.format('YYYY') === year &&
          receiptDate.isSameOrBefore(endOfCurrentMonth, 'day')
        );
      });
    }

    setFilteredData(filteredReceipts);
  }, [timeFilter, data]);

  const chartData = React.useMemo(() => {
    const categoryTotals: { [key: string]: number } = filteredData.reduce((acc, receipt) => {
      if (!acc[receipt.category]) {
        acc[receipt.category] = 0;
      }
      
      const cost = typeof receipt.totalCost === "string" 
        ? parseFloat(receipt.totalCost.replace(/[^0-9.-]+/g, ""))
        : receipt.totalCost;

      if (!isNaN(cost)) {
        acc[receipt.category] += cost;
      }
      return acc;
    }, {} as { [key: string]: number });

    const totalSpending = Object.values(categoryTotals).reduce((sum, total) => sum + total, 0);

    return Object.entries(categoryTotals).map(([category, total]) => ({
      category,
      total,
      percentage: totalSpending > 0 ? ((total / totalSpending) * 100).toFixed(2) : '0.00',
    }));
  }, [filteredData]);

  const monthOptions = generateMonthOptions();

  const totalSpending = chartData.reduce((sum, item) => sum + item.total, 0);

  React.useEffect(() => {
    const handleResize = () => {
      const windowWidth = window.innerWidth;
      const screenWidth = window.screen.width;

      if (windowWidth <= screenWidth * 0.75) {
        setChartSize({ innerRadius: 50, outerRadius: 100 });
        setIsMobile(true);
      } else {
        setChartSize({ innerRadius: 80, outerRadius: 120 });
        setIsMobile(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const tooltipFormatter = (value: number) => `$${value.toLocaleString()}`;

  return (
    <Card className="w-full bg-transparent border-slate-200 border-2">
      <CardHeader>
        <CardTitle>
          Spending Breakdown by Category for {timeFilter === '6m'
            ? 'Past 6 Months'
            : timeFilter === '3m'
              ? 'Past 3 Months'
              : timeFilter === '2m'
                ? 'Past 2 Months'
                : timeFilter}
        </CardTitle>
        <CardDescription>
          Categorized breakdown of spending
        </CardDescription>
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
        <div className="mx-auto max-w-full">
          {chartData.length === 0 ? (
            <div className="text-center text-gray-500">No data available for the selected period</div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="total"
                  nameKey="category"
                  innerRadius={chartSize.innerRadius}
                  outerRadius={chartSize.outerRadius}
                  fill="#8884d8"
                  label={isMobile ? undefined : ({ category, percentage }) => `${category}: ${percentage}%`}
                  labelLine={!isMobile}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={tooltipFormatter} />
              </PieChart>
            </ResponsiveContainer>
          )}
          {isMobile && chartData.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-4">
              {chartData.map((entry, index) => (
                <div key={index} className="flex items-center">
                  <div
                    className="w-4 h-4 mr-2"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="text-sm font-bold">{entry.category}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-center items-center">
        <div className="text-center text-sm font-medium">
          Total Spending: ${totalSpending.toFixed(2)}
        </div>
      </CardFooter>
    </Card>
  );
}
