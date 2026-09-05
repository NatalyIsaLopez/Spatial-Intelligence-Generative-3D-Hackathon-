import { NextResponse } from "next/server";
import {
  generateModel,
  MintError,
  type GenerationPreset,
  type RiggingPose,
} from "@/lib/mint";

const PRESETS: GenerationPreset[] = ["fast", "standard", "production"];
const POSES: RiggingPose[] = ["t_pose", "a_pose"];

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const body = payload as Record<string, unknown>;
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";

  if (!prompt) {
    return NextResponse.json(
      { error: "Describe the model you want to generate." },
      { status: 400 },
    );
  }
  if (prompt.length > 8000) {
    return NextResponse.json(
      { error: "Prompt is longer than Mint's 8000 character limit." },
      { status: 400 },
    );
  }

  const preset = body.generationPreset;
  const generationPreset = PRESETS.includes(preset as GenerationPreset)
    ? (preset as GenerationPreset)
    : "standard";

  const pose = body.riggingPose;
  const riggingPose = POSES.includes(pose as RiggingPose)
    ? (pose as RiggingPose)
    : undefined;

  const imageUrl =
    typeof body.imageUrl === "string" && body.imageUrl.trim()
      ? body.imageUrl.trim()
      : undefined;

  try {
    const operation = await generateModel({
      prompt,
      generationPreset,
      riggingPose,
      imageUrl,
      name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : undefined,
    });
    return NextResponse.json(operation, { status: 202 });
  } catch (err) {
    return errorResponse(err);
  }
}

function errorResponse(err: unknown) {
  if (err instanceof MintError) {
    // Surface Mint's own status so the client can distinguish a content-policy
    // block from a billing wall or a rate limit.
    return NextResponse.json(
      {
        error: err.message,
        problemType: err.problem?.type,
        requestId: err.requestId,
        retryAfterSeconds: err.retryAfterSeconds,
      },
      { status: err.status },
    );
  }
  console.error("Unexpected error starting Mint generation:", err);
  return NextResponse.json(
    { error: "Could not reach Mint. Try again." },
    { status: 502 },
  );
}
