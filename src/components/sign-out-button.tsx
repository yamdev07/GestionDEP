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
      <Button variant="outline" className="w-full text-danger" type="submit">
        <LogOut className="h-4 w-4" />
        Se déconnecter
      </Button>
    </form>
  );
}
