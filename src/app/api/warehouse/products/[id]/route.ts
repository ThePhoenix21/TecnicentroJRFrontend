import { NextRequest, NextResponse } from 'next/server';

const getBackendBaseUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
};

const pickHeaders = (req: NextRequest) => {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  const auth = req.headers.get('authorization');
  if (auth) headers.Authorization = auth;

  const warehouseId = req.headers.get('x-warehouse-id');
  if (warehouseId) headers['x-warehouse-id'] = warehouseId;

  return headers;
};

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const backendUrl = `${getBackendBaseUrl()}/warehouse/products/${id}`;

  const response = await fetch(backendUrl, {
    method: 'GET',
    headers: pickHeaders(req),
    cache: 'no-store',
  });

  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') || 'application/json',
    },
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const backendUrl = `${getBackendBaseUrl()}/warehouse/products/${id}`;
  const body = await req.text();

  const response = await fetch(backendUrl, {
    method: 'PATCH',
    headers: pickHeaders(req),
    body,
  });

  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') || 'application/json',
    },
  });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const backendUrl = `${getBackendBaseUrl()}/warehouse/products/${id}`;

  const response = await fetch(backendUrl, {
    method: 'DELETE',
    headers: pickHeaders(req),
  });

  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') || 'application/json',
    },
  });
}
