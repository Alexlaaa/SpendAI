"use client"

import { useState, useCallback } from 'react';
import { getAllReceiptsServerAction, confirmReceiptServerAction, uploadReceiptServerAction, updateReceiptServerAction } from '@/app/api/receipt/route';
import { ReceiptResponse } from "@/components/table/transactionCols"

const capitalizeText = (text: string): string => {
    return text
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

export function useReceipt() {
    const [isGetting, setIsGetting] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, updateError] = useState<Error | null>(null);

    const getAllReceipts = useCallback(async (): Promise<ReceiptResponse[]> => {
        setIsGetting(true);
        updateError(null);
        try {
            const data = await getAllReceiptsServerAction();

            const cleanedData = data.map(d => ({
                ...d,
                merchantName: capitalizeText(d.merchantName),
                itemizedList: d.itemizedList.map(i => ({
                    ...i,
                    itemName: capitalizeText(i.itemName)
                }))
            }))

            return cleanedData;
        } catch (error) {
            console.error('Error getting all receipts:', error);
            updateError(error as Error);
            throw error;
        } finally {
            setIsGetting(false);
        }
    }, []);

    const confirmReceipt = useCallback(async (confirmedData: ReceiptResponse): Promise<boolean> => {
        setIsConfirming(true);
        updateError(null);
        try {
            const result = await confirmReceiptServerAction(confirmedData);
            return result;
        } catch (error) {
            console.error('Error confirming receipt:', error);
            updateError(error as Error);
            throw error;
        } finally {
            setIsConfirming(false);
        }
    }, []);

    const uploadReceipt = useCallback(async (formData: FormData): Promise<ReceiptResponse> => {
        setIsUploading(true);
        updateError(null);
        try {
            const data = await uploadReceiptServerAction(formData);
            return data;
        } catch (error) {
            console.error('Error uploading receipt:', error);
            updateError(error as Error);
            throw error;
        } finally {
            setIsUploading(false);
        }
    }, []);

    const updateReceipt = useCallback(async (updatedData: ReceiptResponse): Promise<ReceiptResponse> => {
        setIsUpdating(true);
        updateError(null);
        try {
            const updatedReceipt = await updateReceiptServerAction(updatedData)
            return updatedReceipt;
        } catch (error) {
            console.error('Error updating receipt:', error);
            updateError(error as Error);
            throw error;
        } finally {
            setIsUpdating(false);
        }
    }, []);

    return {
        getAllReceipts,
        confirmReceipt,
        uploadReceipt,
        updateReceipt,
        isGetting,
        isConfirming,
        isUploading,
        isUpdating,
        error
    };
}
