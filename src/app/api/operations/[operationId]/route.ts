import { NextResponse } from "next/server";
import { getOperation, isTerminal, MintError } from "@/lib/mint";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ operationId: string }> },
) {
  const { operationId } = await params;

  try {
    const operation = await getOperation(operationId);
    return NextResponse.json({ ...operation, done: isTerminal(operation) });
  } catch (err) {
    if (err instanceof MintError) {
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
    console.error("Unexpected error polling Mint operation:", err);
    return NextResponse.json(
      { error: "Could not reach Mint. Try again." },
      { status: 502 },
    );
  }
}
