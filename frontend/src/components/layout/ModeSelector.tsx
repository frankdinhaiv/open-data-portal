import { useState, useRef, useEffect } from 'react'
import { useStore } from '../../hooks/useStore'
import type { ArenaMode } from '../../types'

import battleIcon from '../../assets/icons/battle.svg'
import scalesIcon from '../../assets/icons/scales.svg'
import messageCircle from '../../assets/icons/message-circle.svg'
import chevronDown from '../../assets/icons/chevron-down-white.svg'

import openaiAvatar from '../../assets/models/openai.png'
import googleAvatar from '../../assets/models/google.png'
import metaAvatar from '../../assets/models/meta.png'
import deepseekAvatar from '../../assets/models/deepseek.png'
import xaiAvatar from '../../assets/models/xai.png'
import anthropicAvatar from '../../assets/models/anthropic.png'
import qwenAvatar from '../../assets/models/qwen.png'

const MODES: { id: ArenaMode; icon: string; label: string }[] = [
  { id: 'sbs', icon: scalesIcon, label: 'So sánh song song' },
  { id: 'battle', icon: battleIcon, label: 'Đấu trường AI' },
  { id: 'direct', icon: messageCircle, label: 'Trực tiếp' },
]

const MODEL_AVATARS: Record<string, string> = {
  'openai': openaiAvatar,
  'gpt': openaiAvatar,
  'google': googleAvatar,
  'gemini': googleAvatar,
  'meta': metaAvatar,
  'llama': metaAvatar,
  'deepseek': deepseekAvatar,
  'xai': xaiAvatar,
  'grok': xaiAvatar,
  'anthropic': anthropicAvatar,
  'claude': anthropicAvatar,
  'qwen': qwenAvatar,
  'alibaba': qwenAvatar,
}

export function ModeSelector() {
  const {
    mode, setMode, clearMessages, resetTurn,
    models, selectedModelA, selectedModelB,
    setSelectedModelA, setSelectedModelB,
  } = useStore()

  const [modeOpen, setModeOpen] = useState(false)
  const [modelAOpen, setModelAOpen] = useState(false)
  const [modelBOpen, setModelBOpen] = useState(false)
  const modeRef = useRef<HTMLDivElement>(null)
  const modelARef = useRef<HTMLDivElement>(null)
  const modelBRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (modeRef.current && !modeRef.current.contains(e.target as Node)) setModeOpen(false)
      if (modelARef.current && !modelARef.current.contains(e.target as Node)) setModelAOpen(false)
      if (modelBRef.current && !modelBRef.current.contains(e.target as Node)) setModelBOpen(false)
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const currentMode = MODES.find((m) => m.id === mode) || MODES[0]

  function selectMode(m: ArenaMode) {
    setMode(m)
    setModeOpen(false)
    clearMessages()
    resetTurn()
  }

  function getModelAvatar(modelId: string): string | undefined {
    const key = Object.keys(MODEL_AVATARS).find((k) => modelId.toLowerCase().includes(k.toLowerCase()))
    return key ? MODEL_AVATARS[key] : undefined
  }

  function getModel(modelId: string) {
    return models.find((m) => m.id === modelId)
  }

  function getModelName(modelId: string): string {
    return getModel(modelId)?.name || modelId
  }

  /** Renders model avatar — PNG logo if available, otherwise colored circle with initial */
  function ModelAvatar({ modelId, size = 24 }: { modelId: string; size?: number }) {
    const avatar = getModelAvatar(modelId)
    const model = getModel(modelId)
    const innerSize = size === 24 ? 18 : 16
    const pad = size === 24 ? 3 : 2

    if (avatar) {
      return (
        <div className="flex items-center justify-center overflow-hidden shrink-0" style={{ width: `${size}px`, height: `${size}px`, background: '#FFFFFF', borderRadius: `${size / 2}px`, padding: `${pad}px` }}>
          <img src={avatar} alt="Model logo" style={{ width: `${innerSize}px`, height: `${innerSize}px`, objectFit: 'contain' }} />
        </div>
      )
    }

    // Colored circle with first letter
    const color = model?.color || '#6585C5'
    const initial = (model?.name || modelId).charAt(0).toUpperCase()
    return (
      <div className="flex items-center justify-center shrink-0" style={{ width: `${size}px`, height: `${size}px`, background: color, borderRadius: `${size / 2}px`, fontSize: `${size * 0.5}px`, fontWeight: 700, color: '#FFFFFF', fontFamily: "'Be Vietnam Pro', sans-serif" }}>
        {initial}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-4 px-6 py-3">
      {/* Mode dropdown */}
      <div className="relative" ref={modeRef}>
        <button
          onClick={() => setModeOpen(!modeOpen)}
          className="flex items-center cursor-pointer hover:bg-white/15 transition-all"
          style={{
            height: '40px',
            padding: '10px 14px',
            gap: '4px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0px 1px 2px rgba(16, 24, 40, 0.05)',
            borderRadius: '8px',
          }}
        >
          <img src={currentMode.icon} alt="" aria-hidden="true" style={{ width: '20px', height: '20px' }} />
          <span style={{ fontSize: '14px', fontWeight: 600, color: '#FFFFFF', fontFamily: "'Be Vietnam Pro', sans-serif" }}>{currentMode.label}</span>
          <img src={chevronDown} alt="" style={{ width: '20px', height: '20px' }} className={`transition-transform ${modeOpen ? 'rotate-180' : ''}`} />
        </button>

        {modeOpen && (
          <div className="absolute top-[calc(100%+4px)] left-0 min-w-[220px] glass rounded-xl p-1 z-50 animate-fade-in" style={{ background: 'rgba(0,34,102,0.95)', backdropFilter: 'blur(12px)' }}>
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => selectMode(m.id)}
                className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg cursor-pointer transition-all border-none text-left
                  ${mode === m.id ? 'bg-white/15 text-white' : 'bg-transparent text-white/75 hover:bg-white/10 hover:text-white'}`}
              >
                <img src={m.icon} alt="" aria-hidden="true" className="w-4 h-4" />
                <span className="text-sm font-medium">{m.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Model selectors for SBS mode */}
      {mode === 'sbs' && (
        <>
          {/* Model A selector */}
          <div className="relative" ref={modelARef}>
            <button
              onClick={() => setModelAOpen(!modelAOpen)}
              className="flex items-center gap-2 cursor-pointer hover:bg-white/10 transition-all border-none bg-transparent"
              style={{ padding: '8px 0', gap: '8px' }}
            >
              <ModelAvatar modelId={selectedModelA} size={24} />
              <span style={{ fontSize: '16px', fontWeight: 500, color: '#FFFFFF', fontFamily: "'Be Vietnam Pro', sans-serif" }}>{getModelName(selectedModelA)}</span>
              <img src={chevronDown} alt="" aria-hidden="true" style={{ width: '20px', height: '20px' }} />
            </button>

            {modelAOpen && (
              <div className="absolute top-[calc(100%+4px)] left-0 min-w-[200px] rounded-xl p-1 z-50 animate-fade-in" style={{ background: 'rgba(0,34,102,0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {models.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedModelA(m.id); setModelAOpen(false) }}
                    className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg cursor-pointer transition-all border-none text-left
                      ${selectedModelA === m.id ? 'bg-white/15' : 'bg-transparent hover:bg-white/10'}`}
                  >
                    <ModelAvatar modelId={m.id} size={20} />
                    <span className="text-sm text-white">{m.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <span style={{ fontSize: '16px', fontWeight: 400, color: '#FFFFFF', fontFamily: "'Be Vietnam Pro', sans-serif" }}>vs</span>

          {/* Model B selector */}
          <div className="relative" ref={modelBRef}>
            <button
              onClick={() => setModelBOpen(!modelBOpen)}
              className="flex items-center gap-2 cursor-pointer hover:bg-white/10 transition-all border-none bg-transparent"
              style={{ padding: '8px 0', gap: '8px' }}
            >
              <ModelAvatar modelId={selectedModelB} size={24} />
              <span style={{ fontSize: '16px', fontWeight: 500, color: '#FFFFFF', fontFamily: "'Be Vietnam Pro', sans-serif" }}>{getModelName(selectedModelB)}</span>
              <img src={chevronDown} alt="" aria-hidden="true" style={{ width: '20px', height: '20px' }} />
            </button>

            {modelBOpen && (
              <div className="absolute top-[calc(100%+4px)] left-0 min-w-[200px] rounded-xl p-1 z-50 animate-fade-in" style={{ background: 'rgba(0,34,102,0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {models.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { setSelectedModelB(m.id); setModelBOpen(false) }}
                    className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg cursor-pointer transition-all border-none text-left
                      ${selectedModelB === m.id ? 'bg-white/15' : 'bg-transparent hover:bg-white/10'}`}
                  >
                    <ModelAvatar modelId={m.id} size={20} />
                    <span className="text-sm text-white">{m.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
