import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { ICERIK } from '../icerik'
import { ayEvresi } from '../cekirdek/zaman'
import { ayCiz } from '../cekirdek/ay-ciz'
import { GLSL_GURULTU, type GLSahne, isikLekesi, yildizAlani } from './ortak'

/**
 * İki Kule — haritada yan yana olmayan iki şehir, bu gece aynı suyun iki kıyısında.
 * Sol: İstanbul (Kız Kulesi, tarihi yarımada silüeti, iki minare arasında bir mahya)
 * Sağ: Bakü (Qız Qalası, İçərişəhər surları, Alev Kuleleri)
 */

const SIS = new THREE.Color(0x0b0f26)

// Taş kule malzemesi: ay ışığı + aşağıdan sıcak projektör + taş sıraları
function tasMalzeme(renk: number, sira = 14, altIsik = 1) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uRenk: { value: new THREE.Color(renk) },
      uSira: { value: sira },
      uAlt: { value: altIsik },
      uSis: { value: SIS },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vW; varying float vD;
      void main(){
        vec4 w = modelMatrix * vec4(position, 1.0);
        vW = w.xyz;
        vN = normalize(mat3(modelMatrix) * normal);
        vec4 mv = viewMatrix * w;
        vD = -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uRenk, uSis; uniform float uSira, uAlt; varying vec3 vN; varying vec3 vW; varying float vD;
      ${GLSL_GURULTU}
      void main(){
        vec3 ay = normalize(vec3(-0.25, 0.75, -0.6));
        float dif = max(dot(vN, ay), 0.0);
        vec3 goz = normalize(cameraPosition - vW);
        float kenar = pow(1.0 - abs(dot(vN, goz)), 2.5);
        float yuk = vW.y;
        // önden, aşağıdan vuran sıcak projektör (anıtlar geceleri böyle aydınlatılır)
        float on = pow(max(dot(vN, normalize(vec3(0.25, 0.05, 1.0))), 0.0), 1.2);
        float proj = uAlt * on * (0.4 + 0.6 * exp(-max(yuk, 0.0) * 0.32));
        float sira = smoothstep(0.0, 0.05, abs(fract(yuk * uSira) - 0.5));
        float t = 0.82 + 0.3 * fbm(vW.xy * 7.0 + vW.z * 3.0);
        vec3 c = uRenk * t * (0.08 + 0.22 * dif);
        c += uRenk * vec3(1.0, 0.78, 0.56) * proj * 0.62 * t * (0.9 + 0.1 * sira);
        c += vec3(0.5, 0.6, 1.0) * kenar * 0.16;
        c = mix(c, uSis, smoothstep(12.0, 38.0, vD) * 0.85);
        gl_FragColor = vec4(c, 1.0);
      }`,
  })
}

// Uzak silüet: düz renk + sis + minik pencereler
function siluetMalzeme(renk: number) {
  return new THREE.ShaderMaterial({
    uniforms: { uRenk: { value: new THREE.Color(renk) }, uSis: { value: SIS } },
    vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uRenk, uSis; varying vec3 vW;
      void main(){
        float y = clamp(vW.y / 6.0, 0.0, 1.0);
        vec3 c = mix(uRenk * 1.25, uRenk, y);
        gl_FragColor = vec4(c, 1.0);
      }`,
  })
}

/** 2D şekil → ince 3D levha */
function levha(sekil: THREE.Shape, derinlik = 0.2) {
  return new THREE.ExtrudeGeometry(sekil, { depth: derinlik, bevelEnabled: false, curveSegments: 18 })
}

// ─── İstanbul silüeti: kubbeler, minareler, Galata ──────────────────────────
function istanbulSiluet() {
  const s = new THREE.Shape()
  s.moveTo(-34, -1)
  s.lineTo(-34, 1.6)
  const kubbe = (x: number, y: number, r: number) => {
    s.lineTo(x - r, y)
    s.absarc(x, y, r, Math.PI, 0, true)
  }
  const minare = (x: number, y: number, h: number) => {
    s.lineTo(x - 0.13, y)
    s.lineTo(x - 0.13, y + h)
    s.lineTo(x - 0.2, y + h + 0.05)
    s.lineTo(x - 0.2, y + h + 0.16)
    s.lineTo(x - 0.1, y + h + 0.2)
    s.lineTo(x, y + h + 1.1)
    s.lineTo(x + 0.1, y + h + 0.2)
    s.lineTo(x + 0.2, y + h + 0.16)
    s.lineTo(x + 0.2, y + h + 0.05)
    s.lineTo(x + 0.13, y + h)
    s.lineTo(x + 0.13, y)
  }
  // tepeler
  s.lineTo(-31, 2.1)
  s.lineTo(-28.5, 2.4)
  // Süleymaniye benzeri
  minare(-27.6, 2.4, 4.2)
  s.lineTo(-27, 2.8)
  kubbe(-25.8, 3.2, 1.3)
  s.lineTo(-24.3, 2.8)
  minare(-23.9, 2.6, 3.8)
  s.lineTo(-22.5, 2.3)
  // Galata Kulesi
  s.lineTo(-20.2, 2.2)
  s.lineTo(-20.2, 5.4)
  s.lineTo(-20.35, 5.5)
  s.lineTo(-19.6, 6.9)
  s.lineTo(-18.85, 5.5)
  s.lineTo(-19.0, 5.4)
  s.lineTo(-19.0, 2.2)
  s.lineTo(-16.5, 2.0)
  // Ayasofya
  minare(-15.8, 2.0, 3.4)
  s.lineTo(-15.2, 2.5)
  kubbe(-13.6, 3.1, 1.6)
  s.lineTo(-11.9, 2.5)
  minare(-11.4, 2.0, 3.2)
  s.lineTo(-10.6, 1.9)
  // Sultanahmet (kademeli kubbeler, mahya burada)
  minare(-9.9, 1.9, 4.6)
  s.lineTo(-9.3, 2.2)
  kubbe(-8.6, 2.5, 0.55)
  kubbe(-7.1, 2.9, 1.2)
  kubbe(-5.6, 2.5, 0.55)
  s.lineTo(-4.9, 2.2)
  minare(-4.3, 1.9, 4.6)
  s.lineTo(-2, 1.6)
  s.lineTo(-1, 0.8)
  s.lineTo(-1, -1)
  s.closePath()
  return s
}

// ─── Bakü: Alev Kuleleri ─────────────────────────────────────────────────────
function alevSekli(h: number, w: number, egim = 1) {
  const s = new THREE.Shape()
  s.moveTo(-w / 2, 0)
  s.bezierCurveTo(-w * 0.62, h * 0.45, -w * 0.25 * egim, h * 0.8, w * 0.08 * egim, h)
  s.bezierCurveTo(w * 0.35, h * 0.72, w * 0.62, h * 0.4, w / 2, 0)
  s.closePath()
  return s
}

function alevMalzeme() {
  return new THREE.ShaderMaterial({
    uniforms: { uZaman: { value: 0 }, uKalp: { value: 0 }, uSis: { value: SIS } },
    vertexShader: /* glsl */ `varying vec2 vP; varying vec3 vW; void main(){ vP = position.xy; vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform float uZaman, uKalp; uniform vec3 uSis; varying vec2 vP; varying vec3 vW;
      ${GLSL_GURULTU}
      float kalpSekli(vec2 p){
        p.y -= 0.25; p *= 1.3;
        float a = atan(p.x, p.y) / 3.14159;
        float r = length(p);
        float h = abs(a);
        float d = (13.0*h - 22.0*h*h + 10.0*h*h*h) / (6.0 - 5.0*h);
        return smoothstep(0.02, -0.02, r - d * 0.22);
      }
      void main(){
        vec2 uv = vec2(vW.x * 0.35, vW.y * 0.14);
        float n = fbm(vec2(uv.x * 3.0, uv.y * 2.2 - uZaman * 0.9));
        float alev = smoothstep(0.25, 0.85, n + (1.0 - fract(vW.y * 0.06)) * 0.2);
        vec3 c = mix(vec3(0.55, 0.06, 0.02), vec3(1.0, 0.55, 0.12), alev);
        c = mix(c, vec3(1.0, 0.88, 0.5), pow(alev, 5.0));
        // ızgara (LED paneller)
        float izg = step(0.12, fract(vW.x * 4.0)) * step(0.12, fract(vW.y * 4.0));
        c *= 0.78 + 0.22 * izg;
        // arada bir: alevler bir kalbe dönüşür
        vec2 kp = vec2(vW.x - 11.6, vW.y - 6.5) / 6.5;
        float k = kalpSekli(kp) * uKalp;
        c = mix(c, vec3(1.0, 0.35, 0.5) * (0.8 + 0.2 * izg), k);
        c = mix(c, uSis, 0.35);
        gl_FragColor = vec4(c * 0.95, 1.0);
      }`,
  })
}

// ─── Kız Kulesi ──────────────────────────────────────────────────────────────
function kizKulesi(tas: THREE.Material, beyaz: THREE.Material, cati: THREE.Material) {
  const g = new THREE.Group()
  // kaya
  const kayaG = new THREE.IcosahedronGeometry(1, 3)
  const p = kayaG.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i)
    const n = 0.85 + 0.25 * Math.sin(v.x * 5.1 + v.z * 3.7) * Math.cos(v.y * 4.3)
    p.setXYZ(i, v.x * 2.3 * n, Math.max(-0.3, v.y) * 0.45 * n, v.z * 1.6 * n)
  }
  kayaG.computeVertexNormals()
  const kaya = new THREE.Mesh(kayaG, tas)
  g.add(kaya)
  // ana yapı
  const yapi = new THREE.Mesh(new RoundedBoxGeometry(2.3, 0.75, 1.3, 2, 0.04), beyaz)
  yapi.position.set(-0.2, 0.62, 0)
  g.add(yapi)
  const kanat = new THREE.Mesh(new RoundedBoxGeometry(0.8, 0.5, 1.0, 2, 0.04), beyaz)
  kanat.position.set(-1.35, 0.5, 0.05)
  g.add(kanat)
  const cati1 = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.06, 1.35), cati)
  cati1.position.set(-0.2, 1.02, 0)
  g.add(cati1)
  // kule gövdesi
  const kuleT = new THREE.Mesh(new RoundedBoxGeometry(0.72, 1.3, 0.72, 2, 0.03), beyaz)
  kuleT.position.set(0.55, 1.5, 0)
  g.add(kuleT)
  const govde = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.9, 16), beyaz)
  govde.position.set(0.55, 2.6, 0)
  g.add(govde)
  const balkon = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 20), cati)
  balkon.position.set(0.55, 3.07, 0)
  g.add(balkon)
  const fener = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.42, 16), beyaz)
  fener.position.set(0.55, 3.3, 0)
  g.add(fener)
  const kukulete = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.55, 16), cati)
  kukulete.position.set(0.55, 3.78, 0)
  g.add(kukulete)
  const direk = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6), cati)
  direk.position.set(0.55, 4.25, 0)
  g.add(direk)
  return { grup: g, lambaY: 3.3, lambaX: 0.55 }
}

// ─── Qız Qalası ──────────────────────────────────────────────────────────────
function qizQalasi(tas: THREE.Material) {
  const g = new THREE.Group()
  const govde = new THREE.CylinderGeometry(1.25, 1.42, 4.9, 48, 1)
  govde.translate(0, 2.45, 0)
  // doğuya uzanan payanda ("kuyruk")
  const kuyruk = new RoundedBoxGeometry(1.0, 4.7, 1.6, 3, 0.35)
  kuyruk.translate(1.35, 2.35, 0)
  const tepe = new THREE.CylinderGeometry(1.3, 1.26, 0.25, 48)
  tepe.translate(0, 4.95, 0)
  const geo = mergeGeometries([govde.toNonIndexed(), kuyruk.toNonIndexed(), tepe.toNonIndexed()])
  geo.computeVertexNormals()
  g.add(new THREE.Mesh(geo, tas))
  // siperler
  const siperG: THREE.BufferGeometry[] = []
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2
    const b = new THREE.BoxGeometry(0.22, 0.2, 0.18)
    b.rotateY(-a)
    b.translate(Math.cos(a) * 1.22, 5.17, Math.sin(a) * 1.22)
    siperG.push(b)
  }
  g.add(new THREE.Mesh(mergeGeometries(siperG), tas))
  return { grup: g, tepeY: 5.3 }
}

// ─── Su ──────────────────────────────────────────────────────────────────────
function suMalzeme() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uZaman: { value: 0 },
      uIsiklar: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] },
      uRenkler: { value: [new THREE.Color(), new THREE.Color(), new THREE.Color(), new THREE.Color(), new THREE.Color()] },
      uSis: { value: SIS },
    },
    vertexShader: /* glsl */ `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform float uZaman; uniform vec4 uIsiklar[5]; uniform vec3 uRenkler[5]; uniform vec3 uSis; varying vec3 vW;
      ${GLSL_GURULTU}
      void main(){
        vec3 goz = normalize(cameraPosition - vW);
        float fres = pow(1.0 - max(goz.y, 0.0), 4.0);
        vec3 c = mix(vec3(0.012, 0.018, 0.05), vec3(0.09, 0.1, 0.24), fres);
        float dalga = fbm(vec2(vW.x * 1.3, vW.z * 3.2 + uZaman * 0.35)) * 0.6 + fbm(vec2(vW.x * 4.0 - uZaman * 0.2, vW.z * 9.0)) * 0.4;
        for (int i = 0; i < 5; i++) {
          vec4 L = uIsiklar[i];
          if (L.w <= 0.0) continue;
          float dz = vW.z - L.z;
          if (dz < 0.0) continue;
          float yay = 0.12 + dz * 0.09 + L.y * 0.02;
          float d = (vW.x - L.x) / yay;
          float sutun = exp(-d * d) * smoothstep(0.0, 0.6, dz);
          float kirik = smoothstep(0.35, 0.75, dalga + 0.25 * sin(vW.z * 18.0 - uZaman * 2.0 + L.x));
          c += uRenkler[i] * sutun * kirik * L.w * exp(-dz * 0.05);
        }
        c += vec3(0.6, 0.7, 1.0) * pow(dalga, 6.0) * 0.12 * fres;
        float uzak = length(cameraPosition - vW);
        c = mix(c, uSis, smoothstep(14.0, 60.0, uzak));
        gl_FragColor = vec4(c, 1.0);
      }`,
  })
}

// ─── Gökyüzü kubbesi ─────────────────────────────────────────────────────────
function gokMalzeme() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uSis: { value: SIS } },
    vertexShader: /* glsl */ `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSis; varying vec3 vP;
      void main(){
        float y = vP.y;
        vec3 ust = vec3(0.012, 0.014, 0.045);
        vec3 orta = vec3(0.05, 0.05, 0.14);
        vec3 ufuk = vec3(0.2, 0.1, 0.2);
        vec3 c = mix(ufuk, orta, smoothstep(0.0, 0.18, y));
        c = mix(c, ust, smoothstep(0.15, 0.7, y));
        c = mix(uSis, c, smoothstep(-0.02, 0.03, y));
        // sağda (doğuda) alev ışığı, solda şehir ışığı
        c += vec3(0.35, 0.12, 0.05) * exp(-pow((vP.x - 0.3) / 0.25, 2.0)) * exp(-y * 9.0) * 0.6;
        c += vec3(0.25, 0.18, 0.08) * exp(-pow((vP.x + 0.5) / 0.3, 2.0)) * exp(-y * 9.0) * 0.5;
        gl_FragColor = vec4(c, 1.0);
      }`,
  })
}

/** Ay dokusu: bu gecenin gerçek evresiyle */
function ayDokusu() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  ayCiz(c.getContext('2d')!, 128, 128, 100, ayEvresi(new Date()).evre)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export class Kuleler implements GLSahne {
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400)
  /** kaydırma ilerlemesi 0..1 */
  ilerleme = 0
  private ilerlemeY = 0
  private yandi = 0
  private yanmaHedef = 0
  private su: THREE.ShaderMaterial
  private alev: THREE.ShaderMaterial
  private kiz: ReturnType<typeof kizKulesi>
  private qiz: ReturnType<typeof qizQalasi>
  private kizGrup: THREE.Group
  private lambaA: THREE.Sprite
  private lambaAHale: THREE.Sprite
  private lambaB: THREE.Sprite
  private isinMat: THREE.ShaderMaterial
  private isinEgri: THREE.QuadraticBezierCurve3
  private kosucular: THREE.Sprite[] = []
  private yildizlar: THREE.Points
  private mahya: THREE.Points
  private kalpZaman = 0
  private isaretci = new THREE.Vector2()
  private raycaster = new THREE.Raycaster()
  private w = 1
  private h = 1
  onKuleDokun: (() => void) | null = null

  constructor() {
    this.scene.background = SIS
    this.camera.position.set(0, 1.7, 12)

    // gökyüzü ve yıldızlar
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(180, 32, 16), gokMalzeme()))
    this.yildizlar = yildizAlani(1800, 120, 170, 1.7)
    this.yildizlar.position.y = 30
    this.scene.add(this.yildizlar)

    // ay (gerçek evresiyle)
    const ay = new THREE.Sprite(new THREE.SpriteMaterial({ map: ayDokusu(), transparent: true, depthWrite: false, toneMapped: false }))
    ay.scale.setScalar(4.6)
    ay.position.set(-6, 26, -110)
    this.scene.add(ay)
    const ayHale = isikLekesi(0xbfd0ff, 26, 0.28)
    ayHale.position.copy(ay.position)
    this.scene.add(ayHale)

    // su
    this.su = suMalzeme()
    const suM = new THREE.Mesh(new THREE.PlaneGeometry(300, 200), this.su)
    suM.rotation.x = -Math.PI / 2
    suM.position.z = -60
    this.scene.add(suM)

    // İstanbul silüeti (solda, uzakta)
    const ist = new THREE.Mesh(levha(istanbulSiluet(), 0.4), siluetMalzeme(0x0e1230))
    ist.position.set(3.5, -0.3, -27)
    this.scene.add(ist)

    // Mahya: Sultanahmet'in iki minaresi arasında "HOŞ GELDİN ELN"
    this.mahya = this.mahyaKur(`HOŞ GELDİN ${ICERIK.sen.ad.toLocaleUpperCase('tr-TR')}`, -3.6, 6.3, -26.5, 5.1)
    this.scene.add(this.mahya)

    // İstanbul şehir ışıkları
    this.scene.add(this.pencereler(-30, 2, -26.4, 1.0, 2.4, 420, 0xffc98a))

    // Bakü: surlar + Alev Kuleleri
    const sur = new THREE.Shape()
    sur.moveTo(2, -1)
    sur.lineTo(2, 1.4)
    for (let x = 2; x < 30; x += 0.8) {
      sur.lineTo(x, 1.4)
      sur.lineTo(x, 1.75)
      sur.lineTo(x + 0.4, 1.75)
      sur.lineTo(x + 0.4, 1.4)
    }
    sur.lineTo(34, 1.4)
    sur.lineTo(34, -1)
    sur.closePath()
    const surM = new THREE.Mesh(levha(sur, 0.4), siluetMalzeme(0x120f24))
    surM.position.set(0, -0.2, -24)
    this.scene.add(surM)
    this.scene.add(this.pencereler(4, 32, -23.6, 1.0, 1.5, 160, 0xffb070))

    this.alev = alevMalzeme()
    for (const [x, h, w, e] of [
      [8.6, 10.5, 3.2, 1],
      [11.6, 13.5, 3.6, -0.6],
      [14.7, 9.5, 3.0, 0.8],
    ]) {
      const m = new THREE.Mesh(levha(alevSekli(h, w, e), 0.5), this.alev)
      m.position.set(x, 2.2, -38)
      this.scene.add(m)
    }
    const tepe = new THREE.Shape()
    tepe.moveTo(4, -1)
    tepe.quadraticCurveTo(15, 3.6, 34, 2.6)
    tepe.lineTo(34, -1)
    const tepeM = new THREE.Mesh(levha(tepe, 0.3), siluetMalzeme(0x0b0c20))
    tepeM.position.set(0, -0.3, -39)
    this.scene.add(tepeM)

    // Kız Kulesi
    const tas = tasMalzeme(0x7d7a86, 10, 0.5)
    const beyaz = tasMalzeme(0xe9e4dc, 22, 1.0)
    const cati = tasMalzeme(0x3a4150, 30, 0.3)
    this.kiz = kizKulesi(tas, beyaz, cati)
    this.kizGrup = this.kiz.grup
    this.kizGrup.position.set(-3.3, 0, -6.5)
    this.kizGrup.rotation.y = 0.35
    this.scene.add(this.kizGrup)

    // Qız Qalası
    const kum = tasMalzeme(0xb89c7a, 7, 1.1)
    this.qiz = qizQalasi(kum)
    this.qiz.grup.position.set(3.9, 0, -9.5)
    this.qiz.grup.scale.setScalar(0.78)
    this.qiz.grup.rotation.y = 0.35
    this.scene.add(this.qiz.grup)
    const kiyi = new THREE.Mesh(new RoundedBoxGeometry(9, 0.6, 5, 2, 0.2), tasMalzeme(0x3a3440, 6, 0.8))
    kiyi.position.set(6.6, -0.05, -9.6)
    this.scene.add(kiyi)

    // lambalar
    const aPos = this.kizGrup.localToWorld(new THREE.Vector3(this.kiz.lambaX, this.kiz.lambaY, 0))
    this.lambaA = isikLekesi(0xffd9a0, 0.8, 0.9)
    this.lambaA.position.copy(aPos)
    this.lambaAHale = isikLekesi(0xffb070, 5, 0.25)
    this.lambaAHale.position.copy(aPos)
    this.scene.add(this.lambaA, this.lambaAHale)
    const bPos = new THREE.Vector3(3.9, this.qiz.tepeY * 0.78 + 0.35, -9.5)
    this.lambaB = isikLekesi(0xffa8b8, 0.8, 0.0)
    this.lambaB.position.copy(bPos)
    this.scene.add(this.lambaB)
    // Qız Qalası projektör parıltısı
    const proj = isikLekesi(0xff9b55, 9, 0.22)
    proj.position.set(3.9, 1.2, -8.4)
    this.scene.add(proj)

    // iki lamba arasında ışık köprüsü
    const orta = aPos.clone().lerp(bPos, 0.5)
    orta.y += 4.2
    this.isinEgri = new THREE.QuadraticBezierCurve3(aPos, orta, bPos)
    this.isinMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uCiz: { value: 0 }, uZaman: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec2 vUv; varying float vM;
        void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vM = abs(dot(normalize(normalMatrix*normal), normalize(-mv.xyz))); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */ `
        uniform float uCiz, uZaman; varying vec2 vUv; varying float vM;
        void main(){
          float gor = smoothstep(uCiz, uCiz - 0.04, vUv.x);
          float bas = exp(-pow((vUv.x - uCiz) / 0.03, 2.0)) * step(uCiz, 0.999);
          float nabiz = exp(-pow((fract(vUv.x * 2.0 - uZaman * 0.25) - 0.5) / 0.05, 2.0));
          vec3 c = mix(vec3(1.0, 0.82, 0.55), vec3(1.0, 0.6, 0.72), vUv.x);
          float a = (pow(vM, 2.0) * (0.35 + nabiz * 0.6) + bas * 2.0) * gor;
          gl_FragColor = vec4(c, a);
        }`,
    })
    this.scene.add(new THREE.Mesh(new THREE.TubeGeometry(this.isinEgri, 120, 0.035, 8), this.isinMat))
    for (let i = 0; i < 14; i++) {
      const k = isikLekesi(i % 2 ? 0xffd2a0 : 0xffb3c4, 0.25, 0)
      k.userData.faz = i / 14
      this.kosucular.push(k)
      this.scene.add(k)
    }
  }

  private pencereler(x0: number, x1: number, z: number, y0: number, y1: number, n: number, renk: number) {
    const p = new Float32Array(n * 3)
    const r = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      p.set([x0 + Math.random() * (x1 - x0), y0 + Math.random() ** 2 * (y1 - y0), z], i * 3)
      r[i] = Math.random()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    g.setAttribute('aRnd', new THREE.BufferAttribute(r, 1))
    return new THREE.Points(
      g,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uRenk: { value: new THREE.Color(renk) }, uZaman: { value: 0 } },
        vertexShader: /* glsl */ `attribute float aRnd; varying float vR; void main(){ vR = aRnd; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = (1.2 + aRnd * 1.8) * 30.0 / -mv.z; }`,
        fragmentShader: /* glsl */ `uniform vec3 uRenk; varying float vR; void main(){ float d = length(gl_PointCoord-0.5); gl_FragColor = vec4(uRenk, smoothstep(0.5,0.0,d) * (0.35 + 0.5*vR)); }`,
      }),
    )
  }

  /** Mahya: yazıyı ışık noktalarına çevir, iki minare arasına as */
  private mahyaKur(yazi: string, x: number, y: number, z: number, genislik: number) {
    const c = document.createElement('canvas')
    const W = 520
    const H = 40
    c.width = W
    c.height = H
    const k = c.getContext('2d')!
    k.fillStyle = '#fff'
    k.font = '700 30px "Plus Jakarta Sans Variable", system-ui, sans-serif'
    k.textAlign = 'center'
    k.textBaseline = 'middle'
    k.fillText(yazi, W / 2, H / 2 + 1)
    const veri = k.getImageData(0, 0, W, H).data
    const noktalar: number[] = []
    const adim = 4
    for (let yy = 0; yy < H; yy += adim)
      for (let xx = 0; xx < W; xx += adim) if (veri[(yy * W + xx) * 4 + 3] > 120) noktalar.push(x + (xx / W - 0.5) * genislik, y + (0.5 - yy / H) * (genislik * H) / W, z)
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(noktalar, 3))
    return new THREE.Points(
      g,
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uZaman: { value: 0 }, uPx: { value: 1 } },
        vertexShader: /* glsl */ `uniform float uPx; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * mv; gl_PointSize = 2.6 * uPx * 34.0 / -mv.z; }`,
        fragmentShader: /* glsl */ `uniform float uZaman; void main(){ float d = length(gl_PointCoord-0.5); float t = 0.85 + 0.15*sin(uZaman*3.0 + gl_FragCoord.x*0.3); gl_FragColor = vec4(vec3(1.0,0.86,0.6)*t, smoothstep(0.5,0.1,d)); }`,
      }),
    )
  }

  /** Lambayı yak: ışık İstanbul'dan Bakü'ye uzanır */
  yak() {
    this.yanmaHedef = 1
  }
  get yandiMi() {
    return this.yanmaHedef > 0
  }

  boyut(w: number, h: number, px: number) {
    this.w = w
    this.h = h
    this.camera.aspect = w / h
    this.camera.fov = w < h ? 58 : 40
    this.camera.updateProjectionMatrix()
    ;(this.yildizlar.material as THREE.ShaderMaterial).uniforms.uPx.value = px
    ;(this.mahya.material as THREE.ShaderMaterial).uniforms.uPx.value = px
  }

  guncelle(dt: number, t: number) {
    this.ilerlemeY += (this.ilerleme - this.ilerlemeY) * Math.min(1, dt * 3)
    const p = this.ilerlemeY
    this.yandi += (this.yanmaHedef - this.yandi) * Math.min(1, dt * 0.9)
    const y = this.yandi

    // kamera: yavaş bir süzülüş
    const dikey = this.h > this.w
    const kx = Math.sin(t * 0.12) * 0.25 + (p - 0.5) * (dikey ? 1.4 : 1.2)
    this.camera.position.set(kx, 1.5 + p * 0.6, (dikey ? 15.5 : 12) - p * 2.2)
    this.camera.lookAt(kx * 0.4, 3.4 + p * 0.4, -12)
    this.camera.setViewOffset(this.w, this.h, dikey ? 0 : -this.w * 0.12, dikey ? -this.h * 0.08 : 0, this.w, this.h)

    this.su.uniforms.uZaman.value = t
    this.alev.uniforms.uZaman.value = t
    ;(this.yildizlar.material as THREE.ShaderMaterial).uniforms.uZaman.value = t
    ;(this.mahya.material as THREE.ShaderMaterial).uniforms.uZaman.value = t

    // Alev kuleleri ara sıra kalbe dönüşür (16 sn'de bir, ~3.5 sn)
    this.kalpZaman = (t % 16) / 16
    const kalp = this.kalpZaman > 0.78 ? Math.sin(((this.kalpZaman - 0.78) / 0.22) * Math.PI) : 0
    this.alev.uniforms.uKalp.value = kalp

    // lambalar
    const titreme = 0.9 + 0.1 * Math.sin(t * 7.3) * Math.sin(t * 3.1)
    this.lambaA.material.opacity = (0.5 + 0.5 * y) * titreme
    this.lambaA.scale.setScalar(0.7 + y * 0.6)
    this.lambaAHale.material.opacity = (0.12 + 0.3 * y) * titreme
    this.lambaAHale.scale.setScalar(3 + y * 4)
    const varis = Math.max(0, (y - 0.75) / 0.25)
    this.lambaB.material.opacity = varis * titreme
    this.lambaB.scale.setScalar(0.6 + varis * 0.9)
    this.isinMat.uniforms.uCiz.value = Math.min(1, y * 1.15)
    this.isinMat.uniforms.uZaman.value = t
    this.kosucular.forEach((k) => {
      const f = (k.userData.faz + t * 0.07) % 1
      this.isinEgri.getPoint(f, k.position)
      k.material.opacity = y > 0.95 ? Math.sin(f * Math.PI) * 0.9 : 0
    })

    // suya düşen yansımalar
    const L = this.su.uniforms.uIsiklar.value as THREE.Vector4[]
    const R = this.su.uniforms.uRenkler.value as THREE.Color[]
    L[0].set(this.lambaA.position.x, this.lambaA.position.y, this.lambaA.position.z, 0.35 + 0.6 * y)
    R[0].set(0xffc27a)
    L[1].set(this.lambaB.position.x, this.lambaB.position.y, this.lambaB.position.z, varis * 0.8)
    R[1].set(0xff9fb3)
    L[2].set(-6, 26, -110, 0.35)
    R[2].set(0x9fb4ff)
    L[3].set(11.6, 8, -38, 0.55)
    R[3].set(kalp > 0.2 ? 0xff5f88 : 0xff7a2a)
    L[4].set(3.9, 1.0, -8.6, 0.45)
    R[4].set(0xff9b55)
  }

  dokun(ndc: THREE.Vector2) {
    this.isaretci.copy(ndc)
    this.raycaster.setFromCamera(this.isaretci, this.camera)
    if (this.raycaster.intersectObject(this.kizGrup, true).length) {
      this.onKuleDokun?.()
      // küçük bir sarsıntı
      const r = this.kizGrup.rotation
      r.z = 0.03
      const geri = () => {
        r.z *= 0.85
        if (Math.abs(r.z) > 0.0005) requestAnimationFrame(geri)
        else r.z = 0
      }
      requestAnimationFrame(geri)
    }
  }
}
