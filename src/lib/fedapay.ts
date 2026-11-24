import { FedaPay, Transaction, Webhook } from "fedapay";

let configured = false;

/** Configure le SDK FedaPay à partir des variables d'environnement. */
export function initFedapay(): void {
  if (configured) return;
  const key = process.env.FEDAPAY_SECRET_KEY;
  if (!key) throw new Error("FEDAPAY_SECRET_KEY manquant");
  FedaPay.setApiKey(key);
  const env = process.env.FEDAPAY_ENVIRONMENT === "live" ? "live" : "sandbox";
  FedaPay.setEnvironment(env);
  configured = true;
}

export function fedapayConfigured(): boolean {
  return !!process.env.FEDAPAY_SECRET_KEY;
}

export { Transaction, Webhook };
