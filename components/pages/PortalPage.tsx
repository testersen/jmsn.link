import type { Session } from "@/auth.ts";
import { expires, expiresIn, isAboutToExpireStr } from "@/client/session.ts";
import PingButtonComponent from "@/components/PingButtonComponent.tsx";
import CreateVanityUrlForm from "@/components/CreateVanityUrlForm.tsx";

interface PortalPageProps {
  session: Session;
}

export default function PortalPage(props: PortalPageProps) {
  expires.value = props.session.exp;

  return (
    <div>
      <div className="hero bg-base-200">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-5xl font-bold">Jameson Link</h1>
          </div>
        </div>
      </div>
      <div class="px-8 my-2">
        <p class="font-bold">
          Hello, {props.session.name}! Your session expires in{" "}
          <code>{expiresIn}</code>{" "}
          seconds. Your session will be updated with more time as soon as you
          perform an action or refresh the page.
        </p>
      </div>

      <CreateVanityUrlForm />
    </div>
  );
}
