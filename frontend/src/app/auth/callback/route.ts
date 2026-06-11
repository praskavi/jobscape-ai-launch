import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type');
  // If "next" is in param, use it as the redirect destination
  const next = searchParams.get('next') ?? (type === 'recovery' ? '/reset-password' : '/dashboard');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Robust profile verification & fallback insertion
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Check if user profile already exists
          const { data: profiles, error: selectError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .limit(1);

          if (!selectError && (!profiles || profiles.length === 0)) {
            // Profile does not exist, insert a fallback record
            const fullName = user.user_metadata?.full_name 
              || user.user_metadata?.name 
              || user.email?.split('@')[0] 
              || 'User';

            await supabase
              .from('profiles')
              .insert({
                id: user.id,
                full_name: fullName,
              });
          }
        }
      } catch (profileError) {
        // Log error but do not block the sign-in redirect flow
        console.error('Fallback profile creation failed:', profileError);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`);
}
