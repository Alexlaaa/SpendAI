import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export enum Category {
  TRANSPORT = 'Transport',
  CLOTHING = 'Clothing',
  HEALTHCARE = 'Healthcare',
  FOOD = 'Food',
  LEISURE = 'Leisure',
  HOUSING = 'Housing',
  OTHERS = 'Others',
}

export type ReceiptItem = {
  itemName: string;
  itemQuantity: number;
  itemCost: string;
}

export type ReceiptResponse = {
  id: string;
  merchantName: string;
  date: string;
  totalCost: string;
  category: Category;
  itemizedList: ReceiptItem[];
  image: string;
}

export const createColumns = (onEdit?: (receipt: ReceiptResponse) => void): ColumnDef<ReceiptResponse>[] => [
  {
    accessorKey: "date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("date"))
      const formattedDate = date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      })
      return <div>{formattedDate}</div>
    }
  },
  {
    accessorKey: "merchantName",
    header: "Merchant",
    cell: ({ row }) => {
      return <div>{row.getValue("merchantName")}</div>
    }
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => {
      return <div className="capitalize">{row.getValue("category")}</div>
    }
  },
  {
    accessorKey: "totalCost",
    header: () => <div className="text-right">Total Cost</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("totalCost"))
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount)
 
      return <div className="text-right font-medium">{formatted}</div>
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const receipt = row.original
 
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(receipt.date)}
            >
              Copy receipt date
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {onEdit && <DropdownMenuItem
              onClick={() => onEdit(receipt)}
            >
              Edit Receipt
            </DropdownMenuItem>}
            <DropdownMenuItem
              onClick={() => {}} // TODO: delete feature
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]