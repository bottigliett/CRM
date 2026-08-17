import { format, parseISO, isValid } from "date-fns"
import { it } from "date-fns/locale"
import {
  Heart, MessageCircle, Send, Share2, Bookmark, ThumbsUp, Repeat2, MoreHorizontal,
  ChevronLeft, ChevronRight, FileText, Film, Image as ImageIcon,
} from "lucide-react"

export const PLATFORM_META: Record<string, { icon: string; color: string; label: string; limit: number }> = {
  INSTAGRAM: { icon: "IG", color: "bg-gradient-to-br from-pink-500 to-purple-600 text-white", label: "Instagram", limit: 2200 },
  FACEBOOK: { icon: "FB", color: "bg-gradient-to-br from-blue-500 to-blue-700 text-white", label: "Facebook", limit: 63206 },
  LINKEDIN: { icon: "IN", color: "bg-gradient-to-br from-sky-500 to-sky-700 text-white", label: "LinkedIn", limit: 3000 },
  TIKTOK: { icon: "TT", color: "bg-gradient-to-br from-gray-700 to-gray-900 text-white", label: "TikTok", limit: 2200 },
}

export function formatScheduleLabel(dt: string, publishNow: boolean) {
  if (publishNow) return "Ora"
  if (!dt) return "Da programmare"
  try {
    const d = parseISO(dt)
    if (!isValid(d)) return dt
    return format(d, "d MMM · HH:mm", { locale: it })
  } catch { return dt }
}

export type PreviewFile = { url: string; isVideo: boolean }

type PlatformPreviewProps = {
  platform: string
  account: any
  content: string
  hashtagStr: string
  postType: "POST" | "CAROUSEL" | "REEL" | string
  filePreviews: PreviewFile[]
  files?: File[]
  carouselSlide?: number
  setCarouselSlide?: (n: number | ((s: number) => number)) => void
  scheduleLabel: string
}

export function PlatformPreview({
  platform, account, content, hashtagStr, postType, filePreviews, files,
  carouselSlide = 0, setCarouselSlide, scheduleLabel,
}: PlatformPreviewProps) {
  const pm = PLATFORM_META[platform] || { icon: "?", color: "bg-gray-500 text-white", label: platform, limit: 2200 }
  const name = account?.platformName || "Account"
  const initial = name[0]?.toUpperCase() || "?"
  const pic = account?.profilePicUrl
  const isIG = platform === "INSTAGRAM"
  const isFB = platform === "FACEBOOK"
  const isLI = platform === "LINKEDIN"
  const isTK = platform === "TIKTOK"
  const isReel = postType === "REEL"
  const isCarousel = postType === "CAROUSEL" && filePreviews.length > 1
  const slide = Math.min(carouselSlide, Math.max(0, filePreviews.length - 1))
  const hasMedia = filePreviews.length > 0
  const isPdf = files?.[0]?.type === "application/pdf"

  const Avatar = ({ size = "w-8 h-8", ring = false }: { size?: string; ring?: boolean }) => (
    <div className={`${size} rounded-full shrink-0 ${ring ? "bg-gradient-to-br from-yellow-400 via-pink-500 to-purple-600 p-[2px]" : ""}`}>
      {pic ? (
        <img src={pic} alt="" className="w-full h-full rounded-full object-cover" />
      ) : (
        <div className={`w-full h-full rounded-full flex items-center justify-center text-[10px] font-bold ${ring ? "bg-white dark:bg-zinc-950" : pm.color}`}>
          {initial}
        </div>
      )}
    </div>
  )

  const MediaSlot = ({ aspect, showPdf = false }: { aspect: string; showPdf?: boolean }) => (
    <div className={`relative overflow-hidden ${aspect} ${hasMedia ? "bg-black" : "bg-gradient-to-br from-muted to-muted/50"}`}>
      {isPdf && showPdf ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-white dark:bg-zinc-900">
          <FileText className="h-12 w-12 text-red-500" />
          <span className="text-xs text-muted-foreground mt-2">Documento PDF</span>
        </div>
      ) : hasMedia ? (
        isCarousel ? (
          <>
            <img src={filePreviews[slide]?.url} alt="" className="w-full h-full object-cover" />
            <div className="absolute top-2 right-3">
              <span className="bg-black/60 text-white text-[11px] px-2 py-0.5 rounded-full font-medium">{slide + 1}/{filePreviews.length}</span>
            </div>
            {slide > 0 && (
              <button type="button" className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center shadow"
                onClick={() => setCarouselSlide?.(s => Math.max(0, s - 1))}><ChevronLeft className="h-3.5 w-3.5 text-zinc-700" /></button>
            )}
            {slide < filePreviews.length - 1 && (
              <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center shadow"
                onClick={() => setCarouselSlide?.(s => Math.min(filePreviews.length - 1, s + 1))}><ChevronRight className="h-3.5 w-3.5 text-zinc-700" /></button>
            )}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-[5px]">
              {filePreviews.map((_, i) => (
                <div key={i} className={`w-[6px] h-[6px] rounded-full ${i === slide ? "bg-[#0095f6]" : "bg-white/40"}`} />
              ))}
            </div>
          </>
        ) : filePreviews[0].isVideo ? (
          <video src={filePreviews[0].url} className="w-full h-full object-cover" muted playsInline />
        ) : (
          <img src={filePreviews[0].url} alt="" className="w-full h-full object-cover" />
        )
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
            {isReel || isTK ? <Film className="h-5 w-5 text-muted-foreground/30" /> : <ImageIcon className="h-5 w-5 text-muted-foreground/30" />}
          </div>
          <p className="text-[10px] text-muted-foreground/40 mt-2">Anteprima media</p>
        </div>
      )}
    </div>
  )

  if (isIG) {
    return (
      <div className={`rounded-sm border bg-white dark:bg-zinc-950 overflow-hidden shadow-sm ${isReel ? "max-w-[280px]" : "max-w-[400px]"} w-full`}>
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <Avatar size="w-8 h-8" ring={isReel} />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate">{name}</p>
            <p className="text-[11px] text-muted-foreground">{scheduleLabel}</p>
          </div>
          <MoreHorizontal className="h-4 w-4" />
        </div>
        <MediaSlot aspect={isReel ? "aspect-[9/16]" : "aspect-[4/5]"} />
        <div className="flex items-center justify-between px-3 py-2.5 relative">
          <div className="flex items-center gap-4">
            <Heart className="h-[22px] w-[22px]" />
            <MessageCircle className="h-[22px] w-[22px]" />
            <Send className="h-[22px] w-[22px]" />
          </div>
          <Bookmark className="h-[22px] w-[22px]" />
        </div>
        <div className="px-3 pb-3">
          {content ? (
            <p className="text-[13px] leading-[18px] whitespace-pre-wrap break-words">
              <span className="font-semibold">{name}</span>{" "}{content}
            </p>
          ) : (
            <p className="text-[13px] text-muted-foreground/40 italic"><span className="font-semibold text-foreground/30">{name}</span> Descrizione...</p>
          )}
          {hashtagStr && <p className="text-[13px] text-[#00376b] dark:text-[#e0f1ff] mt-0.5">{hashtagStr}</p>}
        </div>
      </div>
    )
  }

  if (isFB) {
    return (
      <div className="rounded-lg border bg-white dark:bg-zinc-900 overflow-hidden shadow-sm max-w-[400px] w-full">
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <Avatar size="w-10 h-10" />
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold leading-tight truncate text-[#050505] dark:text-zinc-100">{name}</p>
            <p className="text-[12px] text-[#65676b] dark:text-zinc-400 leading-tight">{scheduleLabel} · 🌐</p>
          </div>
          <MoreHorizontal className="h-5 w-5 text-[#65676b] shrink-0" />
        </div>
        <div className="px-3 pb-2">
          {content ? (
            <p className="text-[15px] leading-5 whitespace-pre-wrap break-words">{content}</p>
          ) : (
            <p className="text-[15px] text-muted-foreground/40 italic">Descrizione...</p>
          )}
          {hashtagStr && <p className="text-[15px] text-[#0064d1] mt-0.5">{hashtagStr}</p>}
        </div>
        <MediaSlot aspect={isReel ? "aspect-[9/16] max-w-[300px] mx-auto" : "aspect-[4/5]"} />
        <div className="flex items-center px-1 border-t">
          <button type="button" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-semibold text-[#65676b]"><ThumbsUp className="h-[18px] w-[18px]" /> Mi piace</button>
          <button type="button" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-semibold text-[#65676b]"><MessageCircle className="h-[18px] w-[18px]" /> Commenta</button>
          <button type="button" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-semibold text-[#65676b]"><Share2 className="h-[18px] w-[18px]" /> Condividi</button>
        </div>
      </div>
    )
  }

  if (isLI) {
    return (
      <div className="rounded-lg border bg-white dark:bg-zinc-900 overflow-hidden max-w-[400px] w-full">
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Avatar size="w-12 h-12" />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold leading-tight truncate">{name}</p>
            <p className="text-[12px] text-[#666] dark:text-zinc-400">{scheduleLabel}</p>
          </div>
          <MoreHorizontal className="h-5 w-5 text-[#666] shrink-0" />
        </div>
        <div className="px-3 pb-2">
          {content ? (
            <p className="text-[14px] leading-5 whitespace-pre-wrap break-words">{content}</p>
          ) : (
            <p className="text-[14px] text-muted-foreground/40 italic">Descrizione...</p>
          )}
          {hashtagStr && <p className="text-[14px] text-[#0a66c2] mt-0.5 font-medium">{hashtagStr}</p>}
        </div>
        <MediaSlot aspect="aspect-[1.91/1]" showPdf />
        <div className="flex items-center px-1 py-0.5 border-t">
          <button type="button" className="flex-1 flex items-center justify-center gap-1 py-2 text-[12px] font-semibold text-[#666]"><ThumbsUp className="h-4 w-4" /> Consiglia</button>
          <button type="button" className="flex-1 flex items-center justify-center gap-1 py-2 text-[12px] font-semibold text-[#666]"><MessageCircle className="h-4 w-4" /> Commenta</button>
          <button type="button" className="flex-1 flex items-center justify-center gap-1 py-2 text-[12px] font-semibold text-[#666]"><Repeat2 className="h-4 w-4" /> Diffondi</button>
          <button type="button" className="flex-1 flex items-center justify-center gap-1 py-2 text-[12px] font-semibold text-[#666]"><Send className="h-4 w-4" /> Invia</button>
        </div>
      </div>
    )
  }

  if (isTK) {
    return (
      <div className="rounded-lg overflow-hidden bg-black max-w-[260px] w-full relative shadow-lg">
        <div className="aspect-[9/16] relative">
          {hasMedia ? (
            filePreviews[0].isVideo
              ? <video src={filePreviews[0].url} className="w-full h-full object-cover" muted playsInline />
              : <img src={filePreviews[0].url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-zinc-800 to-zinc-900 flex flex-col items-center justify-center">
              <Film className="h-8 w-8 text-white/20" />
              <p className="text-[10px] text-white/20 mt-2">Video TikTok</p>
            </div>
          )}
          <div className="absolute right-2 bottom-24 flex flex-col items-center gap-4">
            {[Heart, MessageCircle, Bookmark, Share2].map((Icon, i) => (
              <div key={i} className="flex flex-col items-center">
                <Icon className="h-7 w-7 text-white drop-shadow" />
                <span className="text-[10px] text-white font-medium mt-0.5">0</span>
              </div>
            ))}
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-10">
            <p className="text-[11px] text-white/70 mb-1">{scheduleLabel}</p>
            <div className="flex items-center gap-2 mb-1.5">
              <Avatar size="w-6 h-6" />
              <span className="font-semibold text-white text-[13px]">@{name}</span>
            </div>
            {content ? (
              <p className="text-white text-[13px] leading-[17px] line-clamp-2">{content}</p>
            ) : (
              <p className="text-white/30 text-[13px] italic">Descrizione...</p>
            )}
            {hashtagStr && <p className="text-white/80 text-[13px] mt-0.5">{hashtagStr}</p>}
          </div>
        </div>
      </div>
    )
  }

  return null
}
