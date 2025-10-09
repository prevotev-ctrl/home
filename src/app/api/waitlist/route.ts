import {
  SUPABASE_WAITLIST_TABLE,
  getSupabaseServiceRoleClient,
} from "@/lib/supabase";

function isValidEmail(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export async function POST(request: Request) {
  try {
    const payload = await request.json().catch(() => null);
    const email = payload?.email;

    if (!isValidEmail(email)) {
      return Response.json(
        { error: "Merci d'indiquer une adresse email valide." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServiceRoleClient();
    const insert = await supabase
      .from(SUPABASE_WAITLIST_TABLE)
      .insert({ email: email.trim().toLowerCase() });

    if (insert.error) {
      const code = (insert.error as { code?: string }).code;
      const message =
        code === "23505"
          ? "Tu es déjà inscrit·e ✨"
          : insert.error.message || "Inscription impossible pour le moment.";
      return Response.json({ error: message }, { status: 400 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Waitlist POST failed", error);
    return Response.json(
      { error: "Oups, une erreur est survenue." },
      { status: 500 }
    );
  }
}
