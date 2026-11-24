import { NextResponse } from "next/server";
import { Webhook } from "@/lib/fedapay";
import { approvePaymentByFedapayId } from "@/lib/actions/subscription";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.FEDAPAY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "webhook non configuré" }, { status: 500 });
  }

  const sig = req.headers.get("x-fedapay-signature") || "";
  const raw = await req.text();

  let event: { name?: string; entity?: { id?: string | number } } | undefined;
  try {
    // La bibliothèque FedaPay vérifie la signature et l'horodatage.
    event = Webhook.constructEvent(raw, sig, secret) as typeof event;
  } catch {
    return NextResponse.json({ error: "signature invalide" }, { status: 400 });
  }

  try {
    if (event?.name === "transaction.approved" && event.entity?.id != null) {
      await approvePaymentByFedapayId(String(event.entity.id));
    }
  } catch {
    // On acquitte quand même pour éviter les réessais en boucle ; la page de
    // retour réconcilie aussi le paiement.
  }

  return NextResponse.json({ received: true });
}
