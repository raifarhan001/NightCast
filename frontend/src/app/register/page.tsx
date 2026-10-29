import { redirect } from "next/navigation";

export default function RegisterPage() {
  redirect("/profile?signin=1&mode=register");
}
