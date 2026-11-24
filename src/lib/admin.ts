/**
 * Admin global : déterminé par la variable d'environnement ADMIN_EMAIL.
 * Code exécuté côté serveur uniquement (ne pas importer dans un composant client).
 */
export function getAdminEmail(): string {
  return (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
}

export function isAdmin(email?: string | null): boolean {
  const admin = getAdminEmail();
  return admin !== "" && !!email && email.trim().toLowerCase() === admin;
}
