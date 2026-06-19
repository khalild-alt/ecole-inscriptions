// src/components/ScrollArrows.jsx
import { useRef, useState, useEffect, useCallback } from 'react'

/**
 * Wrapper réutilisable pour les zones à scroll horizontal et/ou vertical.
 * Ajoute des flèches cliquables ◀ ▶ (et ▲ ▼ si vertical=true) qui apparaissent
 * uniquement quand un scroll est possible dans cette direction.
 *
 * Usage :
 *   <ScrollArrows>
 *     <table>...</table>
 *   </ScrollArrows>
 *
 *   <ScrollArrows vertical maxHeight={400}>
 *     <ListeLongue />
 *   </ScrollArrows>
 */
export default function ScrollArrows({ children, vertical = false, maxHeight, step = 220, style = {} }) {
  const ref = useRef(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(false)
  const [canUp, setCanUp] = useState(false)
  const [canDown, setCanDown] = useState(false)

  const checkScroll = useCallback(() => {
    const el = ref.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
    if (vertical) {
      setCanUp(el.scrollTop > 4)
      setCanDown(el.scrollTop < el.scrollHeight - el.clientHeight - 4)
    }
  }, [vertical])

  useEffect(() => {
    checkScroll()
    const el = ref.current
    if (!el) return
    el.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
      ro.disconnect()
    }
  }, [checkScroll, children])

  function scrollBy(dx, dy) {
    ref.current?.scrollBy({ left: dx, top: dy, behavior: 'smooth' })
  }

  const arrowBtnStyle = (extra = {}) => ({
    position: 'absolute',
    zIndex: 5,
    width: 32,
    height: 32,
    borderRadius: '50%',
    border: 'none',
    background: 'var(--accent2, #e8925a)',
    color: 'white',
    fontSize: '1rem',
    fontWeight: 900,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.15s, transform 0.1s',
    ...extra,
  })

  return (
    <div style={{ position: 'relative', ...style }}>
      {canLeft && (
        <button
          aria-label="Défiler vers la gauche"
          onClick={() => scrollBy(-step, 0)}
          style={arrowBtnStyle({ left: 4, top: '50%', transform: 'translateY(-50%)' })}
          onMouseDown={e => e.currentTarget.style.transform = 'translateY(-50%) scale(0.92)'}
          onMouseUp={e => e.currentTarget.style.transform = 'translateY(-50%) scale(1)'}
        >◀</button>
      )}
      {canRight && (
        <button
          aria-label="Défiler vers la droite"
          onClick={() => scrollBy(step, 0)}
          style={arrowBtnStyle({ right: 4, top: '50%', transform: 'translateY(-50%)' })}
          onMouseDown={e => e.currentTarget.style.transform = 'translateY(-50%) scale(0.92)'}
          onMouseUp={e => e.currentTarget.style.transform = 'translateY(-50%) scale(1)'}
        >▶</button>
      )}
      {vertical && canUp && (
        <button
          aria-label="Défiler vers le haut"
          onClick={() => scrollBy(0, -step)}
          style={arrowBtnStyle({ top: 4, left: '50%', transform: 'translateX(-50%)' })}
        >▲</button>
      )}
      {vertical && canDown && (
        <button
          aria-label="Défiler vers le bas"
          onClick={() => scrollBy(0, step)}
          style={arrowBtnStyle({ bottom: 4, left: '50%', transform: 'translateX(-50%)' })}
        >▼</button>
      )}
      <div
        ref={ref}
        className="scroll-x"
        style={{
          overflowX: 'auto',
          overflowY: vertical ? 'auto' : 'visible',
          maxHeight: vertical ? maxHeight : undefined,
          overscrollBehaviorX: 'contain',
        }}
      >
        {children}
      </div>
    </div>
  )
}
