import '@testing-library/jest-dom'

// Mock Web Audio API
global.AudioContext = class MockAudioContext {
  createMediaStreamSource = vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  }))
  createAnalyser = vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    fftSize: 256,
    smoothingTimeConstant: 0.8,
    frequencyBinCount: 128,
    getByteFrequencyData: vi.fn(),
  }))
  createScriptProcessor = vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
    onaudioprocess: null,
  }))
  close = vi.fn()
  sampleRate: 44100
  destination = {
    connect: vi.fn(),
    disconnect: vi.fn(),
  }
} as any

// Mock getUserMedia
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: vi.fn(() => Promise.resolve({
      getTracks: () => [{ stop: vi.fn() }],
    })),
  },
})

// Mock WebSocket
global.WebSocket = class MockWebSocket {
  constructor(public url: string, public protocols?: string | string[]) {}
  
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  
  readyState = WebSocket.CONNECTING
  
  send = vi.fn()
  close = vi.fn()
  
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
} as any

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock as any

// Mock fetch
global.fetch = vi.fn()

// Mock btoa/atob for credential encoding
global.btoa = vi.fn((str: string) => Buffer.from(str).toString('base64'))
global.atob = vi.fn((str: string) => Buffer.from(str, 'base64').toString())

// Suppress console warnings in tests
const originalWarn = console.warn
console.warn = (...args: any[]) => {
  if (args[0]?.includes?.('React Router')) return
  originalWarn(...args)
}