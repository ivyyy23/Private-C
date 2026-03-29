/**
 * ElevenLabs preview from extension dashboard (requires API key + manifest host permission).
 * Falls back to Web Speech API when no key.
 */
export async function playVoicePreview(text, { apiKey, voiceId, level = "medium" } = {}) {
  if (apiKey && voiceId) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `ElevenLabs ${res.status}`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.playbackRate = level === "low" ? 0.9 : level === "high" ? 1.08 : 1;
    await audio.play();
    await new Promise((r) => {
      audio.onended = r;
      audio.onerror = r;
    });
    URL.revokeObjectURL(url);
    return;
  }

  if (typeof window !== "undefined" && window.speechSynthesis) {
    return new Promise((resolve, reject) => {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = level === "low" ? 0.85 : level === "high" ? 1.1 : 1;
      u.onend = () => resolve();
      u.onerror = (e) => reject(e);
      window.speechSynthesis.speak(u);
    });
  }
}
