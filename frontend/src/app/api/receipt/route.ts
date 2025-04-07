'use server'

import { cookies } from 'next/headers'
import { ReceiptResponse, Category } from "@/components/table/transactionCols";


// Helper function to safely log FormData contents
function logFormData(formData: FormData) {
    const formDataEntries = Array.from(formData.entries());
    return formDataEntries.map(([key, value]) => {
        if (value instanceof File) {
            return `${key}: File(name: ${value.name}, type: ${value.type}, size: ${value.size})`;
        }
        return `${key}: ${value}`;
    }).join(', ');
}

export async function getAllReceiptsServerAction(): Promise<ReceiptResponse[]> {
    const token = cookies().get('jwt')?.value;

    if (!token) {
        console.error('[getAllReceiptsServerAction] No JWT token found in cookies');
        throw new Error('Not authorized. JWT cookie missing or invalid.');
    }

    try {
        console.log(`[getAllReceiptsServerAction] POST to ${process.env.BACKEND_URL}/api/receipts`);
        
        // Log the token (be careful with this in production)
        console.log('[getAllReceiptsServerAction] JWT Token:', token);

        // Prepare headers
        const headers = {
            'Content-Type': 'application/json',
            'Cookie': `jwt=${token}`,
        };

        const response = await fetch(`${process.env.BACKEND_URL}/api/receipts`, {
            method: 'GET',
            headers: headers,
            credentials: 'include',
        });

        // Log request details
        console.log('[getAllReceiptsServerAction] Request details:');
        console.log('URL:', `${process.env.BACKEND_URL}/api/receipts/create`);
        console.log('Method: POST');
        console.log('Headers:', JSON.stringify(headers, null, 2));
        
        // Log response details
        console.log('[getAllReceiptsServerAction] Response details:');
        console.log('Status:', response.status);
        console.log('StatusText:', response.statusText);
        console.log('Headers:', JSON.stringify(Object.fromEntries(response.headers), null, 2));

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[getAllReceiptsServerAction] Error response body: ${errorText}`);
            throw new Error(`Failed to confirm receipt: ${errorText}`);
        }

        const result = await response.json();
        console.log("[getAllReceiptsServerAction] Received result:", JSON.stringify(result, null, 2));

        return result
    } catch (err) {
        console.error('[getAllReceiptsServerAction] error:', err);
        throw err;
    }
}

export async function confirmReceiptServerAction(confirmedData: ReceiptResponse): Promise<boolean> {
    const token = cookies().get('jwt')?.value;

    if (!token) {
        console.error('[confirmReceiptServerAction] No JWT token found in cookies');
        throw new Error('Not authorized. JWT cookie missing or invalid.');
    }

    try {
        console.log(`[confirmReceiptServerAction] POST to ${process.env.BACKEND_URL}/api/receipts/create`);
        
        // Log the token (be careful with this in production)
        console.log('[confirmReceiptServerAction] JWT Token:', token);

        // Prepare headers
        const headers = {
            'Content-Type': 'application/json',
            'Cookie': `jwt=${token}`,
        };

        const response = await fetch(`${process.env.BACKEND_URL}/api/receipts/create`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(confirmedData),
            credentials: 'include',
        });

        // Log request details
        console.log('[confirmReceiptServerAction] Request details:');
        console.log('URL:', `${process.env.BACKEND_URL}/api/receipts/create`);
        console.log('Method: POST');
        console.log('Headers:', JSON.stringify(headers, null, 2));
        console.log('Body:', JSON.stringify(confirmedData, null, 2));
        
        // Log response details
        console.log('[confirmReceiptServerAction] Response details:');
        console.log('Status:', response.status);
        console.log('StatusText:', response.statusText);
        console.log('Headers:', JSON.stringify(Object.fromEntries(response.headers), null, 2));

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[confirmReceiptServerAction] Error response body: ${errorText}`);
            throw new Error(`Failed to confirm receipt: ${errorText}`);
        }

        const result = await response.json();
        console.log("[confirmReceiptServerAction] Received result:", JSON.stringify(result, null, 2));

        return true
    } catch (err) {
        console.error('[confirmReceiptServerAction] error:', err);
        throw err;
    }
}

export async function updateReceiptServerAction(updatedData: ReceiptResponse): Promise<ReceiptResponse> {

    const token = cookies().get('jwt')?.value;
    if (!token) {
        console.log("[updateReceiptServerAction] No JWT token found in cookies")
        throw new Error("Not authorized. JWT cookie missing or invalid.")
    }

    try {

        const response = await fetch(`${process.env.BACKEND_URL}/api/receipts/${updatedData.id}`, {
            method: "PUT",
            headers: {
                'Cookie': `jwt=${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedData)
        })

        if (!response.ok) {
            throw new Error("Error in updating receipt data")
        }

        const data = await response.json();

        return data;
        

    } catch (err){
        console.log("[updateReceiptServerAction] error: ", err)
        throw err
    }

}

export async function uploadReceiptServerAction(formData: FormData): Promise<ReceiptResponse> {
    const token = cookies().get('jwt')?.value;

    if (!token) {
        console.error('[uploadReceiptServerAction] No JWT token found in cookies');
        throw new Error('Not authorized. JWT cookie missing or invalid.');
    }

    try {
        console.log(`[uploadReceiptServerAction] POST to ${process.env.BACKEND_URL}/api/receipts/process`);
        
        // Log the token (be careful with this in production)
        console.log('[uploadReceiptServerAction] JWT Token:', token);

        // Prepare headers
        const headers = {
            'Cookie': `jwt=${token}`,
        };

        const response = await fetch(`${process.env.BACKEND_URL}/api/receipts/process`, {
            method: 'POST',
            headers: headers,
            body: formData,
            credentials: 'include',
        });

        // Log request details
        console.log('[uploadReceiptServerAction] Request details:');
        console.log('URL:', `${process.env.BACKEND_URL}/api/receipts/process`);
        console.log('Method: POST');
        console.log('Headers:', JSON.stringify(headers, null, 2));
        console.log('FormData contents:', logFormData(formData));
        
        // Log response details
        console.log('[uploadReceiptServerAction] Response details:');
        console.log('Status:', response.status);
        console.log('StatusText:', response.statusText);
        console.log('Headers:', JSON.stringify(Object.fromEntries(response.headers), null, 2));

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[uploadReceiptServerAction] Error response body: ${errorText}`);
            throw new Error(`Failed to upload image: ${errorText}`);
        }

        const data: ReceiptResponse = await response.json();
        console.log("[uploadReceiptServerAction] Received data:", JSON.stringify(data, null, 2));

        return data;
    } catch (err) {
        console.error('[uploadReceiptServerAction] error:', err);
        throw err;
    }
}