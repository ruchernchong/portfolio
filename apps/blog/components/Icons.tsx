import type { SocialMedia } from "@/types";
import {
  type IconType,
  SiBluesky,
  SiGithub,
  SiLinkedin,
  SiStackoverflow,
  SiThreads,
  SiX,
} from "@icons-pack/react-simple-icons";
import classNames from "classnames";

type SocialIcon = {
  [key in SocialMedia]: IconType;
};

const SOCIAL_ICONS_MAP: SocialIcon = {
  Github: SiGithub,
  Linkedin: SiLinkedin,
  Stackoverflow: SiStackoverflow,
  Twitter: SiX,
  Bluesky: SiBluesky,
  Threads: SiThreads,
};

type Props = {
  name: SocialMedia;
  className?: string;
};

export const Social = ({ name, className }: Props) => {
  const Icon = SOCIAL_ICONS_MAP[name];
  const title = Object.keys(SOCIAL_ICONS_MAP).find((item) => item === name);

  return <Icon title={title} className={classNames(className)} />;
};
