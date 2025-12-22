"use client";

import { Badge } from "@web/components/ui/badge";
import { motion } from "motion/react";

export function LiveBadge() {
  return (
    <Badge
      variant="outline"
      className="gap-2 border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
    >
      <motion.span
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="size-2 rounded-full bg-emerald-500"
      />
      Live
    </Badge>
  );
}
