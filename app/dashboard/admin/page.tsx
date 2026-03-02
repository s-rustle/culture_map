import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const user = await getSession();
  if (!user?.is_admin) redirect("/dashboard");

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-brand-dark-bg mb-2">Admin</h2>
      <p className="text-brand-charcoal-violet">
        Manage all coach subscriptions, override assignments, approve notifications. Coming soon.
      </p>
    </div>
  );
}
