import * as THREE from 'three'
import { ICERIK } from '../icerik'
import { gunesAltiNokta, gunesZamanlari, saatYazi, simdi, simdiMs } from '../cekirdek/zaman'
import { karaMi } from '../veri/kara-coz'
import { type GLSahne, hafif, isikLekesi, kureNokta, yildizAlani } from './ortak'

const { ben, sen } = ICERIK
const ALTIN_ACI = Math.PI * (3 - Math.sqrt(5))
const MERKEZ = { enlem: 41.6, boylam: 39.4 } // iki şehrin ortası
const ENLEM_CIZGISI = (ben.enlem + sen.enlem) / 2

interface Kare {
  y: number // yol üzerindeki konum
  enlem: number
  boylam: number
  uzak: number
}

// Kamera yolu: 0→1 açılış (gün doğumu), 1→2 aynı çizgi
const KAMERA: Kare[] = [
  { y: 0, enlem: 24, boylam: 50, uzak: 4.9 },
  { y: 0.35, enlem: 30, boylam: 45, uzak: 3.6 },
  { y: 0.92, enlem: 37, boylam: 40.5, uzak: 2.05 },
  { y: 1.08, enlem: 37, boylam: 40.5, uzak: 2.05 },
  { y: 1.4, enlem: 64, boylam: 36, uzak: 3.3 },
  { y: 1.7, enlem: 58, boylam: 20, uzak: 3.6 },
  { y: 2, enlem: 42, boylam: 40, uzak: 2.35 },
]

/** Tüp çizgiler için: tüpün ortası parlak, kenarları yumuşak → ince ışık hattı */
const YUMUSAK_CIZGI_VS = /* glsl */ `
  varying vec2 vUv; varying float vMerkez;
  void main(){
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    vMerkez = abs(dot(n, normalize(-mv.xyz)));
    gl_Position = projectionMatrix * mv;
  }`

const yumusak = (x: number) => x * x * (3 - 2 * x)
const sinirla = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))

function noktalar() {
  const konum: number[] = []
  const boyut: number[] = []
  const rnd: number[] = []
  const bolge: number[] = []
  const v = new THREE.Vector3()
  const merkez = kureNokta(MERKEZ.enlem, MERKEZ.boylam)
  const ekle = (x: number, y: number, z: number, b: number, bol: number) => {
    const enlem = Math.asin(y) * THREE.MathUtils.RAD2DEG
    const boylam = Math.atan2(x, z) * THREE.MathUtils.RAD2DEG
    if (!karaMi(enlem, boylam)) return
    v.set(x, y, z).multiplyScalar(1.0015)
    konum.push(v.x, v.y, v.z)
    boyut.push(b * (0.85 + Math.random() * 0.3))
    rnd.push(Math.random())
    bolge.push(bol)
  }
  // Dünya geneli
  const N = hafif ? 80_000 : 110_000
  for (let i = 0; i < N; i++) {
    const y = 1 - (2 * (i + 0.5)) / N
    const r = Math.sqrt(1 - y * y)
    const a = i * ALTIN_ACI
    ekle(Math.cos(a) * r, y, Math.sin(a) * r, 2.3, 0)
  }
  // İstanbul–Bakü bölgesi: çok daha sık noktalar
  const M = hafif ? 520_000 : 760_000
  const capCos = Math.cos(THREE.MathUtils.degToRad(17))
  const yMin = Math.sin(THREE.MathUtils.degToRad(MERKEZ.enlem - 17))
  const yMax = Math.sin(THREE.MathUtils.degToRad(MERKEZ.enlem + 17))
  const i0 = Math.floor(((1 - yMax) * M) / 2)
  const i1 = Math.ceil(((1 - yMin) * M) / 2)
  for (let i = i0; i < i1; i++) {
    const y = 1 - (2 * (i + 0.5)) / M
    const r = Math.sqrt(1 - y * y)
    const a = i * ALTIN_ACI
    const x = Math.cos(a) * r
    const z = Math.sin(a) * r
    if (x * merkez.x + y * merkez.y + z * merkez.z < capCos) continue
    ekle(x, y, z, 1.45, 1)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(konum, 3))
  g.setAttribute('aBoyut', new THREE.Float32BufferAttribute(boyut, 1))
  g.setAttribute('aRnd', new THREE.Float32BufferAttribute(rnd, 1))
  g.setAttribute('aBolge', new THREE.Float32BufferAttribute(bolge, 1))
  return g
}

export class Kure implements GLSahne {
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(34, 1, 0.01, 200)
  /** 0→1 açılış, 1→2 aynı çizgi (kaydırma ile) */
  yol = 0
  private yolYumusak = 0
  /** yürüyüş: 0..1 (İstanbul → Bakü) */
  yuruyus = 0
  gunesBaku: Date
  gunesIst: Date
  private gunes = new THREE.Vector3(1, 0, 0)
  private noktaMat: THREE.ShaderMaterial
  private okyanusMat: THREE.ShaderMaterial
  private atmosferMat: THREE.ShaderMaterial
  private yayMat: THREE.ShaderMaterial
  private halkaMat: THREE.ShaderMaterial
  private yildizlar: THREE.Points
  private isiklar: { kisi: typeof ben; nokta: THREE.Vector3; cekirdek: THREE.Sprite; hale: THREE.Sprite; etiket: HTMLElement; faz: number }[] = []
  private yay: THREE.CatmullRomCurve3
  private yuruyen: THREE.Sprite
  private w = 1
  private h = 1
  private gecici = new THREE.Vector3()
  private etiketKutusu: HTMLElement

  constructor(etiketKutusu: HTMLElement) {
    this.etiketKutusu = etiketKutusu
    const bugun = simdi()
    const zb = gunesZamanlari(bugun, sen).sunrise
    const zi = gunesZamanlari(bugun, ben).sunrise
    this.gunesBaku = zb
    this.gunesIst = zi

    // Arka plan yıldızları
    this.yildizlar = yildizAlani(2600, 40, 70, 1.6)
    this.scene.add(this.yildizlar)

    // Okyanus
    this.okyanusMat = new THREE.ShaderMaterial({
      uniforms: { uGunes: { value: this.gunes } },
      vertexShader: /* glsl */ `
        varying vec3 vN; varying vec3 vNv; varying vec3 vV;
        void main(){
          vN = normalize(position);
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          vNv = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uGunes; varying vec3 vN; varying vec3 vNv; varying vec3 vV;
        void main(){
          float d = dot(vN, uGunes);
          vec3 c = mix(vec3(0.010,0.016,0.045), vec3(0.035,0.075,0.17), smoothstep(-0.12, 0.35, d));
          c += vec3(0.5,0.2,0.24) * exp(-pow(d/0.12, 2.0)) * 0.16;
          float f = pow(1.0 - max(dot(vNv, vV), 0.0), 3.0);
          c += mix(vec3(0.08,0.12,0.35), vec3(0.45,0.62,1.0), smoothstep(-0.2, 0.4, d)) * f * 0.55;
          vec3 gV = normalize((viewMatrix * vec4(uGunes, 0.0)).xyz);
          float s = pow(max(dot(vNv, normalize(gV + vV)), 0.0), 70.0) * smoothstep(0.0, 0.2, d);
          c += vec3(1.0,0.85,0.65) * s * 0.35;
          gl_FragColor = vec4(c, 1.0);
        }`,
    })
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), this.okyanusMat))

    // Kara noktaları
    this.noktaMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uGunes: { value: this.gunes },
        uPx: { value: 1 },
        uOlcek: { value: 3.4 },
        uZaman: { value: 0 },
        uYakin: { value: 0 },
        uMerkez: { value: kureNokta(MERKEZ.enlem, MERKEZ.boylam) },
      },
      vertexShader: /* glsl */ `
        attribute float aBoyut; attribute float aRnd; attribute float aBolge;
        uniform float uPx, uOlcek, uYakin; uniform vec3 uGunes, uMerkez;
        varying float vIsik; varying float vRnd; varying float vA;
        void main(){
          vec3 n = normalize(position);
          vIsik = dot(n, uGunes);
          vRnd = aRnd;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vec3 nv = normalize(normalMatrix * n);
          float kenar = smoothstep(0.0, 0.45, dot(nv, normalize(-mv.xyz)));
          float c = dot(n, uMerkez);
          float icerde = smoothstep(0.956, 0.985, c);
          float a = aBolge > 0.5 ? uYakin * smoothstep(0.956, 0.972, c) : 1.0 - icerde * uYakin;
          vA = a * kenar;
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aBoyut * uPx * pow(uOlcek / -mv.z, 0.62);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uZaman; varying float vIsik; varying float vRnd; varying float vA;
        void main(){
          float r = length(gl_PointCoord - 0.5);
          if (r > 0.5 || vA < 0.01) discard;
          float a = smoothstep(0.5, 0.15, r);
          float gun = smoothstep(-0.04, 0.22, vIsik);
          float safak = exp(-pow((vIsik - 0.03) / 0.085, 2.0));
          vec3 c = mix(vec3(0.20,0.25,0.55), vec3(1.0,0.87,0.64), gun);
          c = mix(c, vec3(1.0,0.48,0.5), safak * 0.85);
          float p = mix(0.5, 1.0, gun) + safak * 0.55;
          p *= 0.82 + 0.18 * sin(uZaman * 0.9 + vRnd * 40.0);
          gl_FragColor = vec4(c * p, a * vA);
        }`,
    })
    this.scene.add(new THREE.Points(noktalar(), this.noktaMat))

    // Atmosfer
    this.atmosferMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      uniforms: { uGunes: { value: this.gunes } },
      vertexShader: /* glsl */ `
        varying vec3 vNv; varying vec3 vV; varying vec3 vN;
        void main(){
          vN = normalize(position);
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          vNv = normalize(normalMatrix * normal);
          vV = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uGunes; varying vec3 vNv; varying vec3 vV; varying vec3 vN;
        void main(){
          float k = -dot(vNv, vV);
          float i = pow(smoothstep(0.0, 0.62, k), 2.2) * smoothstep(1.0, 0.72, k);
          float d = dot(vN, uGunes);
          vec3 c = mix(vec3(0.16,0.22,0.65), vec3(0.55,0.72,1.0), smoothstep(-0.3, 0.5, d));
          c = mix(c, vec3(1.0,0.55,0.45), exp(-pow(d/0.2,2.0))*0.6);
          gl_FragColor = vec4(c * i * 0.9, 1.0);
        }`,
    })
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(1.16, 96, 64), this.atmosferMat))

    // Aramızdaki ışık yayı (İstanbul → Bakü)
    const a = kureNokta(ben.enlem, ben.boylam)
    const b = kureNokta(sen.enlem, sen.boylam)
    const yayNoktalari: THREE.Vector3[] = []
    for (let i = 0; i <= 96; i++) {
      const t = i / 96
      const p = a.clone().lerp(b, t).normalize()
      yayNoktalari.push(p.multiplyScalar(1.004 + Math.sin(Math.PI * t) * 0.075))
    }
    this.yay = new THREE.CatmullRomCurve3(yayNoktalari)
    this.yayMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uCiz: { value: 0 }, uZaman: { value: 0 }, uOpak: { value: 0 } },
      vertexShader: YUMUSAK_CIZGI_VS,
      fragmentShader: /* glsl */ `
        uniform float uCiz, uZaman, uOpak; varying vec2 vUv; varying float vMerkez;
        void main(){
          float x = vUv.x;
          float gor = smoothstep(uCiz, uCiz - 0.03, x);
          // iki yönlü ışık: Bakü'den gelen gün ışığı, İstanbul'dan giden mesajlar
          float n1 = exp(-pow((fract(x * 1.5 - uZaman * 0.11) - 0.5) / 0.018, 2.0));
          float n2 = exp(-pow((fract(-x * 1.5 - uZaman * 0.08 + 0.3) - 0.5) / 0.016, 2.0));
          vec3 c = mix(vec3(1.0,0.82,0.55), vec3(1.0,0.6,0.75), x);
          float cekirdek = pow(vMerkez, 3.0);
          float a = (0.08 + cekirdek * 0.28 + (n1 + n2) * cekirdek * 0.9) * gor * uOpak;
          gl_FragColor = vec4(c, a);
        }`,
    })
    this.scene.add(new THREE.Mesh(new THREE.TubeGeometry(this.yay, 240, 0.006, 8), this.yayMat))

    // Aynı enlem halkası
    const R = Math.cos(THREE.MathUtils.degToRad(ENLEM_CIZGISI)) * 1.006
    const halka = new THREE.Mesh(new THREE.TorusGeometry(R, 0.0055, 8, 900), undefined)
    this.halkaMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uCiz: { value: 0 }, uZaman: { value: 0 }, uBas: { value: (90 - ben.boylam) / 360 } },
      vertexShader: YUMUSAK_CIZGI_VS,
      fragmentShader: /* glsl */ `
        uniform float uCiz, uZaman, uBas; varying vec2 vUv; varying float vMerkez;
        void main(){
          float s = fract(uBas - vUv.x);
          float gor = smoothstep(uCiz, uCiz - 0.012, s) * step(0.001, uCiz);
          float kesik = 0.6 + 0.4 * smoothstep(0.3, 0.5, abs(fract(s * 120.0) - 0.5) * 2.0);
          float bas = exp(-pow((s - uCiz + 0.008) / 0.01, 2.0));
          vec3 c = mix(vec3(1.0, 0.82, 0.58), vec3(1.0, 0.62, 0.72), smoothstep(0.0, 0.06, s) * (1.0 - smoothstep(0.06, 0.2, s)));
          float cekirdek = pow(vMerkez, 2.5);
          float a = (0.55 * kesik * cekirdek + 0.1 + bas * 1.6 * cekirdek) * gor;
          gl_FragColor = vec4(c, a);
        }`,
    })
    halka.material = this.halkaMat
    halka.rotation.x = Math.PI / 2
    halka.position.y = Math.sin(THREE.MathUtils.degToRad(ENLEM_CIZGISI)) * 1.006
    this.scene.add(halka)

    // Şehir ışıkları
    for (const [kisi, faz] of [
      [ben, 0],
      [sen, 0.5],
    ] as const) {
      const nokta = kureNokta(kisi.enlem, kisi.boylam, 1.006)
      const hale = isikLekesi(kisi === sen ? 0xff9fb0 : 0xffc98a, 0.22, 0.9)
      const cekirdek = isikLekesi(0xfff4e0, 0.05, 1)
      hale.position.copy(nokta)
      cekirdek.position.copy(nokta)
      for (const s of [hale, cekirdek]) {
        s.material.depthTest = false
        s.renderOrder = 5
        this.scene.add(s)
      }
      const etiket = document.createElement('div')
      etiket.className = `kure-etiket ${kisi === sen ? 'sen' : 'ben'}`
      const dogus = kisi === sen ? zb : zi
      etiket.innerHTML = `<b>${kisi.ad}</b><span>${kisi.yerelSehir}</span><i>☀ ${saatYazi(dogus, kisi.saatDilimi)}</i>`
      etiketKutusu.appendChild(etiket)
      this.isiklar.push({ kisi, nokta, cekirdek, hale, etiket, faz })
    }

    // Yürüyen ışık (her ziyaret günü 21 km)
    this.yuruyen = isikLekesi(0xffffff, 0.07, 0)
    this.yuruyen.material.depthTest = false
    this.yuruyen.renderOrder = 6
    this.scene.add(this.yuruyen)
  }

  boyut(w: number, h: number, px: number) {
    this.w = w
    this.h = h
    this.camera.aspect = w / h
    // dikey ekranda görüş açısını genişlet ki iki şehir de kadraja sığsın
    this.camera.fov = w < h ? 34 + (1 - w / h) * 30 : 34
    this.camera.updateProjectionMatrix()
    this.noktaMat.uniforms.uPx.value = px
    ;(this.yildizlar.material as THREE.ShaderMaterial).uniforms.uPx.value = px
  }

  /** Yola göre güneşin zamanı: gün doğumunu önce Bakü'de sonra İstanbul'da yaşatır. */
  private gunesZamani(y: number) {
    const bas = this.gunesBaku.getTime() - 38 * 60000
    const son = this.gunesIst.getTime() + 28 * 60000
    if (y <= 1) {
      const t = yumusak(sinirla((y - 0.12) / 0.72))
      return new Date(bas + (son - bas) * t)
    }
    const t = yumusak(sinirla((y - 1.05) / 0.9))
    return new Date(son + (simdiMs() - son) * t)
  }

  private kamera(y: number) {
    let i = 0
    while (i < KAMERA.length - 2 && y > KAMERA[i + 1].y) i++
    const a = KAMERA[i]
    const b = KAMERA[i + 1]
    const t = yumusak(sinirla((y - a.y) / (b.y - a.y)))
    const enlem = a.enlem + (b.enlem - a.enlem) * t
    const boylam = a.boylam + (b.boylam - a.boylam) * t
    const uzak = a.uzak + (b.uzak - a.uzak) * t
    kureNokta(enlem, boylam, uzak, this.camera.position)
    this.camera.up.set(0, 1, 0)
    this.camera.lookAt(0, 0, 0)
    // Kompozisyon: telefonda küre üstte, geniş ekranda sağda
    const dikey = this.h > this.w
    const kx = dikey ? 0 : -0.2 * this.w
    const ky = dikey ? 0.13 * this.h : 0
    this.camera.setViewOffset(this.w, this.h, kx, ky, this.w, this.h)
    return uzak
  }

  guncelle(dt: number, t: number) {
    this.yolYumusak += (this.yol - this.yolYumusak) * Math.min(1, dt * 4)
    const y = this.yolYumusak
    const uzak = this.kamera(y + Math.sin(t * 0.15) * 0.004)

    const an = this.gunesZamani(y)
    const g = gunesAltiNokta(an)
    kureNokta(g.enlem, g.boylam, 1, this.gunes)

    const u = this.noktaMat.uniforms
    u.uZaman.value = t
    u.uYakin.value = sinirla((3.4 - uzak) / 1.2)
    ;(this.yildizlar.material as THREE.ShaderMaterial).uniforms.uZaman.value = t

    // yay ve halka
    this.yayMat.uniforms.uZaman.value = t
    this.yayMat.uniforms.uOpak.value = sinirla((y - 0.55) / 0.3)
    this.yayMat.uniforms.uCiz.value = 0.04 + sinirla((y - 0.55) / 0.35) * 1.0
    this.halkaMat.uniforms.uCiz.value = sinirla((y - 1.12) / 0.5) * 1.02

    // şehir ışıkları: kalp atışı gibi nabız, arkada kalınca sönük
    const kamYon = this.gecici.copy(this.camera.position).normalize()
    for (const isik of this.isiklar) {
      const n = isik.nokta.clone().normalize()
      const yuz = sinirla((n.dot(kamYon) - 0.05) / 0.25)
      const aydinlik = sinirla(n.dot(this.gunes) * 6 + 0.3)
      const vur = Math.pow(Math.max(0, Math.sin((t * 1.2 + isik.faz) * Math.PI)), 12)
      const buyukluk = (0.16 + vur * 0.08) * (0.7 + (uzak - 2) * 0.25)
      isik.hale.scale.setScalar(buyukluk)
      isik.hale.material.opacity = yuz * (0.75 - aydinlik * 0.3 + vur * 0.25)
      isik.cekirdek.material.opacity = yuz
      isik.cekirdek.scale.setScalar(0.035 * (0.7 + (uzak - 2) * 0.25))
      isik.etiket.classList.toggle('aydinlik', aydinlik > 0.35)
      isik.etiket.dataset.yuz = String(yuz)
    }

    // yürüyen ışık
    const yur = sinirla((y - 1.6) / 0.3)
    this.yuruyen.material.opacity = yur * (0.75 + 0.25 * Math.sin(t * 3))
    if (yur > 0) this.yay.getPoint(sinirla(this.yuruyus, 0.002, 0.998), this.yuruyen.position)
  }

  sonra() {
    const gorunur = this.yolYumusak < 2.02
    for (const isik of this.isiklar) {
      const p = this.gecici.copy(isik.nokta).project(this.camera)
      const x = (p.x * 0.5 + 0.5) * this.w
      const y = (-p.y * 0.5 + 0.5) * this.h
      const yuz = parseFloat(isik.etiket.dataset.yuz || '0')
      isik.etiket.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
      isik.etiket.style.opacity = gorunur ? String(yuz) : '0'
    }
  }

  gizleEtiketler(gizle: boolean) {
    this.etiketKutusu.classList.toggle('gizli', gizle)
  }
}
