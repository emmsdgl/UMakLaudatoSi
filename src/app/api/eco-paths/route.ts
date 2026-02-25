import { NextResponse } from 'next/server';
import { ECO_PATHS } from '@/lib/constants/eco-paths';

/**
 * GET /api/eco-paths
 * Return the 5 eco-path definitions.
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    paths: ECO_PATHS,
  });
}
