import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ViewTransitions } from "next-view-transitions";
import type { ReactNode } from "react";
import { Providers } from "@/app/(blog)/providers";
import { BASE_URL, SITE_NAME } from "@/config";
import { cn } from "@/lib/utils";
import "@/app/(blog)/styles.css";

const geist = Geist({ subsets: ["latin"] });

const url = new URL(BASE_URL);

export const metadata: Metadata = {
  metadataBase: url,
  title: {
    default: "Sign In",
    template: `%s - ${SITE_NAME}`,
  },
  description: "Sign in to access your account",
  robots: {
    index: false,
    follow: false,
  },
};

const AuthLayout = ({ children }: Readonly<{ children: ReactNode }>) => {
  return (
    <html
      lang="en"
      className={cn("scroll-smooth", geist.className)}
      suppressHydrationWarning
    >
      <body className="bg-zinc-900 text-zinc-50" suppressHydrationWarning>
        <ViewTransitions>
          <Providers>{children}</Providers>
        </ViewTransitions>
      </body>
    </html>
  );
};

export default AuthLayout;
