import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignOutButton } from "@/components/sign-out-button";

export default async function PendingPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.status === "APPROVED") {
    redirect("/dashboard");
  }

  const isRejected = session.user.status === "REJECTED";

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>
            {isRejected ? "Access not granted" : "Waiting for approval"}
          </CardTitle>
          <CardDescription>Signed in as {session.user.email}</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            {isRejected
              ? "The administrator of this Finnberry instance has not approved this account."
              : "The administrator of this Finnberry instance needs to approve your account before you can use it. Check back once they have."}
          </p>
          <SignOutButton />
        </CardContent>
      </Card>
    </div>
  );
}
