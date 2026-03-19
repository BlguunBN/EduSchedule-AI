import { redirect } from "next/navigation";

// This route used to be a mock/prototype inbox page.
// Always send users to the real, authenticated inbox scan view.
export default function EmailsPage() {
  redirect("/dashboard/email");
}
