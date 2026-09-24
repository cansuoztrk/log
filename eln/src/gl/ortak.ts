import * as THREE from 'three'

/** Enlem/boylamı birim küre üzerindeki noktaya çevirir (boylam 0 → +z, 90°D → +x). */
export function kureNokta(enlem: number, boylam: number, r = 1, hedef = new THREE.Vector3()) {
  const f = THREE.MathUtils.degToRad(enlem)
  const l = THREE.MathUtils.degToRad(boylam)
  return hedef.set(Math.cos(f) * Math.sin(l) * r, Math.sin(f) * r, Math.cos(f) * Math.cos(l) * r)
}

let parlamaDokusu: THREE.Texture | null = null
/** Yumuşak ışık lekesi dokusu (sprite'lar için). */
export function parlama() {
  if (parlamaDokusu) return parlamaDokusu
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const x = c.getContext('2d')!
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.18, 'rgba(255,255,255,0.55)')
  g.addColorStop(0.45, 'rgba(255,255,255,0.12)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  x.fillStyle = g
  x.fillRect(0, 0, 128, 128)
  parlamaDokusu = new THREE.CanvasTexture(c)
  parlamaDokusu.colorSpace = THREE.SRGBColorSpace
  return parlamaDokusu
}

export function isikLekesi(renk: THREE.ColorRepresentation, boyut: number, opaklik = 1) {
  const m = new THREE.SpriteMaterial({
    map: parlama(),
    color: renk,
    transparent: true,
    opacity: opaklik,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  const s = new THREE.Sprite(m)
  s.scale.setScalar(boyut)
  return s
}

/** Tekrar kullanılabilir GLSL parçaları */
export const GLSL_GURULTU = /* glsl */ `
  float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float gurultu(vec2 p){
    vec2 i = floor(p), f = fract(p);
    vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(hash12(i), hash12(i+vec2(1,0)), u.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), u.x), u.y);
  }
  float fbm(vec2 p){ float v = 0.0, a = 0.5; for(int i=0;i<4;i++){ v += a*gurultu(p); p *= 2.03; a *= 0.5; } return v; }
`

/** Yıldız alanı (arka plan). */
export function yildizAlani(adet: number, rMin: number, rMax: number, boyut = 1) {
  const pos = new Float32Array(adet * 3)
  const rnd = new Float32Array(adet)
  const v = new THREE.Vector3()
  for (let i = 0; i < adet; i++) {
    v.randomDirection().multiplyScalar(rMin + Math.random() * (rMax - rMin))
    pos.set([v.x, v.y, v.z], i * 3)
    rnd[i] = Math.random()
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 1))
  const m = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { uZaman: { value: 0 }, uPx: { value: 1 }, uBoyut: { value: boyut }, uOpak: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aRnd; uniform float uZaman, uPx, uBoyut; varying float vA; varying float vR;
      void main(){
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        gl_Position = projectionMatrix * mv;
        float t = 0.55 + 0.45*sin(uZaman*(0.6+aRnd*2.2) + aRnd*40.0);
        vA = t * (0.35 + 0.65*aRnd);
        vR = aRnd;
        gl_PointSize = uBoyut * uPx * (0.8 + pow(aRnd, 6.0) * 3.2);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpak; varying float vA; varying float vR;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        vec3 c = mix(vec3(0.75,0.82,1.0), vec3(1.0,0.86,0.7), step(0.7, vR));
        gl_FragColor = vec4(c, a*a*vA*uOpak);
      }`,
  })
  return new THREE.Points(g, m)
}

/** Aynı anda tek bir WebGL sahnesi çizilir; bölümler bunu uygular. */
export interface GLSahne {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  guncelle(dt: number, t: number): void
  boyut(w: number, h: number, px: number): void
  /** Sahneye tıklama/dokunma (NDC koordinatlarıyla) */
  dokun?(ndc: THREE.Vector2): void
  /** Renderdan önce özel iş (ör. etiketleri konumlandırma) */
  sonra?(): void
}
