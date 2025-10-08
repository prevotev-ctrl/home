import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return Response.json({ error: "Email requis" }, { status: 400 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase.from("waitlist").insert({ email });
    if (error) {
      // 23505 = unique_violation (email déjà présent)
      // 23514 = check_violation (regex email invalide)
      const msg =
        (error as any).code === "23505"
          ? "Déjà inscrit"
          : (error as any).code === "23514"
          ? "Email invalide"
          : error.message;
      return Response.json({ error: msg }, { status: 400 });
    }
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Oups, réessaie." }, { status: 500 });
  }
}
