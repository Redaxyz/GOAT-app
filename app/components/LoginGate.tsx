import { getActiveProfile } from "@/lib/session";
import LoginScreen from "@/app/components/LoginScreen";

export default async function LoginGate() {
  const profile = await getActiveProfile();
  return <LoginScreen initialShow={!profile} />;
}
