import { LogOut } from "lucide-react";
import { signOut } from "@/auth";
import { Button } from "@/components/ui";

export function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <Button variant="ghost" size="icon" title="Se déconnecter" type="submit">
        <LogOut className="h-5 w-5" />
      </Button>
    </form>
  );
}
