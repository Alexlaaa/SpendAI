"use client"

import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { useReceipt } from '@/hooks/useReceipt';
import { useToast } from "@/components/ui/use-toast"
import { ReceiptResponse, Category, ReceiptItem } from "@/components/table/transactionCols"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'application/pdf'] as const;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

type AllowedFileType = typeof ALLOWED_FILE_TYPES[number];

const ReceiptImagePage: React.FC = () => {
    const { toast } = useToast()
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { uploadReceipt, confirmReceipt, isUploading, isConfirming, error } = useReceipt();
    const [formTouched, setFormTouched] = useState(false);
    const [receiptData, setReceiptData] = useState<Omit<ReceiptResponse, 'id'>>({
        merchantName: '',
        date: '',
        totalCost: '',
        category: Category.OTHERS,
        itemizedList: [],
        image: ''
    });

    useEffect(() => {
        console.log("[Upload Page.tsx] Receipt data state updated:", receiptData);
    }, [receiptData]);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
    
        if (selectedFile) {
            if (!ALLOWED_FILE_TYPES.includes(selectedFile.type as AllowedFileType)) {
                toast({
                    variant: "destructive",
                    title: "Invalid file type",
                    description: "Please upload a PNG or JPEG file.",
                });
                return;
            }
    
            if (selectedFile.size > MAX_FILE_SIZE) {
                toast({
                    variant: "destructive",
                    title: "File too large",
                    description: "File size should not exceed 5MB.",
                });
                return;
            }
    
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
                setReceiptData(prev => ({ 
                    ...prev, 
                    image: reader.result as string,
                    merchantName: '',
                    date: '',
                    totalCost: '',
                    category: Category.OTHERS,
                    itemizedList: []
                }));
            };
            reader.readAsDataURL(selectedFile);
            
            setFormTouched(false);
        }
    };

    // Helper function to format ISO date string to YYYY-MM-DD
    const formatDateForInput = (isoString: string): string => {
        if (!isoString) return '';
        return isoString.split('T')[0];
    };

    // Helper function to format number to 2 decimal places
    const formatToTwoDecimals = (value: string): string => {
        const number = parseFloat(value);
        return isNaN(number) ? '' : number.toFixed(2);
    };

    // Helper function to parse category string into enum
    function parseCategory(category: string): Category {
        const processedCat = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
        return processedCat as Category
    }

    const handleUpload = async () => {
        setFormTouched(false);
        if (!file) {
            toast({
                variant: "destructive",
                title: "No file selected",
                description: "Please select a file to upload.",
            });
            return;
        }
        try {
            const formData = new FormData();
            formData.append('image', file);
            
            console.log("[Upload Page.tsx] Uploading receipt...");
            const data = await uploadReceipt(formData);
            console.log("[Upload Page.tsx] Received data from server:", data);
    
            // Clean up data
            const cleanedData: ReceiptResponse = {
                ...data,
                itemizedList: data.itemizedList.map(item => ({
                    ...item,
                    itemQuantity: item.itemQuantity || 1,
                    itemCost: formatToTwoDecimals(item.itemCost)
                })),
                date: formatDateForInput(data.date),
                category: parseCategory(data.category),
                totalCost: formatToTwoDecimals(data.totalCost)
            };
    
            console.log("[Upload Page.tsx] cleanedData: ", cleanedData);
    
            setReceiptData(cleanedData);
            console.log("State updated with new receipt data");
    
            // Clear the file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
    
            toast({
                title: "Receipt Data Extracted Successfully!",
            });
        } catch (err) {
            console.error("Error in uploading receipt:", err);
            toast({
                variant: "destructive",
                title: "Upload Failed",
                description: "Please try again later.",
            });
        }
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>, field: keyof Omit<ReceiptResponse, 'id' | 'category' | 'itemizedList'>) => {
        if (formTouched) {
            const value = field === 'totalCost' ? formatToTwoDecimals(e.target.value) : e.target.value;
            setReceiptData({ ...receiptData, [field]: value });
        }
    };
    
    const handleCategoryChange = (value: Category) => {
        if (formTouched) {
            setReceiptData({ ...receiptData, category: value });
        }
    };

    const handleInputFocus = () => {
        setFormTouched(true);
    };
    
    const handleItemizedListChange = (index: number, field: keyof ReceiptItem, value: string) => {
        const newItemizedList = [...receiptData.itemizedList];
        newItemizedList[index] = { 
            ...newItemizedList[index], 
            [field]: field === 'itemQuantity' ? parseInt(value, 10) : 
                    field === 'itemCost' ? formatToTwoDecimals(value) : value 
        };
        setReceiptData(prevData => ({ 
            ...prevData, 
            itemizedList: newItemizedList,
            totalCost: calculateTotal(newItemizedList)
        }));
    };

    const calculateTotal = (items: ReceiptItem[]): string => {
        const total = items.reduce((sum, item) => {
            const cost = parseFloat(item.itemCost || '0') * (item.itemQuantity || 0);
            return sum + (isNaN(cost) ? 0 : cost);
        }, 0);
        return total.toFixed(2);
    };
    
    const handleAddItem = () => {
        const newItemizedList = [
            ...receiptData.itemizedList, 
            { itemName: '', itemQuantity: 1, itemCost: '0.00' }
        ];
        setReceiptData(prevData => ({
            ...prevData,
            itemizedList: newItemizedList,
            totalCost: calculateTotal(newItemizedList)
        }));
    };
    
    const handleRemoveItem = (index: number) => {
        const newItemizedList = receiptData.itemizedList.filter((_, i) => i !== index);
        setReceiptData(prevData => ({ 
            ...prevData,
            itemizedList: newItemizedList,
            totalCost: calculateTotal(newItemizedList)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const success = await confirmReceipt(receiptData as ReceiptResponse);
            if (success) {
                toast({
                    title: "Receipt Created Successfully!",
                });
                setReceiptData({
                    merchantName: '',
                    date: '',
                    totalCost: '',
                    category: Category.OTHERS,
                    itemizedList: [],
                    image: ''
                });
                setFile(null);
                setPreview('');
            } else {
                throw new Error('Failed to create receipt');
            }
        } catch (err) {
            console.error("Error creating receipt:", err);
            toast({
                variant: "destructive",
                title: "Error Creating Receipt",
                description: "Please try again later.",
            });
        }
    };

    return (
        <div className="max-w-6xl mx-auto mt-10 p-8 bg-slate-50 rounded-xl shadow-lg">
            <h1 className="text-3xl font-bold mb-6 text-slate-800">Create Receipt</h1>
            
            <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 text-slate-700">Upload Receipt Image</h2>
                <Input
                    type="file"
                    accept={ALLOWED_FILE_TYPES.join(',')}
                    onChange={handleFileChange}
                    ref={fileInputRef}
                    className="hidden"
                    id="file-upload"
                />
    
                {!file && (
                    <label htmlFor="file-upload" className="cursor-pointer mb-4 block">
                        <div className="flex items-center justify-center w-full h-40 border-2 border-dashed border-slate-300 rounded-xl hover:border-slate-400 hover:bg-slate-100 transition-all duration-200 ease-in-out">
                            <div className="text-center">
                                <Upload className="mx-auto h-12 w-12 text-slate-400" />
                                <p className="mt-2 text-sm text-slate-600 font-medium">Click to upload image (optional)</p>
                                <p className="text-xs text-slate-500">PNG or JPEG up to 5MB</p>
                            </div>
                        </div>
                    </label>
                )}
    
                {error && (
                    <Alert variant="destructive" className="mb-4">
                        <AlertDescription>{error.message}</AlertDescription>
                    </Alert>
                )}
    
                {preview && (
                    <div className="mb-6">
                        <img src={preview} alt="Preview" className="max-w-full h-auto rounded-xl mb-4 border border-slate-200 shadow-sm" />
                        <div className="flex gap-3">
                            <label htmlFor="file-upload" className="cursor-pointer block flex-1">
                                <Button variant="outline" className="w-full hover:bg-slate-100">
                                    <ImageIcon className="mr-2 h-4 w-4" />
                                    Change Image
                                </Button>
                            </label>
                            <Button onClick={handleUpload} disabled={!file || isUploading} className="flex-1 bg-slate-800 hover:bg-slate-700">
                                {isUploading ? 'Extracting...' : 'Extract Details'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
                
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                        <Label className="text-slate-700 font-medium">Merchant:</Label>
                        <Input
                            value={receiptData.merchantName}
                            onChange={(e) => handleInputChange(e, 'merchantName')}
                            onFocus={handleInputFocus}
                            className="bg-white border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label className="text-slate-700 font-medium">Date:</Label>
                        <Input
                            type="date"
                            value={receiptData.date}
                            onChange={(e) => handleInputChange(e, 'date')}
                            onFocus={handleInputFocus}
                            className="bg-white border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <Label className="text-slate-700 font-medium">Cost:</Label>
                        <div className="flex_center gap-1">
                            <span className="font-medium text-lg text-slate-600">$</span>
                            <Input
                                type="number"
                                value={receiptData.totalCost}
                                onChange={(e) => handleInputChange(e, 'totalCost')}
                                onFocus={handleInputFocus}
                                step="0.01"
                                className="bg-white border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                            />
                        </div>
                    </div>
    
                    <div className="flex flex-col gap-2">
                        <Label className="text-slate-700 font-medium">Category:</Label>
                        <Select value={receiptData.category} onValueChange={handleCategoryChange}>
                            <SelectTrigger className="bg-white border-slate-200 focus:border-slate-400 focus:ring-slate-400">
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            <SelectContent>
                                {Object.values(Category).map((category) => (
                                    <SelectItem key={category} value={category}>
                                        {category}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
    
                <div className="flex flex-col gap-4 mt-8">
                    <Label className="text-slate-700 font-medium text-lg">Items</Label>
                    {receiptData.itemizedList.map((item, index) => (
                        <div key={`receiptData_i${index}`} className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                        <div className="space-y-1.5 mb-3">
                            <Label className="text-slate-700 font-medium">Item:</Label>
                            <Input
                                value={item.itemName}
                                onChange={(e) => handleItemizedListChange(index, 'itemName', e.target.value)}
                                placeholder="Item Name"
                                className="bg-white border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-slate-700 font-medium">Quantity:</Label>
                                <Input
                                    type="number"
                                    value={item.itemQuantity}
                                    onChange={(e) => handleItemizedListChange(index, 'itemQuantity', e.target.value)}
                                    placeholder="Quantity"
                                    className="bg-white border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-slate-700 font-medium">Unit Cost:</Label>
                            <div className="flex_center gap-1">
                            <span className="font-medium text-lg text-slate-600">$</span>
                                <Input
                                    type="number"
                                    value={item.itemCost}
                                    onChange={(e) => handleItemizedListChange(index, 'itemCost', e.target.value)}
                                    placeholder="Item Cost"
                                    step="0.01"
                                    className="bg-white border-slate-200 focus:border-slate-400 focus:ring-slate-400"
                                />
                                </div>
                            </div>
                        </div>
                    </div>
                            <Button 
                                type="button" 
                                onClick={() => handleRemoveItem(index)} 
                                className="flex gap-2 bg-transparent hover:scale-110 hover:bg-transparent mt-1 transition-all duration-150"
                            >
                                <Image 
                                    src="/icons/delete.svg"
                                    alt="del"
                                    height={25}
                                    width={25}
                                />
                            </Button>
                        </div>
                    </div>
                    ))}
                </div>
                <div className="flex flex-col gap-4 mt-6">
                    <Button type="button" onClick={handleAddItem} variant="outline" 
                        className="bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700">
                        + Add Item
                    </Button>
                    <Button type="submit" disabled={isConfirming} 
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white py-6">
                        {isConfirming ? 'Creating Receipt...' : 'Create Receipt'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default ReceiptImagePage;