import { supabase, unwrap, unwrapMaybe } from "./client";
import type { Child, Profile } from "./types";

/**
 * Profile and children.
 *
 * The profile row is created by the on_auth_user_created trigger, so this
 * layer only ever updates it — it never has to handle "authenticated but
 * no profile yet".
 */

export async function getProfile(userId: string): Promise<Profile | null> {
  return unwrapMaybe<Profile>(
    "family.getProfile",
    await supabase.from("profiles").select("*").eq("id", userId).maybeSingle()
  );
}

export async function updateProfile(
  userId: string,
  patch: Partial<
    Pick<
      Profile,
      | "parent_name"
      | "relationship"
      | "birth_method"
      | "feeding_method"
      | "diet"
      | "allergies"
      | "had_hypertension"
      | "phone"
      | "timezone"
    >
  >
): Promise<Profile> {
  return unwrap<Profile>(
    "family.updateProfile",
    await supabase.from("profiles").update(patch).eq("id", userId).select().single()
  );
}

/**
 * The device's IANA timezone, for stamping onto the profile at signup.
 * Everything that computes "today" downstream depends on this being right.
 */
export function deviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
  } catch {
    return "Asia/Kolkata";
  }
}

/**
 * Children, oldest first.
 *
 * Returns an array because the schema supports many per parent. MVP UI
 * only ever shows the first — see getPrimaryChild — but nothing here
 * assumes there is only one.
 */
export async function listChildren(parentId: string): Promise<Child[]> {
  return unwrap<Child[]>(
    "family.listChildren",
    await supabase
      .from("children")
      .select("*")
      .eq("parent_id", parentId)
      .order("created_at", { ascending: true })
  );
}

/** The one child MVP works with. Null before onboarding completes. */
export async function getPrimaryChild(parentId: string): Promise<Child | null> {
  const kids = await listChildren(parentId);
  return kids[0] ?? null;
}

export async function createChild(input: {
  parentId: string;
  name: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender?: string | null;
  /** 40 = full term, lower = preterm, null/undefined = not asked. */
  gestationalWeeks?: number | null;
}): Promise<Child> {
  return unwrap<Child>(
    "family.createChild",
    await supabase
      .from("children")
      .insert({
        parent_id: input.parentId,
        name: input.name,
        date_of_birth: input.dateOfBirth,
        gender: input.gender ?? null,
        gestational_weeks: input.gestationalWeeks ?? null,
      })
      .select()
      .single()
  );
}

/** Update the MVP child when onboarding is completed again. */
export async function updateChild(
  childId: string,
  patch: Partial<
    Pick<
      Child,
      "name" | "date_of_birth" | "gender" | "gestational_weeks" | "allergies" | "in_nicu"
    >
  >
): Promise<Child> {
  return unwrap<Child>(
    "family.updateChild",
    await supabase.from("children").update(patch).eq("id", childId).select().single()
  );
}
