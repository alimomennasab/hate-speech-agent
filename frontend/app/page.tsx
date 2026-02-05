"use client";

import { useState } from "react";
import { useToggle } from "./hooks/useToggle";

export default function Home() {
  const [isPinned, togglePinned] = useToggle(false);
  const [isHovered, setIsHovered] = useState(false);
  const isInfoOpen = isHovered || isPinned;

  const handleCheck = () => {
    console.log("Check button clicked");
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
            <div className="absolute right-0 top-full mt-1 w-80 rounded border border-gray-200 bg-white p-4 shadow-lg text-sm text-gray-700">
              <ol className="space-y-2 list-decimal list-inside">
                <li><strong>Get input data</strong> — User provides text to analyze.</li>
                <li><strong>GPT API</strong> — A language model reasons whether the input is valid and should be classified for hate speech or not hate speech.</li>
                <li><strong>RoBERTa model</strong> — API call to facebook/roberta-hate-speech-dynabench-r4-target for classification.</li>
                <li><strong>Display result</strong> — Based on the score (hatespeech / nothatespeech), we display flagged or not flagged.</li>
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

          <textarea
            className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
            rows={4}
            placeholder="hate speech example: go back to your country"
          />

          <button
            type="button"
            onClick={handleCheck}
            className="mt-5 w-full rounded-xl bg-[#ff3912] py-3 text-xl text-black hover:opacity-90 transition-opacity font-semibold"
          >
            Check for hate speech
          </button>

        </div>
      </main>
    </div>
  );
}
