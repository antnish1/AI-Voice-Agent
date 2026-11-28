/**
 * Frontier motion language. Transforms and opacity only for entrance/exit motion.
 * Interaction feedback is intentionally restrained and must never imply real activity.
 */
export const motionTokens = {
  duration: { press: .16, fast: .2, standard: .26, route: .25 },
  ease: [0.22, 1, 0.36, 1] as const,
  spring: { type: "spring" as const, stiffness: 360, damping: 32, mass: .86 },
  stagger: .045,
};
export const routeVariants = {
  initial: { opacity: 0, y: 7 },
  enter: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -3 },
};
