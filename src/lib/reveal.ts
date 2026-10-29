import { useEffect, type RefObject } from 'react'

/** Añade .is-in a los elementos [data-reveal] de un contenedor cuando entran en pantalla. */
export function useReveal(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current
    if (!el) return
    const targets = el.querySelectorAll<HTMLElement>('[data-reveal]')
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in')
            io.unobserve(entry.target)
          }
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
    )
    targets.forEach((t) => io.observe(t))
    return () => io.disconnect()
  }, [root])
}
