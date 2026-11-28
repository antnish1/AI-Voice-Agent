"use client";
import {motion,useIsPresent} from "motion/react";
import {usePremiumMotion} from "./motion-preference";
import type {ComponentProps} from "react";
export function AnimatedOverlay({children,...props}:ComponentProps<"div">){const premium=usePremiumMotion(),present=useIsPresent();return <motion.div {...props} inert={!present} initial={premium?{opacity:0}:false} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:premium?.16:0}}>{children}</motion.div>;}
