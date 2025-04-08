import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button2 } from "@/components/ui/button2";
import { Input } from "@/components/ui/input";
import { Label2 } from "@/components/ui/label2";
import { ReceiptResponse, Category } from "@/components/table/transactionCols";

interface EditReceiptPopupProps {
  receipt: ReceiptResponse;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedReceipt: ReceiptResponse) => void;
}

export function EditReceiptPopup({ receipt, isOpen, onClose, onSave }: EditReceiptPopupProps) {
  const [editedReceipt, setEditedReceipt] = useState<ReceiptResponse>(receipt);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditedReceipt(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (value: Category) => {
    setEditedReceipt(prev => ({ ...prev, category: value }));
  };

  const handleSave = () => {
    onSave(editedReceipt);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Receipt</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label2 htmlFor="merchantName" className="text-right">
              Merchant
            </Label2>
            <Input
              id="merchantName"
              name="merchantName"
              value={editedReceipt.merchantName}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label2 htmlFor="date" className="text-right">
              Date
            </Label2>
            <Input
              id="date"
              name="date"
              type="date"
              value={editedReceipt.date.split('T')[0]}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label2 htmlFor="totalCost" className="text-right">
              Total Cost
            </Label2>
            <Input
              id="totalCost"
              name="totalCost"
              type="number"
              value={editedReceipt.totalCost}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label2 htmlFor="category" className="text-right">
              Category
            </Label2>
            <Select
              onValueChange={handleCategoryChange}
              defaultValue={editedReceipt.category}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {Object.values(Category).map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button2 type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button2>
          <Button2 type="button" onClick={handleSave}>
            Save Changes
          </Button2>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}