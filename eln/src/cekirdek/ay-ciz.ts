/**
 * Ayı gerçek evresiyle çizer (kuzey yarımkürede göründüğü gibi).
 * evre: 0 yeni ay, 0.25 ilk dördün, 0.5 dolunay, 0.75 son dördün
 */
export function ayCiz(x: CanvasRenderingContext2D, cx: number, cy: number, r: number, evre: number, parlaklik = 1, golge = 1) {
  x.save()
  x.translate(cx, cy)
  // karanlık yüz (hafifçe görünür: "dünya ışığı"; gündüz gökyüzünde görünmez → golge 0)
  x.fillStyle = `rgba(70, 78, 120, ${0.28 * parlaklik * golge})`
  x.beginPath()
  x.arc(0, 0, r, 0, Math.PI * 2)
  x.fill()

  let p = evre
  if (p > 0.5) {
    x.scale(-1, 1) // küçülen ay: aydınlık taraf solda
    p = 1 - p
  }
  const k = Math.cos(p * Math.PI * 2) // 1 → yeni, -1 → dolunay
  const g = x.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r)
  g.addColorStop(0, `rgba(255, 249, 236, ${parlaklik})`)
  g.addColorStop(1, `rgba(222, 210, 188, ${parlaklik})`)
  x.fillStyle = g
  x.beginPath()
  x.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false)
  x.ellipse(0, 0, Math.max(0.001, Math.abs(k) * r), r, 0, Math.PI / 2, -Math.PI / 2, k > 0)
  x.closePath()
  x.fill()

  // birkaç yumuşak krater
  x.globalCompositeOperation = 'source-atop'
  x.fillStyle = `rgba(140, 130, 125, ${0.3 * parlaklik})`
  for (const [ox, oy, or] of [
    [-0.3, -0.2, 0.18],
    [0.25, 0.3, 0.12],
    [0.1, -0.45, 0.09],
    [-0.15, 0.4, 0.14],
    [0.4, -0.1, 0.08],
  ]) {
    x.beginPath()
    x.arc(ox * r, oy * r, or * r, 0, Math.PI * 2)
    x.fill()
  }
  x.restore()
}
