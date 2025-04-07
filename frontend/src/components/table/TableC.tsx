
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DataTable from "@/components/table/TransactionTable";
import {
    ColumnDef
} from "@tanstack/react-table"

interface TableCProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    displayRows: number
} 

export default function TableC<TData, TValue>({
    columns,
    data,
    displayRows = 10,
  }: TableCProps<TData, TValue>) {

return (

    <Card className="w-full bg-transparent border-slate-200 border-2">
      <CardHeader>
        <CardTitle>Your Transactions</CardTitle>
        <CardDescription>Your recent receipt data by date</CardDescription>
      </CardHeader>
      <CardContent>
            <DataTable columns={columns} data={data} displayRows={displayRows}/>
      </CardContent>
    </Card>
)
}