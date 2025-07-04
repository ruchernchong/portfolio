import Icon from "@/app/icon.png";
import ExternalLink from "@/components/external-link";
import * as Icons from "@/components/Icons";
import { navLinks } from "@/config";
import socials from "@/data/socials";
import Image from "next/image";
import Link from "next/link";

export const Footer = () => (
  <div className="mx-auto flex w-full max-w-4xl justify-center px-4 pb-6">
    <footer className="w-full rounded-2xl border border-white/10 bg-black/20 px-8 py-6 shadow-2xl backdrop-blur-lg">
      <div className="flex flex-col gap-y-6">
        <div className="flex flex-col gap-y-6 md:flex-row md:items-start md:justify-between">
          <Image src={Icon} width={48} height={48} alt="Logo" />
          <div className="flex gap-x-12 md:gap-x-16">
            <div className="flex flex-col gap-3">
              <Link
                href="/"
                className="text-sm font-medium text-gray-400 transition-colors duration-300 hover:text-white"
              >
                Home
              </Link>
              {navLinks.map(({ href, title }) => {
                return (
                  <Link
                    key={title}
                    href={href}
                    className="text-sm font-medium text-gray-400 transition-colors duration-300 hover:text-white"
                  >
                    {title}
                  </Link>
                );
              })}
            </div>
            <div className="flex flex-col gap-3">
              {socials.map(({ name, link }) => (
                <div key={name}>
                  <ExternalLink
                    href={link}
                    className="text-sm font-medium text-gray-400 transition-colors duration-300 hover:text-pink-500"
                    title={name}
                  >
                    <div className="inline-flex items-center gap-x-2">
                      <Icons.Social name={name} className="h-4 w-4" />
                      {name}
                    </div>
                  </ExternalLink>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="text-center text-sm text-gray-400 md:text-left">
          &copy; {new Date().getFullYear()} Chong Ru Chern. All Rights Reserved.
        </div>
      </div>
    </footer>
  </div>
);
