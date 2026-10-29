import { redirect } from "next/navigation";

export default function LoginPage() {
  redirect("/profile?signin=1");
}
