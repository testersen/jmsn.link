import { Head } from "$fresh/runtime.ts";
import { PageProps } from "$fresh/server.ts";
import { getRedirect } from "@/lib/links.ts";

export default async function Error404(props: PageProps) {
  const redirect = await getRedirect(new URL(props.url).pathname.slice(1));

  if (redirect) {
    return (
      <>
        <Head>
          <title>Redirecting {redirect.title}</title>
          <meta http-equiv="refresh" content={`0;url=${redirect.target}`} />
        </Head>
        <p>Redirecting to {redirect.title}</p>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>404 - Page not found</title>
      </Head>
      <p>Well this is embarrassing.</p>
    </>
  );
}
