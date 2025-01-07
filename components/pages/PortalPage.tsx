import type { Session } from "@/auth.ts";
import { expires, expiresIn, isAboutToExpireStr } from "@/client/session.ts";
import PingButtonComponent from "@/components/PingButtonComponent.tsx";

interface PortalPageProps {
  session: Session;
}

export default function PortalPage(props: PortalPageProps) {
  expires.value = props.session.exp;

  return (
    <div>
      <p>hello {props.session.name}</p>
      <p>Session expires in {expiresIn}</p>
      <p>Is session about to expire?: {isAboutToExpireStr}</p>
      <PingButtonComponent />
    </div>
  );
}
