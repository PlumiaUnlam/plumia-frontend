type PlumSpeechRecognitionAlternative = {
  readonly transcript: string
}

type PlumSpeechRecognitionResult = {
  readonly isFinal: boolean
  readonly length: number
  readonly [index: number]: PlumSpeechRecognitionAlternative
}

type PlumSpeechRecognitionEvent = Event & {
  readonly results: {
    readonly length: number
    readonly [index: number]: PlumSpeechRecognitionResult
  }
}

type PlumSpeechRecognitionErrorEvent = Event & {
  readonly error: string
}

interface PlumSpeechRecognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: PlumSpeechRecognitionEvent) => void) | null
  onerror: ((event: PlumSpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

interface PlumSpeechRecognitionConstructor {
  new (): PlumSpeechRecognition
}

interface Window {
  SpeechRecognition?: PlumSpeechRecognitionConstructor
  webkitSpeechRecognition?: PlumSpeechRecognitionConstructor
}

