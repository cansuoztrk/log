/**
 * YouTube'un resmî IFrame oynatıcısı: şarkımız sitenin içinde çalsın diye.
 * Betik yalnızca ihtiyaç olunca (bölüme yaklaşınca) bir kez yüklenir.
 */
export interface YTOynatici {
  playVideo(): void
  pauseVideo(): void
  cueVideoById(id: string): void
  loadVideoById(id: string): void
  getPlayerState(): number
}

interface YTOlay {
  data: number
}

interface YTAd {
  Player: new (
    el: HTMLElement,
    ayar: {
      host?: string
      videoId: string
      width?: string
      height?: string
      playerVars?: Record<string, string | number>
      events?: { onReady?: () => void; onStateChange?: (e: YTOlay) => void; onError?: (e: YTOlay) => void }
    },
  ) => YTOynatici
}

declare global {
  interface Window {
    YT?: YTAd
    onYouTubeIframeAPIReady?: () => void
  }
}

/** Oynatıcı durumları */
export const YT_DURUM = { bitti: 0, caliyor: 1, durdu: 2 } as const

let yukleniyor: Promise<YTAd> | null = null

export function ytYukle(): Promise<YTAd> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  yukleniyor ??= new Promise<YTAd>((tamam, hata) => {
    const onceki = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      onceki?.()
      tamam(window.YT!)
    }
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    s.async = true
    s.onerror = () => {
      yukleniyor = null
      s.remove()
      hata(new Error('YouTube yüklenemedi'))
    }
    document.head.appendChild(s)
  })
  return yukleniyor
}
