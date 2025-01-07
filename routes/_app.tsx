import { type PageProps } from "$fresh/server.ts";
export default function App({ Component }: PageProps) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>jmsn.link</title>
        <link rel="stylesheet" href="/main.css" />
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
}
