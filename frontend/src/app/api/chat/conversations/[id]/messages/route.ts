import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const API_BASE_URL = process.env.BACKEND_URL;

// Helper function (could be shared)
async function fetchBackend(
  endpoint: string,
  method: string = 'GET',
  body?: any,
) {
  const token = cookies().get('jwt');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Cookie: `jwt=${token.value}`,
  };

  const options: RequestInit = {
    method,
    headers: headers,
    credentials: 'include',
    cache: 'no-store', // Ensure fresh data
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    // Add the /api prefix here
    // Note: endpoint already includes the dynamic part like /conversations/${id}/messages
    const response = await fetch(`${API_BASE_URL}/api/chat${endpoint}`, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `Backend request failed with status ${response.status}`,
      }));
      console.error(`Backend Error (${response.status}):`, errorData);
      return NextResponse.json(errorData, { status: response.status });
    }

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching backend:', error);
    return NextResponse.json(
      { error: 'Failed to communicate with backend', details: error.message },
      { status: 500 },
    );
  }
}

// GET /api/chat/conversations/[id]/messages
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }, // id is the conversation ID
) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: 'Missing conversation ID' }, { status: 400 });
  }
  return fetchBackend(`/conversations/${id}/messages`);
}

// POST /api/chat/conversations/[id]/messages
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }, // id is the conversation ID
) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: 'Missing conversation ID' }, { status: 400 });
  }
  const body = await request.json(); // Expects { content: "user message" }
  if (!body || !body.content) {
     return NextResponse.json({ error: 'Missing message content in request body' }, { status: 400 });
  }
  return fetchBackend(`/conversations/${id}/messages`, 'POST', body);
}
