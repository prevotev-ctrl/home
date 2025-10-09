import { randomUUID } from "crypto";
import Replicate from "replicate";

import {
  SUPABASE_INPUT_BUCKET,
  SUPABASE_OUTPUT_BUCKET,
  SUPABASE_PROJECTS_TABLE,
  getSupabaseServiceRoleClient,
} from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const replicateToken = process.env.REPLICATE_API_TOKEN;
const replicateModel = process.env.REPLICATE_MODEL ?? "google/nano-banana";

export async function POST(req: Request) {
  if (!replicateToken) {
    return Response.json(
      { error: "REPLICATE_API_TOKEN is not configured." },
      { status: 500 }
    );
  }

  const formData = await req.formData();
  const prompt = formData.get("prompt");
  const file = formData.get("image");

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return Response.json(
      { error: "Le prompt est requis pour générer une image." },
      { status: 400 }
    );
  }
  if (!file || !(file instanceof Blob)) {
    return Response.json(
      { error: "Aucun fichier image reçu." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServiceRoleClient();

  const inputFileBuffer = Buffer.from(await file.arrayBuffer());
  const inputContentType = file.type || "application/octet-stream";
  const inputExtension = contentTypeToExtension(inputContentType) ?? "bin";
  const inputStoragePath = `inputs/${randomUUID()}.${inputExtension}`;

  const inputUpload = await uploadWithAutoBucket(
    supabase,
    SUPABASE_INPUT_BUCKET,
    inputStoragePath,
    inputFileBuffer,
    inputContentType
  );

  if (inputUpload.error) {
    console.error("Failed to upload input image", inputUpload.error);
    const message = isMissingBucketError(inputUpload.error)
      ? `Le bucket "${SUPABASE_INPUT_BUCKET}" est introuvable ou inaccessible. Crée-le dans Supabase Storage et rends-le public.`
      : "Impossible d'uploader l'image source.";
    return Response.json(
      { error: message },
      { status: 500 }
    );
  }

  const inputPublic = supabase.storage
    .from(SUPABASE_INPUT_BUCKET)
    .getPublicUrl(inputStoragePath);
  const inputPublicUrl = inputPublic.data.publicUrl;

  try {
    const replicate = new Replicate({
      auth: replicateToken,
      useFileOutput: false,
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    });
    const runResult = await replicate.run(replicateModel, {
      input: {
        image: inputPublicUrl,
        prompt,
      },
    });

    const generatedUrl = pickFirstUrl(runResult);
    if (!generatedUrl) {
      console.error("Replicate returned unexpected payload", runResult);
      return Response.json(
        { error: "Le modèle Replicate n'a pas renvoyé d'image." },
        { status: 500 }
      );
    }

    const generatedResponse = await fetch(generatedUrl);
    if (!generatedResponse.ok) {
      console.error("Replicate asset download failed", generatedResponse.status);
      return Response.json(
        { error: "Impossible de télécharger l'image générée." },
        { status: 502 }
      );
    }

    const generatedArrayBuffer = await generatedResponse.arrayBuffer();
    const generatedContentType =
      generatedResponse.headers.get("content-type") ?? "image/png";
    const generatedExtension =
      contentTypeToExtension(generatedContentType) ?? "png";
    const outputStoragePath = `outputs/${randomUUID()}.${generatedExtension}`;

    const outputUpload = await uploadWithAutoBucket(
      supabase,
      SUPABASE_OUTPUT_BUCKET,
      outputStoragePath,
      Buffer.from(generatedArrayBuffer),
      generatedContentType
    );

    if (outputUpload.error) {
      console.error("Failed to upload generated image", outputUpload.error);
      const message = isMissingBucketError(outputUpload.error)
        ? `Le bucket "${SUPABASE_OUTPUT_BUCKET}" est introuvable ou inaccessible. Crée-le dans Supabase Storage et rends-le public.`
        : "Impossible de sauvegarder l'image générée.";
      return Response.json(
        { error: message },
        { status: 500 }
      );
    }

    const outputPublic = supabase.storage
      .from(SUPABASE_OUTPUT_BUCKET)
      .getPublicUrl(outputStoragePath);
    const outputPublicUrl = outputPublic.data.publicUrl;

    const insert = await supabase.from(SUPABASE_PROJECTS_TABLE).insert({
      input_image_url: inputPublicUrl,
      output_image_url: outputPublicUrl,
      prompt,
      status: "completed",
    });

    if (insert.error) {
      console.error("Failed to insert project in Supabase", insert.error);
    }

    return Response.json({ imageUrl: outputPublicUrl });
  } catch (error) {
    console.error("Replicate run failed", error);
    return Response.json(
      { error: "La génération a échoué, réessaie plus tard." },
      { status: 500 }
    );
  }
}

function contentTypeToExtension(contentType: string | null) {
  if (!contentType) return null;
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/webp": "webp",
  };
  return map[contentType] ?? null;
}

function pickFirstUrl(payload: unknown, visited = new Set<unknown>()): string | null {
  if (!payload || visited.has(payload)) return null;
  if (typeof payload === "string") {
    return isUrl(payload) ? payload : null;
  }

  if (Array.isArray(payload)) {
    visited.add(payload);
    for (const entry of payload) {
      const url = pickFirstUrl(entry, visited);
      if (url) return url;
    }
    return null;
  }

  if (typeof payload === "object") {
    visited.add(payload);
    for (const value of Object.values(payload)) {
      const url = pickFirstUrl(value, visited);
      if (url) return url;
    }
  }

  return null;
}

function isUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function uploadWithAutoBucket(
  supabase: ReturnType<typeof getSupabaseServiceRoleClient>,
  bucket: string,
  path: string,
  data: Blob | ArrayBuffer | Buffer | File,
  contentType: string
) {
  const attempt = await supabase.storage.from(bucket).upload(path, data, {
    contentType,
  });

  if (!attempt.error) {
    return attempt;
  }

  if (!isMissingBucketError(attempt.error)) {
    return attempt;
  }

  const create = await supabase.storage.createBucket(bucket, {
    public: true,
  });
  if (create.error && !isBucketAlreadyExistsError(create.error)) {
    return attempt;
  }

  return supabase.storage.from(bucket).upload(path, data, {
    contentType,
  });
}

function isMissingBucketError(error: { message?: string | null }) {
  return (
    typeof error?.message === "string" &&
    error.message.toLowerCase().includes("bucket not found")
  );
}

function isBucketAlreadyExistsError(error: { statusCode?: string | number | null }) {
  return error?.statusCode === "409";
}
