import { Footer } from "@web/app/_components/footer";
import { Header } from "@web/app/_components/header";
import Analytics from "@web/components/analytics-tracker";
import { BackgroundEffects } from "@web/components/background-effects";
import type { ReactNode } from "react";

export default function MainLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <BackgroundEffects />
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="mx-auto my-16 w-screen max-w-4xl grow px-4 py-24">
          {children}
        </main>
        <Footer />
      </div>
      <Analytics />
    </>
  );
}
