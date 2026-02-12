"use client";

import { useState } from "react";
import { useToggle } from "@/app/hooks/useToggle"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const TICKER_EXAMPLES = [
  { text: "go back to your country", label: "hate speech" },
  { text: "I hate your kind", label: "hate speech" },
  {
    text: "You are awarded a BitCoin! call 09061221066 from landline. Delivery within 28 days.",
    label: "spam",
  },
  {
    text: "You win a free iPhone! Text 123-123-1234 your social security number.",
    label: "spam",
  },
  { text: "hello, how are you?", label: "not classified" },
  { text: "LeBron James is the greatest of all time", label: "not classified" },
] as const;

type ClassifyResult =
  | { routed: true; reasoning: string; classification_type: string; classification: string; confidence: number }
  | { routed: false; reasoning: string };

export default function Home() {
  const [isPinned, togglePinned] = useToggle(false);
  const [isHovered, setIsHovered] = useState(false);
  const isInfoOpen = isHovered || isPinned;
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [showTimeoutPopup, setShowTimeoutPopup] = useState(false);

  const TIMEOUT_MS = 60_000;

  const handleCheck = async () => {
    setResult(null);
    setLoading(true);
    setShowTimeoutPopup(false);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${API_URL}/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Request failed");
      setResult(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isTimeout =
        (err instanceof Error && err.name === "AbortError") ||
        msg === "Failed to fetch" ||
        /timed out|timeout/i.test(msg);
      if (isTimeout) {
        setShowTimeoutPopup(true);
      } else {
        console.log(err instanceof Error ? err.message : "Something went wrong");
      }
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };


  return (
    <div className="flex min-h-screen flex-col bg-[#f9f4e6]">
      {/* HEADER */}
      <header className="sticky top-0 z-100 flex flex-wrap items-center gap-2 bg-[#ff3912] px-4 py-3 sm:px-8 sm:py-4">
        <h1 className="flex-1 text-lg font-medium tracking-tight text-black sm:text-3xl">
          Content Moderation Agent
        </h1>
        <div
          className="relative ml-auto"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <button
            type="button"
            onClick={togglePinned}
            className="font-medium text-black p-2 hover:opacity-90 transition-opacity"
          >
            HOW IT WORKS
          </button>
          {/* INFO POPUP */}
          {isInfoOpen && (
            <div className="absolute right-0 top-full mt-1 w-90 border border-gray-200 bg-white p-4 shadow-lg text-sm text-gray-700 z-[1000]">
              <ol className="space-y-2 list-decimal list-inside">
                <h1>This demo mimics an agent that determines whether the content it processes should be classified for hate speech or spam.</h1>
                <li><strong>Get input data</strong> — User provides text to moderate.</li>
                <li><strong>GPT API</strong> — A language model reasons whether the input is valid and should be classified for hate speech or spam.</li>
                <li><strong>RoBERTa model</strong> — If the language model thinks we need to check the input for hate speech, API call to facebook/roberta-hate-speech-dynabench-r4-target for classification.</li>
                <li><strong>RoBERTa model</strong> — Otherwise, if the language model thinks we need to check the input for spam, API call to mrm8488/bert-tiny-finetuned-sms-spam-detection for classification.</li>
                <li><strong>Display result</strong> — Based on whether we send the content to a classifier, and the hate speech or spam likelihood score if we do, we display flagged or not flagged.</li>
              </ol>
            </div>
          )}
        </div>
      </header>

      <main className="relative z-0 flex flex-1 items-center justify-center px-4">
        {/* MAIN INPUT DIV */}
        <div className="w-full max-w-lg border border-gray-200 bg-white p-8 shadow-lg">
          <h1 className="text-xl font-semibold text-black text-center mb-4"> 
            Input text content
          </h1>

          <h2 className="italic text-black text-center mb-4">
            If your text is hate speech or spam, this agent will flag it.
          </h2>

          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="z-[10] w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-gray-900 transition-colors focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
              rows={6}
              disabled={loading}
            />
            {!inputText && (
              <div
                className="pointer-events-none absolute inset-0 flex flex-col gap-1 px-4 py-3.5 text-xs text-gray-400 sm:text-sm break-words"
                aria-hidden
              >
                <span>• Non-classified neutral speech example: hello, how are you</span>
                <span>• Unflagged but harmful speech example: I hate you</span>
                <span>• Flagged hate speech example: go back to your country</span>
                <span>• Flagged spam example: You win a free iPhone! Text 123-123-1234 your social security number.</span>
              </div>
            )}
          </div>

          {result && (
            <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <h1 className="font-bold text-black text-left"> Agent reasoning: </h1>
              <p className="text-sm text-gray-600 mb-2">{result.reasoning}</p>
              {result.routed ? (
                <div>
                  <p className="text-left text-black mt-2 font-bold">Agent verdict:</p>
                  <p className="text-black mt-2 font-medium">
                    {result.classification_type === "classify_hate"
                      ? result.classification === "hate"
                        ? "Flagged: hate speech"
                        : "Not flagged: not hate speech"
                      : result.classification_type === "classify_spam"
                        ? result.classification === "LABEL_1"
                          ? "Flagged: spam"
                          : "Not flagged: not spam"
                        : null}
                    {" "}
                    <span className="font-normal text-gray-600">
                      ({(result.confidence * 100).toFixed(1)}%)
                    </span>
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-left text-black mt-2 font-bold">Agent verdict:</p>
                  <p className="text-black mt-2 font-medium"> Not routed to classifier. </p>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleCheck}
            disabled={loading || !inputText.trim()}
            className="mt-5 w-full rounded-xl bg-[#ff3912] py-3 text-xl text-black hover:opacity-90 transition-opacity font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Checking…" : "Check for spam/hate speech"}
          </button>

        </div>
      </main>

      {/* TICKER */}
      <div className="overflow-hidden border-t border-[#ff3912] bg-[#f9f4eb] py-3">
        <div
          className="flex w-max gap-8 whitespace-nowrap text-sm text-gray-700"
          style={{
            animation: "ticker-scroll 45s linear infinite",
          }}
        >
          {[...TICKER_EXAMPLES, ...TICKER_EXAMPLES].map(({ text, label }, i) => (
            <span key={i} className="inline-flex shrink-0 items-center gap-2">
              <span className="max-w-[280px] truncate font-medium" title={text}>
                &ldquo;{text}&rdquo;
              </span>
              <span className="text-[#ff3912]">→</span>
              <span className="shrink-0 font-semibold text-gray-900">{label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-[#ff3912] bg-[#eee8dc] py-4 text-center text-sm text-gray-600">
        <a
          href="https://github.com/alimomennasab/hate-speech-agent"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[#ff3912] transition-colors"
        >
          View on GitHub
        </a>
      </footer>

      {showTimeoutPopup && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-black mb-3">Request timed out</h2>
            <p className="text-sm text-gray-700 mb-5">
              The request timed out. Unfortunately, I&apos;m on the Render free tier, which means my instance spins down after 15 mins of inactivity. This means the cron job I set up to ping my backend every 10 minutes is currently not working. Please retry in a few minutes.
            </p>
            <button
              type="button"
              onClick={() => setShowTimeoutPopup(false)}
              className="w-full rounded-xl bg-[#ff3912] py-2.5 text-black font-medium hover:opacity-90 transition-opacity"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
