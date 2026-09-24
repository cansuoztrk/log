import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { GLSL_GURULTU, type GLSahne, isikLekesi } from './ortak'

/**
 * Çay Günü — 21 Mayıs, Dünya Çay Günü.
 * Solda benim ince belli bardağım (İstanbul), sağda senin armudu stəkanın (Bakı).
 * Kaydırdıkça önce seninki, sonra benimki dolar; buharlar ortada bir kalp çizer.
 */

type Profil = [number, number][]
const INCE_BELLI: Profil = [
  [0.0, 0.0], [0.19, 0.0], [0.222, 0.02], [0.236, 0.08], [0.238, 0.18], [0.214, 0.3], [0.178, 0.42],
  [0.172, 0.5], [0.196, 0.62], [0.24, 0.76], [0.272, 0.88], [0.289, 0.97], [0.292, 1.0],
]
const ARMUDU: Profil = [
  [0.0, 0.0], [0.17, 0.0], [0.214, 0.02], [0.258, 0.09], [0.274, 0.2], [0.256, 0.33], [0.204, 0.47],
  [0.17, 0.58], [0.177, 0.7], [0.212, 0.84], [0.242, 0.95], [0.248, 1.0],
]

function yumusat(p: Profil, n = 64) {
  const e = new THREE.SplineCurve(p.map(([r, y]) => new THREE.Vector2(r, y)))
  return e.getPoints(n)
}

function yaricapBul(noktalar: THREE.Vector2[], y: number) {
  for (let i = 1; i < noktalar.length; i++) {
    const a = noktalar[i - 1]
    const b = noktalar[i]
    if ((a.y <= y && b.y >= y) || (a.y >= y && b.y <= y)) {
      const t = (y - a.y) / (b.y - a.y || 1)
      return a.x + (b.x - a.x) * t
    }
  }
  return noktalar[noktalar.length - 1].x
}

const CAM_VS = /* glsl */ `
  varying vec3 vN; varying vec3 vV; varying vec3 vNv; varying vec3 vO;
  void main(){
    vO = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNv = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }`

function camMalzeme(yan: THREE.Side) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: yan,
    uniforms: { uArka: { value: yan === THREE.BackSide ? 1 : 0 } },
    vertexShader: CAM_VS,
    fragmentShader: /* glsl */ `
      uniform float uArka; varying vec3 vV; varying vec3 vNv; varying vec3 vO;
      void main(){
        vec3 n = normalize(vNv) * (uArka > 0.5 ? -1.0 : 1.0);
        float f = pow(1.0 - abs(dot(n, vV)), 2.2);
        // stüdyo ışığı gibi dikey parlak çizgiler
        float s1 = exp(-pow((n.x - 0.62) / 0.07, 2.0));
        float s2 = exp(-pow((n.x + 0.45) / 0.12, 2.0)) * 0.35;
        float bel = smoothstep(0.02, 0.12, vO.y) * smoothstep(1.02, 0.9, vO.y);
        vec3 c = mix(vec3(0.95, 0.9, 0.85), vec3(1.0, 0.85, 0.65), f);
        float a = 0.035 + f * 0.5 + (s1 * 0.55 + s2) * bel;
        a *= uArka > 0.5 ? 0.5 : 1.0;
        gl_FragColor = vec4(c, a);
      }`,
  })
}

function cayMalzeme() {
  return new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { uDolu: { value: 0 }, uZaman: { value: 0 } },
    vertexShader: CAM_VS,
    fragmentShader: /* glsl */ `
      uniform float uDolu; varying vec3 vV; varying vec3 vNv; varying vec3 vO;
      void main(){
        if (vO.y > uDolu) discard;
        float yuz = abs(dot(normalize(vNv), vV));
        // ortası derin kırmızı ("tavşan kanı"), kenarları arkadan ışık alan kehribar
        vec3 derin = vec3(0.36, 0.05, 0.02);
        vec3 kehribar = vec3(0.98, 0.42, 0.12);
        vec3 c = mix(kehribar, derin, pow(yuz, 0.7));
        c *= 0.75 + 0.35 * smoothstep(0.0, 0.8, vO.y);
        float s = exp(-pow((vNv.x - 0.6) / 0.08, 2.0)) * 0.6;
        c += vec3(1.0, 0.8, 0.6) * s;
        // yüzeye yakın hafif parlaklık
        c += vec3(0.6, 0.25, 0.05) * smoothstep(uDolu - 0.05, uDolu, vO.y) * 0.4;
        gl_FragColor = vec4(c, 0.93);
      }`,
  })
}

function yuzeyMalzeme() {
  return new THREE.ShaderMaterial({
    transparent: true,
    uniforms: { uZaman: { value: 0 }, uDalga: { value: 0 } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uZaman, uDalga; varying vec2 vUv;
      void main(){
        vec2 p = vUv - 0.5;
        float r = length(p) * 2.0;
        vec3 c = mix(vec3(0.5, 0.1, 0.03), vec3(0.85, 0.35, 0.1), smoothstep(0.4, 1.0, r));
        float parlak = exp(-pow((p.x + 0.12) / 0.08, 2.0) - pow((p.y - 0.18) / 0.25, 2.0));
        c += vec3(1.0, 0.85, 0.7) * parlak * 0.5;
        float halka = sin(r * 40.0 - uZaman * 10.0) * exp(-r * 3.0) * uDalga;
        c += vec3(1.0, 0.7, 0.4) * max(halka, 0.0) * 0.5;
        gl_FragColor = vec4(c, 0.96);
      }`,
  })
}

function porselenMalzeme(kenar: number, ic: number) {
  return new THREE.ShaderMaterial({
    uniforms: { uKenar: { value: new THREE.Color(kenar) }, uIc: { value: new THREE.Color(ic) } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vW; varying vec3 vO;
      void main(){ vO = position; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uKenar, uIc; varying vec3 vN; varying vec3 vW; varying vec3 vO;
      void main(){
        vec3 L = normalize(vec3(-0.4, 1.0, 0.6));
        float dif = max(dot(vN, L), 0.0);
        vec3 goz = normalize(cameraPosition - vW);
        float spek = pow(max(dot(reflect(-L, vN), goz), 0.0), 40.0);
        float r = length(vO.xz);
        vec3 renk = vec3(0.93, 0.9, 0.86);
        renk = mix(renk, uKenar, smoothstep(0.43, 0.445, r) * (1.0 - smoothstep(0.47, 0.485, r)));
        renk = mix(renk, uIc, smoothstep(0.3, 0.31, r) * (1.0 - smoothstep(0.318, 0.328, r)));
        renk = mix(renk, vec3(0.95, 0.75, 0.4), smoothstep(0.505, 0.515, r));
        vec3 c = renk * (0.22 + 0.7 * dif) + spek * 0.5;
        c *= vec3(1.0, 0.92, 0.84);
        gl_FragColor = vec4(c, 1.0);
      }`,
  })
}

function masaMalzeme() {
  return new THREE.ShaderMaterial({
    uniforms: { uSol: { value: 0 }, uSag: { value: 0 }, uSolX: { value: -0.6 }, uSagX: { value: 0.6 } },
    vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform float uSol, uSag, uSolX, uSagX; varying vec3 vW;
      ${GLSL_GURULTU}
      void main(){
        float r = length(vW.xz * vec2(0.7, 1.0));
        float spot = exp(-r * r * 0.45);
        float lif = fbm(vec2(vW.x * 1.2, vW.z * 14.0)) * 0.5 + 0.5;
        vec3 c = vec3(0.13, 0.07, 0.045) * lif * (0.25 + 1.1 * spot);
        // bardakların altında yumuşak gölge
        c *= 1.0 - 0.6 * exp(-pow(length(vW.xz - vec2(uSolX, 0.0)) / 0.55, 2.0));
        c *= 1.0 - 0.6 * exp(-pow(length(vW.xz - vec2(uSagX, 0.0)) / 0.55, 2.0));
        // çaydan süzülen kehribar ışık (kostik)
        c += vec3(0.9, 0.35, 0.08) * exp(-pow(length(vW.xz - vec2(uSolX + 0.12, 0.25)) / 0.22, 2.0)) * uSol * 0.35;
        c += vec3(0.9, 0.35, 0.08) * exp(-pow(length(vW.xz - vec2(uSagX + 0.12, 0.25)) / 0.22, 2.0)) * uSag * 0.35;
        gl_FragColor = vec4(c, 1.0);
      }`,
  })
}

interface Bardak {
  grup: THREE.Group
  cay: THREE.ShaderMaterial
  yuzey: THREE.Mesh
  yuzeyMat: THREE.ShaderMaterial
  ic: THREE.Vector2[]
  dolu: number
  hedef: number
  sallan: number
  isabet: THREE.Mesh
}

function bardakKur(profil: Profil, x: number, altin: boolean, tabakKenar: number, tabakIc: number): Bardak {
  const grup = new THREE.Group()
  grup.position.x = x
  const dis = yumusat(profil)
  const geo = new THREE.LatheGeometry(dis, 64)
  const arka = new THREE.Mesh(geo, camMalzeme(THREE.BackSide))
  const on = new THREE.Mesh(geo, camMalzeme(THREE.FrontSide))
  arka.renderOrder = 2
  on.renderOrder = 4
  arka.position.y = on.position.y = 0.035
  // çay (içte, dipten biraz yukarıda)
  const ic = dis.filter((p) => p.y >= 0.055).map((p) => new THREE.Vector2(Math.max(0.001, p.x * 0.9), p.y))
  ic.unshift(new THREE.Vector2(0.001, 0.055))
  const cay = cayMalzeme()
  const cayM = new THREE.Mesh(new THREE.LatheGeometry(ic, 64), cay)
  cayM.renderOrder = 3
  cayM.position.y = 0.035
  const yuzeyMat = yuzeyMalzeme()
  const yuzey = new THREE.Mesh(new THREE.CircleGeometry(1, 48), yuzeyMat)
  yuzey.rotation.x = -Math.PI / 2
  yuzey.renderOrder = 3
  yuzey.visible = false
  grup.add(arka, cayM, yuzey, on)
  // ağız kenarı
  const agiz = dis[dis.length - 1]
  const kenar = new THREE.Mesh(
    new THREE.TorusGeometry(agiz.x, 0.005, 8, 64),
    new THREE.MeshBasicMaterial({ color: altin ? 0xf2c27b : 0xfff6ea, transparent: true, opacity: altin ? 0.9 : 0.55 }),
  )
  kenar.rotation.x = Math.PI / 2
  kenar.position.y = agiz.y + 0.035
  grup.add(kenar)
  if (altin) {
    const bel = new THREE.Mesh(new THREE.TorusGeometry(yaricapBul(dis, 0.58) + 0.002, 0.004, 8, 64), kenar.material)
    bel.rotation.x = Math.PI / 2
    bel.position.y = 0.615
    grup.add(bel)
  }
  // tabak
  const tabakP = yumusat([
    [0.0, 0.0], [0.3, 0.0], [0.33, 0.012], [0.44, 0.03], [0.5, 0.055], [0.52, 0.062], [0.515, 0.068], [0.47, 0.05], [0.33, 0.025], [0.0, 0.022],
  ], 40)
  const tabak = new THREE.Mesh(new THREE.LatheGeometry(tabakP, 72), porselenMalzeme(tabakKenar, tabakIc))
  grup.add(tabak)
  // dokunma için görünmez silindir
  const isabet = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.05, 12), new THREE.MeshBasicMaterial({ visible: false }))
  isabet.position.y = 0.55
  grup.add(isabet)
  return { grup, cay, yuzey, yuzeyMat, ic, dolu: 0, hedef: 0, sallan: 0, isabet }
}

export class Cay implements GLSahne {
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(36, 1, 0.05, 60)
  ilerleme = 0
  private p = 0
  private benim: Bardak
  private senin: Bardak
  private masa: THREE.ShaderMaterial
  private buhar: THREE.ShaderMaterial
  private akis: THREE.Mesh
  private sekerler: THREE.Mesh[] = []
  private dusenSeker: { m: THREE.Mesh; t: number; bas: THREE.Vector3 } | null = null
  private sekerSayisi = 0
  private raycaster = new THREE.Raycaster()
  private w = 1
  private h = 1
  private sonDokunus: { hangi: Bardak; an: number } | null = null
  onSing: ((hangisi: 'ben' | 'sen') => void) | null = null
  onNus: (() => void) | null = null
  onSeker: ((n: number) => void) | null = null

  constructor() {
    this.scene.background = new THREE.Color(0x07050a)
    // arka fon: sıcak bir ışık halesi
    const fon = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 16),
      new THREE.ShaderMaterial({
        depthWrite: false,
        vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `
          varying vec2 vUv;
          void main(){
            vec2 p = (vUv - vec2(0.5, 0.42)) * vec2(1.9, 1.0);
            float r = length(p);
            vec3 c = mix(vec3(0.2, 0.09, 0.055), vec3(0.028, 0.02, 0.035), smoothstep(0.0, 0.55, r));
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    )
    fon.position.set(0, 2.5, -6)
    this.scene.add(fon)

    this.masa = masaMalzeme()
    const masa = new THREE.Mesh(new THREE.CircleGeometry(9, 64), this.masa)
    masa.rotation.x = -Math.PI / 2
    this.scene.add(masa)

    // Benim ince belli bardağım (solda, kırmızı–altın tabak) · senin armudun (sağda, lacivert–altın tabak)
    this.benim = bardakKur(INCE_BELLI, -0.6, false, 0xb3261e, 0xd4a24a)
    this.senin = bardakKur(ARMUDU, 0.6, true, 0x1f3f8f, 0xd4a24a)
    this.scene.add(this.benim.grup, this.senin.grup)

    // şeker küpleri (benim tabağımda)
    const sekerMat = new THREE.MeshBasicMaterial({ color: 0xf4efe6 })
    for (let i = 0; i < 2; i++) {
      const s = new THREE.Mesh(new RoundedBoxGeometry(0.075, 0.075, 0.075, 2, 0.012), sekerMat)
      s.position.set(-0.6 - 0.36 + i * 0.09, 0.075, 0.2 + i * 0.05)
      s.rotation.y = i * 0.5
      this.sekerler.push(s)
      this.scene.add(s)
    }
    // mürəbbə kâsesi (senin tabağında)
    const kase = new THREE.Mesh(
      new THREE.LatheGeometry(yumusat([[0.0, 0.0], [0.07, 0.0], [0.1, 0.03], [0.115, 0.07], [0.118, 0.075]], 20), 40),
      camMalzeme(THREE.FrontSide),
    )
    kase.position.set(0.6 + 0.36, 0.035, 0.18)
    this.scene.add(kase)
    const recel = new THREE.Mesh(new THREE.CircleGeometry(0.1, 32), new THREE.MeshBasicMaterial({ color: 0x7a0f1c }))
    recel.rotation.x = -Math.PI / 2
    recel.position.set(0.96, 0.095, 0.18)
    this.scene.add(recel)
    const recelParlak = isikLekesi(0xff6070, 0.12, 0.25)
    recelParlak.position.set(0.94, 0.1, 0.2)
    this.scene.add(recelParlak)

    // demlikten akan çay
    this.akis = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.02, 1, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xc2501c, transparent: true, opacity: 0.85 }),
    )
    this.akis.visible = false
    this.scene.add(this.akis)

    // buhar → kalp
    this.buhar = this.buharKur()

    // tepe ışığı hissi
    const tepe = isikLekesi(0xffc58a, 7, 0.12)
    tepe.position.set(0, 3.2, -2)
    this.scene.add(tepe)
  }

  private buharKur() {
    const N = 700
    const rnd = new Float32Array(N)
    const yan = new Float32Array(N)
    const faz = new Float32Array(N)
    const kalp = new Float32Array(N)
    for (let i = 0; i < N; i++) {
      rnd[i] = Math.random()
      yan[i] = i % 2 ? 1 : -1
      faz[i] = Math.random()
      kalp[i] = Math.random()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3))
    g.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 1))
    g.setAttribute('aYan', new THREE.BufferAttribute(yan, 1))
    g.setAttribute('aFaz', new THREE.BufferAttribute(faz, 1))
    g.setAttribute('aKalp', new THREE.BufferAttribute(kalp, 1))
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uZaman: { value: 0 },
        uSol: { value: 0 },
        uSag: { value: 0 },
        uKalp: { value: 0 },
        uPx: { value: 1 },
        uSolX: { value: -0.6 },
        uSagX: { value: 0.6 },
      },
      vertexShader: /* glsl */ `
        attribute float aRnd, aYan, aFaz, aKalp;
        uniform float uZaman, uSol, uSag, uKalp, uPx, uSolX, uSagX;
        varying float vA;
        void main(){
          float hiz = 0.07 + aRnd * 0.05;
          float f = fract(aFaz + uZaman * hiz);
          float x0 = aYan < 0.0 ? uSolX : uSagX;
          float y0 = aYan < 0.0 ? 1.0 : 1.03;
          float guc = aYan < 0.0 ? uSol : uSag;
          vec3 p = vec3(x0, y0, 0.0);
          p.y += f * 1.25;
          p.x += sin(f * 7.0 + aRnd * 6.28 + uZaman * 0.8) * 0.06 * (0.25 + f) + (aRnd - 0.5) * 0.14 * f;
          p.z += cos(f * 5.0 + aRnd * 9.0) * 0.05 * f;
          // kalp: soldaki buhar kalbin sol yarısını, sağdaki sağ yarısını çizer
          float t = (aYan < 0.0 ? 3.14159 : 0.0) + aKalp * 3.14159;
          float hx = 16.0 * pow(sin(t), 3.0);
          float hy = 13.0 * cos(t) - 5.0 * cos(2.0 * t) - 2.0 * cos(3.0 * t) - cos(4.0 * t);
          vec3 kp = vec3(hx, hy, 0.0) * 0.03 + vec3(0.0, 1.95, 0.0);
          kp.x += sin(uZaman * 1.3 + aRnd * 20.0) * 0.012;
          kp.y += cos(uZaman * 1.1 + aRnd * 17.0) * 0.012;
          float k = smoothstep(0.25, 0.7, f) * uKalp;
          p = mix(p, kp, k);
          vA = sin(f * 3.14159) * guc * (0.4 + 0.6 * k) * (0.5 + 0.5 * aRnd);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uPx * (0.05 + aRnd * 0.09) * (1.0 - k * 0.5) / -mv.z;
        }`,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vec3(1.0, 0.9, 0.82), a * a * vA * 0.45);
        }`,
    })
    const pts = new THREE.Points(g, m)
    pts.frustumCulled = false
    pts.renderOrder = 6
    this.scene.add(pts)
    return m
  }

  boyut(w: number, h: number, px: number) {
    this.w = w
    this.h = h
    this.camera.aspect = w / h
    this.camera.fov = w < h ? 44 : 32
    this.camera.updateProjectionMatrix()
    // dünya birimini piksele çeviren katsayı
    this.buhar.uniforms.uPx.value = (px * h) / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)))
  }

  guncelle(dt: number, t: number) {
    this.p += (this.ilerleme - this.p) * Math.min(1, dt * 3)
    const p = this.p
    const dikey = this.h > this.w
    const aci = -0.28 + p * 0.5 + Math.sin(t * 0.2) * 0.03
    const uzak = dikey ? 6.1 : 4.7
    this.camera.position.set(Math.sin(aci) * uzak, 1.55 - p * 0.15, Math.cos(aci) * uzak)
    this.camera.lookAt(0, dikey ? 1.05 : 0.95, 0)
    // geniş ekranda sahne sağa kayar, soldaki yazıya yer açılır
    if (dikey) this.camera.clearViewOffset()
    else this.camera.setViewOffset(this.w, this.h, -0.2 * this.w, 0, this.w, this.h)

    // doldurma: önce senin bardağın, sonra benimki
    const doldur = (a: number, b: number) => Math.min(1, Math.max(0, (p - a) / (b - a)))
    this.senin.hedef = 0.86 * doldur(0.12, 0.4)
    this.benim.hedef = 0.86 * doldur(0.44, 0.72)
    let akan: Bardak | null = null
    for (const b of [this.senin, this.benim]) {
      const once = b.dolu
      b.dolu += (b.hedef - b.dolu) * Math.min(1, dt * 2.5)
      if (b.hedef - once > 0.004 && b.hedef - b.dolu > 0.012) akan = b
      const y = Math.max(0.056, b.dolu)
      b.cay.uniforms.uDolu.value = b.dolu > 0.06 ? y : 0
      b.yuzey.visible = b.dolu > 0.06
      const r = yaricapBul(b.ic, y) * 0.99
      b.yuzey.scale.setScalar(r)
      b.yuzey.position.y = y + 0.035
      b.yuzeyMat.uniforms.uZaman.value = t
      b.yuzeyMat.uniforms.uDalga.value *= 0.985
      // dokununca hafif sallanma
      b.sallan *= 0.9
      b.grup.rotation.z = Math.sin(t * 30) * b.sallan * 0.04
    }
    if (akan) {
      const ust = 3.2
      const alt = akan.dolu + 0.035
      this.akis.visible = true
      this.akis.position.set(akan.grup.position.x + 0.02, (ust + alt) / 2, 0)
      this.akis.scale.set(1 + Math.sin(t * 40) * 0.1, ust - alt, 1)
    } else this.akis.visible = false

    this.masa.uniforms.uSol.value = this.benim.dolu
    this.masa.uniforms.uSag.value = this.senin.dolu
    this.buhar.uniforms.uZaman.value = t
    this.buhar.uniforms.uSag.value = Math.min(1, this.senin.dolu * 1.4)
    this.buhar.uniforms.uSol.value = Math.min(1, this.benim.dolu * 1.4)
    this.buhar.uniforms.uKalp.value = Math.min(1, Math.max(0, (p - 0.74) / 0.18))

    // düşen şeker
    if (this.dusenSeker) {
      const d = this.dusenSeker
      d.t += dt * 1.6
      const hedef = new THREE.Vector3(this.benim.grup.position.x, this.benim.dolu + 0.02, 0)
      const k = Math.min(1, d.t)
      d.m.position.lerpVectors(d.bas, hedef, k)
      d.m.position.y += Math.sin(k * Math.PI) * 0.6
      d.m.rotation.x += dt * 6
      if (k >= 1) {
        d.m.visible = false
        this.benim.yuzeyMat.uniforms.uDalga.value = 1
        this.dusenSeker = null
        this.sekerSayisi++
        this.onSeker?.(this.sekerSayisi)
      }
    }
  }

  dokun(ndc: THREE.Vector2) {
    this.raycaster.setFromCamera(ndc, this.camera)
    // şeker
    const s = this.raycaster.intersectObjects(this.sekerler.filter((m) => m.visible))[0]
    if (s && !this.dusenSeker) {
      const m = s.object as THREE.Mesh
      this.dusenSeker = { m, t: 0, bas: m.position.clone() }
      return
    }
    for (const [b, ad] of [
      [this.benim, 'ben'],
      [this.senin, 'sen'],
    ] as const) {
      if (this.raycaster.intersectObject(b.isabet).length) {
        b.sallan = 1
        this.onSing?.(ad)
        const simdi = performance.now()
        if (this.sonDokunus && this.sonDokunus.hangi !== b && simdi - this.sonDokunus.an < 1400) this.onNus?.()
        this.sonDokunus = { hangi: b, an: simdi }
        return
      }
    }
  }
}
