import type { Session } from "../auth.ts";
import PortalPage from "../components/pages/PortalPage.tsx";

export interface PortalIslandProps {
  session: Session;
}

export default function PortalIsland(props: PortalIslandProps) {
  return <PortalPage session={props.session} />;
}
