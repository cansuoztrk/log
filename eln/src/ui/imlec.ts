import { dokunmatik } from '../bolumler/yardimci'

/** Masaüstünde ışıktan bir imleç; telefonda dokunulan yerde küçük bir ışık. */
export function imlecKur() {
  if (dokunmatik || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.addEventListener(
      'pointerdown',
      (e) => {
        if (e.pointerType !== 'touch') return
        const d = document.createElement('span')
        d.className = 'dokunus'
        d.style.left = `${e.clientX}px`
        d.style.top = `${e.clientY}px`
        document.body.appendChild(d)
        window.setTimeout(() => d.remove(), 900)
      },
      { passive: true },
    )
    return
  }
  const nokta = document.createElement('div')
  nokta.className = 'imlec'
  const hale = document.createElement('div')
  hale.className = 'imlec-hale'
  document.body.append(nokta, hale)
  document.documentElement.classList.add('imlecli')
  let x = innerWidth / 2
  let y = innerHeight / 2
  let hx = x
  let hy = y
  window.addEventListener('pointermove', (e) => {
    if (nokta.style.opacity !== '1') nokta.style.opacity = hale.style.opacity = '1'
    x = e.clientX
    y = e.clientY
    const t = e.target as Element | null
    hale.classList.toggle('buyuk', !!t?.closest('button, a, label, canvas.nehir-tuval, canvas.bahce-tuval, canvas.gok, textarea, .tekerlek'))
  })
  document.addEventListener('pointerleave', () => (nokta.style.opacity = hale.style.opacity = '0'))
  document.addEventListener('pointerenter', () => (nokta.style.opacity = hale.style.opacity = '1'))
  const dongu = () => {
    hx += (x - hx) * 0.16
    hy += (y - hy) * 0.16
    nokta.style.transform = `translate3d(${x}px, ${y}px, 0)`
    hale.style.transform = `translate3d(${hx}px, ${hy}px, 0)`
    requestAnimationFrame(dongu)
  }
  requestAnimationFrame(dongu)
}
