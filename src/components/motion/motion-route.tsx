"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {usePremiumMotion} from "./motion-preference";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { MotionEnhancements } from "./motion-enhancements";
import { motionTokens, routeVariants } from "./motion-tokens";

export function MotionRoute({children}:{children:ReactNode}) {
  const pathname=usePathname();
  const reduce=!usePremiumMotion();
  return <MotionConfig reducedMotion="user" transition={{duration:motionTokens.duration.standard,ease:motionTokens.ease}}>
    <AnimatePresence initial={false} mode="popLayout">
      <motion.div key={pathname} className="frontier-motion-route"
        initial={reduce?false:routeVariants.initial}
        animate={reduce?{opacity:1}:routeVariants.enter}
        exit={{opacity:1,transition:{duration:0}}}
        transition={{duration:reduce?0:motionTokens.duration.route,ease:motionTokens.ease}}
      >
        <MotionEnhancements route={pathname} enabled={!reduce}/>
        {children}
      </motion.div>
    </AnimatePresence>
  </MotionConfig>;
}
