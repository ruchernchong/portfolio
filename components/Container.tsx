import Head from "next/head";
import { useRouter } from "next/router";
import Navbar from "components/Navbar";
import Footer from "./Footer";

import { HOST_URL } from "lib/config";

export default function Container(props) {
  const { children, ...customMeta } = props;
  const router = useRouter();
  const meta = {
    title: "Home - Ru Chern",
    description:
      "Frontend developer with believe that using technology, we are able to change how the way we automate things to make living more efficient and smarter.",
    image: `${HOST_URL}/banner-image.jpg`,
    type: "website",
    ...customMeta,
  };

  return (
    <div className="bg-neutral-50 dark:bg-neutral-900">
      <Head>
        <title>{meta.title}</title>
        <meta name="robots" content="follow, index" />
        <meta content={meta.description} name="description" />
        <meta property="og:url" content={`${HOST_URL}${router.asPath}`} />
        <link rel="canonical" href={`${HOST_URL}${router.asPath}`} />
        <meta property="og:type" content={meta.type} />
        <meta property="og:site_name" content="Ru Chern" />
        <meta property="og:description" content={meta.description} />
        <meta property="og:title" content={meta.title} />
        <meta property="og:image" content={meta.image} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@ruchernchong" />
        <meta name="twitter:title" content={meta.title} />
        <meta name="twitter:description" content={meta.description} />
        <meta name="twitter:image" content={meta.image} />
        {meta.date && (
          <meta property="article:published_time" content={meta.date} />
        )}
      </Head>
      <Navbar />
      <main className="mx-auto max-w-4xl px-8">
        {children}
        <Footer />
      </main>
    </div>
  );
}