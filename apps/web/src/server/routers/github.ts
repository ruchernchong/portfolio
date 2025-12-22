import {
  getGitHubContributions,
  getGitHubFollowers,
  getGitHubStars,
} from "@web/lib/github";
import { publicProcedure, router } from "../trpc";

export const githubRouter = router({
  getFollowers: publicProcedure.query(() => getGitHubFollowers()),
  getStars: publicProcedure.query(() => getGitHubStars()),
  getContributions: publicProcedure.query(() => getGitHubContributions()),
});
