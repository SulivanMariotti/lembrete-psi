import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { password } = await request.json();
    
    // Use an environment variable for the admin password on the server side
    // In .env.local, set ADMIN_PASSWORD=YourSecurePassword
    // This keeps the password out of the client-side bundle.
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
        console.error("ADMIN_PASSWORD not set in environment variables");
        return NextResponse.json({ success: false, error: "Configuration error" }, { status: 500 });
    }

    if (password === adminPassword) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ success: false }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}