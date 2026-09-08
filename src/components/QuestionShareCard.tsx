import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";

interface QuestionShareCardProps {
  url: string;
  question: string;
}

export function QuestionShareCard({ url, question }: QuestionShareCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard có thể bị chặn (không phải HTTPS, trình duyệt cũ) - user tự copy tay
    }
  }

  return (
    <div className="w-full rounded-2xl bg-stage-800 p-5">
      <p className="mb-3 text-center font-display text-sm font-semibold text-white/90 line-clamp-2">
        {question}
      </p>
      <div className="flex justify-center rounded-xl bg-white p-3">
        <QRCodeSVG value={url} size={180} />
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-black/20 px-3 py-2">
        <code className="flex-1 truncate text-xs text-white/70">{url}</code>
        <button
          onClick={handleCopy}
          className="shrink-0 rounded-md bg-amber px-2 py-1 text-xs font-semibold text-stage-900"
        >
          {copied ? "Đã copy" : "Copy"}
        </button>
      </div>
    </div>
  );
}
