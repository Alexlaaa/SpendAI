import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers'; // Import cookies

const API_BASE_URL = process.env.BACKEND_URL; // Use environment variable

// Helper function to make authenticated requests to the backend
async function fetchBackend(
  endpoint: string,
  method: string = 'GET',
  body?: any,
) {
  const token = cookies().get('jwt'); // Get token from cookies
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Cookie: `jwt=${token.value}`, // Pass token via Cookie header
  };

  const options: RequestInit = {
    method,
    headers: headers,
    credentials: 'include', // Important for passing cookies
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const targetUrl = `${API_BASE_URL}/api/chat${endpoint}`; // Construct URL
  console.log(`[Chat API Route] Attempting to fetch backend: ${method} ${targetUrl}`); // Log the attempt

  try {
    // Add the /api prefix here - Already included in targetUrl construction
    const response = await fetch(targetUrl, options);

    console.log(`[Chat API Route] Backend response status: ${response.status} for ${targetUrl}`); // Log response status

    if (!response.ok) {
      // Attempt to parse error response from backend
      const errorData = await response.json().catch(() => ({
        error: `Backend request failed with status ${response.status}. Response not valid JSON.`,
      }));
      console.error(`[Chat API Route] Backend Error (${response.status}):`, errorData);
      // Forward the backend's status code and error message
      return NextResponse.json(errorData, { status: response.status });
    }

    // Handle NO_CONTENT for DELETE
    if (response.status === 204) {
        return new NextResponse(null, { status: 204 });
    }

    // Parse successful response
    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    // Differentiate between fetch errors (network level) and other errors
    if (error.cause && typeof error.cause === 'object' && 'code' in error.cause) {
        // Likely a fetch error (e.g., ECONNREFUSED, ENOTFOUND)
        console.error(`[Chat API Route] Network/Fetch error connecting to backend (${targetUrl}):`, error);
        return NextResponse.json(
          { error: 'Failed to connect to backend service', details: error.message, code: error.cause.code },
          { status: 502 }, // Bad Gateway is appropriate for upstream connection issues
        );
    } else {
        // Other unexpected errors during the process
        console.error(`[Chat API Route] Unexpected error in fetchBackend (${targetUrl}):`, error);
        return NextResponse.json(
          { error: 'Internal server error in API route', details: error.message },
          { status: 500 },
        );
    }
  }
}

// --- Conversation Handlers ---

// GET /api/chat/conversations
export async function GET(request: NextRequest) {
  return fetchBackend('/conversations');
}

// POST /api/chat/conversations
export async function POST(request: NextRequest) {
  // No body needed for creating a new conversation based on backend controller
  return fetchBackend('/conversations', 'POST');
}

// --- Specific Conversation Handlers (Need separate route file or dynamic handling) ---
// These would typically go into /api/chat/conversations/[id]/route.ts

// GET /api/chat/conversations/[id] - Placeholder, needs dynamic route
// export async function GET_CONVERSATION(request: NextRequest, { params }: { params: { id: string } }) {
//   const { id } = params;
//   return fetchBackend(`/conversations/${id}`);
// }

// PATCH /api/chat/conversations/[id] - Placeholder, needs dynamic route
// export async function PATCH_CONVERSATION(request: NextRequest, { params }: { params: { id: string } }) {
//   const { id } = params;
//   const body = await request.json();
//   return fetchBackend(`/conversations/${id}`, 'PATCH', body);
// }

// DELETE /api/chat/conversations/[id] - Placeholder, needs dynamic route
// export async function DELETE_CONVERSATION(request: NextRequest, { params }: { params: { id: string } }) {
//   const { id } = params;
//   return fetchBackend(`/conversations/${id}`, 'DELETE');
// }

// --- Message Handlers (Need separate route file or dynamic handling) ---
// These would typically go into /api/chat/conversations/[id]/messages/route.ts

// GET /api/chat/conversations/[id]/messages - Placeholder, needs dynamic route
// export async function GET_MESSAGES(request: NextRequest, { params }: { params: { id: string } }) {
//   const { id } = params;
//   return fetchBackend(`/conversations/${id}/messages`);
// }

// POST /api/chat/conversations/[id]/messages - Placeholder, needs dynamic route
// export async function POST_MESSAGE(request: NextRequest, { params }: { params: { id: string } }) {
//   const { id } = params;
//   const body = await request.json();
//   return fetchBackend(`/conversations/${id}/messages`, 'POST', body);
// }
