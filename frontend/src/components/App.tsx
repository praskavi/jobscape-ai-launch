import * as React from "react";
import { supabase } from "../controllers/suabaseClient"; // Adjust path as needed
import { useRouter } from "next/navigation"; // If using Next.js for redirects

export function App() {
  const router = useRouter(); // If using Next.js

  React.useEffect(() => {
    // This sets up the listener for any session changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        
        if (event === 'SIGNED_IN') {
          console.log('User signed in:', session?.user.email);
        } 
        
        else if (event === 'TOKEN_REFRESHED') {
          // Supabase does this automatically before the 1-hour mark if the tab is open!
          console.log('Token was approaching 1 hour and auto-refreshed to keep user logged in.');
        } 
        
        else if (event === 'SIGNED_OUT') {
          console.log('User session ended or they logged out manually.');
          // TODO: Redirect to login page
          router.push('/login'); 
        }
      }
    );

    // Cleanup the listener when the component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    // Your normal app routing/components go here
    <div>Your App Content</div>
  );
}