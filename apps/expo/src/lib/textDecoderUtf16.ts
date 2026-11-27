// Expo SDK 54 installs a global TextDecoder that only knows UTF-8. h3-js (an Emscripten build)
// runs `new TextDecoder("utf-16le")` as soon as it loads whenever a TextDecoder exists, which made
// the app crash at startup. This wrapper adds UTF-16LE and passes every other label through.
// It must be imported after "expo" (which installs the decoder) and before anything that loads h3-js.

type DecoderCtor = new (label?: string, options?: { fatal?: boolean; ignoreBOM?: boolean }) => {
  decode(input?: ArrayBuffer | ArrayBufferView, options?: { stream?: boolean }): string;
};

const g = globalThis as unknown as { TextDecoder?: DecoderCtor };
const Base = g.TextDecoder;

function isUtf16le(label: unknown): boolean {
  const l = String(label ?? "").trim().toLowerCase();
  return l === "utf-16le" || l === "utf-16" || l === "utf16le";
}

function decodeUtf16le(input?: ArrayBuffer | ArrayBufferView): string {
  if (!input) return "";
  const bytes = ArrayBuffer.isView(input)
    ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
    : new Uint8Array(input);
  let out = "";
  for (let i = 0; i + 1 < bytes.length; i += 2) out += String.fromCharCode(bytes[i] | (bytes[i + 1] << 8));
  return out;
}

if (Base) {
  try {
    new Base("utf-16le");
  } catch {
    class TextDecoderWithUtf16 extends Base {
      private readonly utf16: boolean;
      constructor(label?: string, options?: { fatal?: boolean; ignoreBOM?: boolean }) {
        const utf16 = isUtf16le(label);
        super(utf16 ? "utf-8" : label, options);
        this.utf16 = utf16;
      }
      decode(input?: ArrayBuffer | ArrayBufferView, options?: { stream?: boolean }): string {
        return this.utf16 ? decodeUtf16le(input) : super.decode(input, options);
      }
    }
    g.TextDecoder = TextDecoderWithUtf16;
  }
}

export {};
