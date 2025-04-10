
import { supabase } from "@/integrations/supabase/client";

export type WardAccount = {
  id?: string;
  ward: string;
  username: string;
  password: string;
  created_at?: string;
};

/**
 * Creates a new ward account in Supabase
 * @param wardAccount The ward account data to create
 * @returns An object containing the result or error
 */
export async function createWardAccount(wardAccount: WardAccount): Promise<{ data: WardAccount | null; error: Error | null }> {
  try {
    // Using a direct API call with type assertions since the ward_accounts table is not in the TypeScript definition
    const { data, error } = await supabase
      .from('ward_accounts')
      .insert([
        {
          ward: wardAccount.ward,
          username: wardAccount.username,
          password: wardAccount.password,
        },
      ] as any)
      .select();

    if (error) {
      // Check if the error is a unique constraint violation
      if (error.code === '23505') {
        return { data: null, error: new Error("This ward is already assigned.") };
      }
      return { data: null, error: new Error(error.message) };
    }

    return { data: data?.[0] as WardAccount, error: null };
  } catch (error) {
    console.error("Error creating ward account:", error);
    return { data: null, error: error instanceof Error ? error : new Error("An unknown error occurred") };
  }
}

/**
 * Fetches all ward accounts from Supabase
 * @returns An array of ward accounts
 */
export async function getWardAccounts(): Promise<{ data: WardAccount[] | null; error: Error | null }> {
  try {
    // Using a direct API call with type assertions since the ward_accounts table is not in the TypeScript definition
    const { data, error } = await supabase
      .from('ward_accounts')
      .select('*') as { data: WardAccount[] | null; error: any };

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as WardAccount[], error: null };
  } catch (error) {
    console.error("Error fetching ward accounts:", error);
    return { data: null, error: error instanceof Error ? error : new Error("An unknown error occurred") };
  }
}
