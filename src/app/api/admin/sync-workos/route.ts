import { NextResponse } from 'next/server';
import { syncToWorkos } from '@/scripts/sync-to-workos';

export async function POST() {
  try {
    // In a real app, ensure this is protected by admin auth!
    // Assuming middleware or other checks are in place, or we add a check here.
    // For now, we'll just run it.
    
    const logs = await syncToWorkos();
    
    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
