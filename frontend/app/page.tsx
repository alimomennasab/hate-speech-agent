"use client";

import { useState } from "react";
import { useToggle } from "./hooks/useToggle";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

type ClassifyResult =
  | { routed: true; reasoning: string; classification: string; confidence: number }
  | { routed: false; reasoning: string };

export default function Home() {
  const [isPinned, togglePinned] = useToggle(false);
  const [isHovered, setIsHovered] = useState(false);
  const isInfoOpen = isHovered || isPinned;
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClassifyResult | null>(null);

  const handleCheck = async () => {
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: inputText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Request failed");
      setResult(data);
    } catch (err) {
      console.log(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f9f4e6]">
      <header className="flex items-center justify-between bg-[#ff3912] px-8 py-4">
        <h1 className="text-4xl font-semibold tracking-tight text-black">
          Is this hate speech?
        </h1>
        <div
          className="relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <button
            type="button"
            onClick={togglePinned}
            className="font-semibold text-black p-2 hover:opacity-90 transition-opacity"
          >
            HOW DOES THIS WORK?
          </button>
          {isInfoOpen && (
            <div className="absolute right-0 top-full mt-1 w-90 border border-gray-200 bg-white p-4 shadow-lg text-sm text-gray-700">
              <ol className="space-y-2 list-decimal list-inside">
                <h1>This demo mimics an agent that determines whether the content it processes should be classified for hate speech.</h1>
                <li><strong>Get input data</strong> — User provides text to moderate.</li>
                <li><strong>GPT API</strong> — A language model reasons whether the input is valid and should be classified for hate speech or not hate speech.</li>
                <li><strong>RoBERTa model</strong> — If the language model thinks we need to check the input for hate speech, API call to facebook/roberta-hate-speech-dynabench-r4-target for classification.</li>
                <li><strong>Display result</strong> — Based on the hate speech likelihood score, we display flagged or not flagged.</li>
              </ol>
            </div>
          )}
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-lg border border-gray-200 bg-white p-8 shadow-lg">
          <h1 className="text-xl font-semibold text-black text-center mb-4"> 
            Input text
          </h1>

          <h2 className="italic text-black text-center mb-4">
            If your text is hate speech, this agent will flag it.
          </h2>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
            rows={4}
            placeholder="example: go back to your country"
            disabled={loading}
          />

          {result && (
            <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <h1 className="font-bold text-black text-left"> Agent reasoning: </h1>
              <p className="text-sm text-gray-600 mb-2">{result.reasoning}</p>
              {result.routed ? (
                <div>
                  <p className="text-left text-black mt-2 font-bold">Agent verdict:</p>
                  <p className="text-black mt-2 font-medium">
                    {result.classification === "hate"
                      ? "Flagged: hate speech"
                      : "Not flagged: not hate speech"}
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
            className="mt-5 w-full rounded-xl bg-[#ff3912] py-3 text-xl text-black hover:opacity-90 transition-opacity font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Checking…" : "Check for hate speech"}
          </button>

        </div>
      </main>
    </div>
  );
}
