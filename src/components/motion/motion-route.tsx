"use client";

import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MotionEnhancements } from "./motion-enhancements";
import { motionTokens, routeVariants } from "./motion-tokens";

export function MotionRoute({children}:{children:ReactNode}) {
  const pathname=usePathname();
  const reduce=useReducedMotion();
  return <MotionConfig reducedMotion="user" transition={{duration:motionTokens.duration.standard,ease:motionTokens.ease}}>
    <AnimatePresence initial={false} mode="popLayout">
      <motion.div key={pathname} className="frontier-motion-route"
        initial={reduce?false:routeVariants.initial}
        animate={reduce?{opacity:1}:routeVariants.enter}
        exit={reduce?{opacity:1}:routeVariants.exit}
        transition={{duration:reduce?0:motionTokens.duration.route,ease:motionTokens.ease}}
      >
        <MotionEnhancements route={pathname}/>
        {children}
      </motion.div>
    </AnimatePresence>
  </MotionConfig>;
}
