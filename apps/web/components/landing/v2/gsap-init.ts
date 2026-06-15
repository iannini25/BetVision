import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// Register once at import time (safe on server; the plugin guards window internally),
// so any component importing gsap/ScrollTrigger from here has the plugin ready before
// useGSAP/useEffect run. Registering twice is a harmless no-op.
gsap.registerPlugin(ScrollTrigger)

export { gsap, ScrollTrigger }
