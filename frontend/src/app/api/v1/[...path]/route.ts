import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok', results: [] }, { status: 200 });
}

export async function POST() {
  return NextResponse.json({ status: 'ok', results: [] }, { status: 200 });
}

export async function PUT() {
  return NextResponse.json({ status: 'ok', results: [] }, { status: 200 });
}

export async function DELETE() {
  return NextResponse.json({ status: 'ok', results: [] }, { status: 200 });
}
