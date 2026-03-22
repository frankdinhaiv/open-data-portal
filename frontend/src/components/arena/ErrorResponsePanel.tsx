import type { Model } from '../../types'

import refreshIcon from '../../assets/icons/refresh.svg'
import alertTriangleIcon from '../../assets/icons/alert-triangle.svg'

import gptAvatar from '../../assets/models/gpt.png'
import deepseekAvatar from '../../assets/models/deepseek.png'

const MODEL_AVATARS: Record<string, string> = {
  'gpt': gptAvatar,
  'deepseek': deepseekAvatar,
}

interface Props {
  model: Model
  onRetry?: () => void
}

function getAvatar(modelId: string): string | undefined {
  const key = Object.keys(MODEL_AVATARS).find((k) => modelId.toLowerCase().includes(k))
  return key ? MODEL_AVATARS[key] : undefined
}

export function ErrorResponsePanel({ model, onRetry }: Props) {
  const avatar = getAvatar(model.id)

  return (
    <div
      className="flex-1 max-w-[600px] rounded-lg overflow-hidden animate-slide-up"
      style={{
        background: 'linear-gradient(90deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.1) 100%), linear-gradient(90deg, #002266 0%, #002266 100%)',
        border: '1px solid #F97066',
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
      >
        <div className="flex items-center gap-2">
          {avatar ? (
            <div className="w-6 h-6 rounded-xl bg-white flex items-center justify-center overflow-hidden p-[3px]">
              <img src={avatar} alt="" className="w-[18px] h-[18px] object-contain" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-xl bg-white/20 flex items-center justify-center">
              <span className="text-xs font-bold text-white">{model.name[0]}</span>
            </div>
          )}
          <span className="text-base font-medium text-white">{model.name}</span>
          <img
            src={alertTriangleIcon}
            alt="Error"
            className="w-6 h-6"
          />
        </div>

        <button
          onClick={onRetry}
          className="w-8 h-8 rounded-lg flex items-center justify-center bg-transparent border-none cursor-pointer hover:bg-white/10 transition-all"
          style={{ boxShadow: '0px 1px 2px rgba(16,24,40,0.05)' }}
        >
          <img src={refreshIcon} alt="Retry" className="w-5 h-5 opacity-70" />
        </button>
      </div>

      {/* Error body (Figma: 2:12069 — flex-col gap-[10px] items-center justify-center p-[16px]) */}
      <div
        className="flex flex-col gap-[10px] items-center justify-center p-4 w-full"
        style={{ color: '#FDA29B', fontSize: '16px', lineHeight: '24px' }}
      >
        <p className="font-medium w-full" style={{ fontStyle: 'normal' }}>
          Không thể tạo phản hồi
        </p>
        <p className="font-normal w-full" style={{ fontStyle: 'normal' }}>
          Model gặp sự cố khi xử lý yêu cầu. Thử lại hoặc chọn model khác để tiếp tục.
        </p>
      </div>
    </div>
  )
}
