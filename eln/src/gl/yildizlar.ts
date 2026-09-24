import * as THREE from 'three'
import { type GLSahne, hafif } from './ortak'

/**
 * Final — gökyüzündeki yıldızlar önce "Səni sevirəm" yazısına, sonra bir kalbe dönüşür.
 */
export class Yildizlar implements GLSahne {
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100)
  /** 0..1: yazı oluşumu */
  yazi = 0
  /** 0..1: kalp oluşumu */
  kalp = 0
  /** kalp atışı darbesi (0..1, dışarıdan tetiklenir) */
  nabiz = 0
  private mat: THREE.ShaderMaterial
  private nokta: THREE.Points
  private geo: THREE.BufferGeometry
  private N: number
  private w = 1
  private h = 1
  private yon = new THREE.Vector2()
  private hedefYon = new THREE.Vector2()
  private yY = 0
  private kY = 0

  constructor() {
    this.scene.background = new THREE.Color(0x04050b)
    this.camera.position.set(0, 0, 10)
    const mobil = matchMedia('(pointer: coarse)').matches
    this.N = hafif ? 3600 : mobil ? 5200 : 9000
    const bas = new Float32Array(this.N * 3)
    const rnd = new Float32Array(this.N)
    const kalp = new Float32Array(this.N * 3)
    for (let i = 0; i < this.N; i++) {
      bas.set([(Math.random() - 0.5) * 22, (Math.random() - 0.5) * 14, -Math.random() * 12 + 1], i * 3)
      rnd[i] = Math.random()
      // dolu kalp: (x²+y²−1)³ − x²y³ ≤ 0
      let x = 0
      let y = 0
      do {
        x = (Math.random() - 0.5) * 2.6
        y = (Math.random() - 0.5) * 2.6 + 0.2
      } while ((x * x + y * y - 1) ** 3 - x * x * y ** 3 > 0)
      const kenar = Math.random() < 0.45 ? 1.0 : 0.88 + Math.random() * 0.12
      kalp.set([x * 1.75 * kenar, (y - 0.15) * 1.75 * kenar + 0.9, (Math.random() - 0.5) * 0.5], i * 3)
    }
    this.geo = new THREE.BufferGeometry()
    this.geo.setAttribute('position', new THREE.BufferAttribute(bas, 3))
    this.geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 1))
    this.geo.setAttribute('aYazi', new THREE.BufferAttribute(new Float32Array(this.N * 3), 3))
    this.geo.setAttribute('aKalp', new THREE.BufferAttribute(kalp, 3))
    this.mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uZaman: { value: 0 }, uYazi: { value: 0 }, uKalp: { value: 0 }, uNabiz: { value: 0 }, uPx: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute float aRnd; attribute vec3 aYazi; attribute vec3 aKalp;
        uniform float uZaman, uYazi, uKalp, uNabiz, uPx;
        varying float vA; varying vec3 vC;
        float yum(float x){ return x*x*(3.0-2.0*x); }
        void main(){
          vec3 p = position;
          p.x += sin(uZaman * 0.05 + aRnd * 40.0) * 0.3;
          p.y += cos(uZaman * 0.04 + aRnd * 30.0) * 0.2;
          float e1 = yum(clamp(uYazi * 1.5 - aRnd * 0.5, 0.0, 1.0));
          float e2 = yum(clamp(uKalp * 1.5 - aRnd * 0.5, 0.0, 1.0));
          vec3 kalp = aKalp * (1.0 + uNabiz * 0.07);
          vec3 hedef = mix(aYazi, kalp, e2);
          float e = max(e1, e2);
          // geçişte kıvrılarak gel
          float kivrim = sin(e * 3.14159);
          vec3 yol = vec3(sin(aRnd * 51.0 + uZaman * 0.6), cos(aRnd * 37.0 + uZaman * 0.5), 0.0) * kivrim * 0.9;
          p = mix(p, hedef, e) + yol;
          p += vec3(sin(uZaman * 1.3 + aRnd * 20.0), cos(uZaman * 1.1 + aRnd * 17.0), 0.0) * 0.015 * e;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float parilti = 0.6 + 0.4 * sin(uZaman * (1.0 + aRnd * 3.0) + aRnd * 60.0);
          gl_PointSize = uPx * (0.028 + pow(aRnd, 5.0) * 0.07) * mix(1.0, 0.85, e) / -mv.z;
          vec3 yildiz = mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.88, 0.72), step(0.75, aRnd));
          vec3 sicak = mix(vec3(1.0, 0.82, 0.55), vec3(1.0, 0.55, 0.7), clamp(p.x * 0.12 + 0.5 + p.y * 0.05, 0.0, 1.0));
          vC = mix(yildiz, sicak, e);
          vA = mix(0.35 + 0.65 * pow(aRnd, 2.0), 0.95, e) * parilti * (1.0 + uNabiz * 0.4 * e2);
        }`,
      fragmentShader: /* glsl */ `
        varying float vA; varying vec3 vC;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vC, a * a * vA);
        }`,
    })
    this.nokta = new THREE.Points(this.geo, this.mat)
    this.nokta.frustumCulled = false
    this.scene.add(this.nokta)
    window.addEventListener('pointermove', (e) => {
      this.hedefYon.set((e.clientX / window.innerWidth - 0.5) * 2, (e.clientY / window.innerHeight - 0.5) * 2)
    })
    void document.fonts.load('120px "Great Vibes"').then(() => this.yaziHedefleri())
  }

  /** Yazıyı tuvale çizip piksellerinden hedef noktalar üretir */
  private yaziHedefleri() {
    const dikey = this.h > this.w
    const c = document.createElement('canvas')
    c.width = dikey ? 700 : 1400
    c.height = dikey ? 500 : 420
    const x = c.getContext('2d')!
    x.fillStyle = '#fff'
    x.textAlign = 'center'
    x.textBaseline = 'middle'
    x.font = `${dikey ? 190 : 210}px "Great Vibes", cursive`
    const [a, b] = ['Səni', 'sevirəm']
    if (dikey) {
      x.fillText(a, c.width / 2, c.height * 0.3)
      x.fillText(b, c.width / 2, c.height * 0.74)
    } else x.fillText(`${a} ${b}`, c.width / 2, c.height / 2)
    const veri = x.getImageData(0, 0, c.width, c.height).data
    const noktalar: number[] = []
    for (let y = 0; y < c.height; y += 3) for (let xx = 0; xx < c.width; xx += 3) if (veri[(y * c.width + xx) * 4 + 3] > 128) noktalar.push(xx, y)
    const genislik = dikey ? 6.0 : 12
    const olcek = genislik / c.width
    const hedef = this.geo.getAttribute('aYazi') as THREE.BufferAttribute
    const n = noktalar.length / 2
    for (let i = 0; i < this.N; i++) {
      const k = Math.floor(Math.random() * n) * 2
      hedef.setXYZ(i, (noktalar[k] - c.width / 2) * olcek + (Math.random() - 0.5) * 0.03, -(noktalar[k + 1] - c.height / 2) * olcek + (dikey ? 0.7 : 1.1), (Math.random() - 0.5) * 0.3)
    }
    hedef.needsUpdate = true
  }

  boyut(w: number, h: number, px: number) {
    const onceDikey = this.h > this.w
    this.w = w
    this.h = h
    this.camera.aspect = w / h
    this.camera.fov = w < h ? 64 : 46
    this.camera.updateProjectionMatrix()
    this.mat.uniforms.uPx.value = (px * h) / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)))
    if (onceDikey !== h > w && document.fonts.check('120px "Great Vibes"')) this.yaziHedefleri()
  }

  guncelle(dt: number, t: number) {
    this.yY += (this.yazi - this.yY) * Math.min(1, dt * 1.9)
    this.kY += (this.kalp - this.kY) * Math.min(1, dt * 1.5)
    this.nabiz *= Math.pow(0.02, dt)
    this.mat.uniforms.uZaman.value = t
    this.mat.uniforms.uYazi.value = this.yY
    this.mat.uniforms.uKalp.value = this.kY
    this.mat.uniforms.uNabiz.value = this.nabiz
    this.yon.lerp(this.hedefYon, Math.min(1, dt * 2))
    this.nokta.rotation.y = this.yon.x * 0.12
    this.nokta.rotation.x = this.yon.y * 0.08
    this.camera.position.y = this.h > this.w ? -0.4 : 0
  }
}
