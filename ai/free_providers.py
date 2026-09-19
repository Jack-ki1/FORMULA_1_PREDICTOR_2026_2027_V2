"""
Free AI providers that require NO API key.
- Pollinations (text.pollinations.ai / gen.pollinations.ai) – fully free, no key
- Puter server proxy – free text endpoint via Pollinations fallback
- Local Ollama – free when running locally

These are used as fallback when user has no API key,
making the AI section work out-of-the-box.
"""
import logging
import requests
import json
import time
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class PollinationsFreeClient:
    """Free Pollinations text API – no key required for low-volume use."""

    def __init__(self, timeout: int = 25):
        self.timeout = timeout
        # Primary: legacy free text endpoint (GET, no auth)
        self.text_endpoint = "https://text.pollinations.ai"
        # Backup: gen.pollinations.ai openai-compatible (also works unauthenticated for most models)
        self.openai_endpoint = "https://gen.pollinations.ai/v1/chat/completions"

    def chat(self, prompt: str, model: str = "openai", temperature: float = 0.7, max_tokens: int = 1200) -> Optional[Dict[str, Any]]:
        # Try legacy GET endpoint first – most reliable free path
        try:
            # text.pollinations.ai expects URL-encoded prompt, optional ?model= param
            # Use simple GET with prompt as path
            encoded = requests.utils.quote(prompt[:8000])
            # Use openai model by default; pollinations maps "openai" -> gpt-4o-mini class
            url = f"{self.text_endpoint}/{encoded}?model={model}&json=true"
            # Some deployments need ?model=openai
            resp = requests.get(url, timeout=self.timeout, headers={"Accept": "application/json"})
            if resp.status_code == 200:
                text = resp.text.strip()
                # Try to parse JSON, fallback to raw text
                try:
                    data = resp.json()
                    if isinstance(data, dict) and "choices" in data:
                        c = data["choices"][0].get("message", {}).get("content", "")
                        if c:
                            return {"text": c, "provider": "pollinations", "model": model}
                    if isinstance(data, dict) and "content" in data:
                        return {"text": data["content"], "provider": "pollinations", "model": model}
                except Exception:
                    pass
                if text and len(text) > 10 and "error" not in text.lower()[:200]:
                    # pollinations sometimes returns plain text
                    return {"text": text, "provider": "pollinations", "model": model}
        except Exception as e:
            logger.debug(f"Pollinations GET failed: {e}")

        # Try OpenAI-compatible POST without key
        try:
            payload = {
                "model": model if model not in ("custom", "") else "openai",
                "messages": [
                    {"role": "system", "content": "You are a concise Formula 1 analyst. Be factual, do not invent telemetry."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
            resp = requests.post(self.openai_endpoint, json=payload, timeout=self.timeout, headers={"Content-Type": "application/json"})
            if resp.status_code == 200:
                data = resp.json()
                choices = data.get("choices", [])
                if choices:
                    content = choices[0].get("message", {}).get("content", "")
                    if content:
                        return {"text": content, "provider": "pollinations", "model": model}
            else:
                logger.debug(f"Pollinations OpenAI endpoint {resp.status_code}: {resp.text[:300]}")
        except Exception as e:
            logger.debug(f"Pollinations POST failed: {e}")

        return None

    def predict(self, prompt: str = "", **kwargs) -> Dict[str, Any]:
        """Unified predict interface for AIProviderManager."""
        actual_prompt = prompt or kwargs.get("prompt") or kwargs.get("inputs") or ""
        if isinstance(actual_prompt, dict):
            actual_prompt = actual_prompt.get("prompt", "") or str(actual_prompt)
        model = kwargs.get("model", "openai")
        temp = kwargs.get("temperature", 0.7)
        max_tokens = kwargs.get("max_tokens", 1200)
        result = self.chat(actual_prompt, model=model, temperature=temp, max_tokens=max_tokens)
        if result:
            return result
        raise Exception("Pollinations free provider unavailable")


class HuggingFaceFreeClient:
    """HuggingFace Inference free tier – works without key for public models, rate-limited."""

    def __init__(self, timeout: int = 25):
        self.timeout = timeout
        # Use a small instruct model that works well free
        self.model_id = "HuggingFaceH4/zephyr-7b-beta"
        self.base_url = "https://api-inference.huggingface.co/models/"

    def chat(self, prompt: str, temperature: float = 0.7, max_tokens: int = 600) -> Optional[Dict[str, Any]]:
        try:
            # No auth header – HF allows limited anonymous calls for public models
            resp = requests.post(
                f"{self.base_url}{self.model_id}",
                json={"inputs": prompt, "parameters": {"max_new_tokens": max_tokens, "temperature": temperature, "return_full_text": False}},
                timeout=self.timeout,
            )
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, list) and data and "generated_text" in data[0]:
                    return {"text": data[0]["generated_text"], "provider": "huggingface-free", "model": self.model_id}
                if isinstance(data, dict) and "generated_text" in data:
                    return {"text": data["generated_text"], "provider": "huggingface-free", "model": self.model_id}
            else:
                logger.debug(f"HF free {resp.status_code}: {resp.text[:300]}")
        except Exception as e:
            logger.debug(f"HF free failed: {e}")
        return None

    def predict(self, prompt: str = "", **kwargs) -> Dict[str, Any]:
        actual_prompt = prompt or kwargs.get("prompt") or kwargs.get("inputs") or ""
        if isinstance(actual_prompt, dict):
            actual_prompt = str(actual_prompt)
        result = self.chat(actual_prompt, temperature=kwargs.get("temperature", 0.7), max_tokens=kwargs.get("max_tokens", 600))
        if result:
            return result
        raise Exception("HuggingFace free provider unavailable")


class LocalRuleBasedClient:
    """Deterministic rule-based fallback – always works, no network.
    Used to ensure AI chat NEVER fully fails; provides vetted, project-aware answers
    when all external providers are down.
    """

    def _format_top(self, predictions: Dict[str, float] | None) -> str:
        if not predictions:
            return "No active prediction loaded."
        sorted_preds = sorted(predictions.items(), key=lambda x: x[1], reverse=True)[:5]
        return "\n".join([f"- {code}: {p:.1%}" for code, p in sorted_preds])

    def chat(self, prompt: str, context: Dict[str, Any] | None = None) -> Dict[str, Any]:
        context = context or {}
        predictions = context.get("predictions")
        race = context.get("race_name", "selected Grand Prix")
        # Simple classification of intent
        q = prompt.lower()
        if any(k in q for k in ("vet", "prediction", "confidence", "winner", "podium", "undervalued", "overvalued")):
            if predictions:
                top = self._format_top(predictions)
                text = (
                    f"**Prediction vetting for {race}:**\n\n"
                    f"Top predicted win probabilities:\n{top}\n\n"
                    f"**Vetting notes:**\n"
                    f"- Grid position drives ~43% of race outcome (see Grid Weight slider). If P1 is not the top driver, check if wet_skill or chaos smoothing flattened the field.\n"
                    f"- Chaos level blends toward uniform – high chaos reduces favourite gap. Lower it to sharpen.\n"
                    f"- Wet/mixed weather boosts drivers with high wet_skill (HAM 88, ALO 92, VER 90 vs field avg ~70).\n"
                    f"- DNF risk is model-driven; reliability <75 (e.g. PER 66, BOT 70) inflates risk at high-reliability circuits.\n"
                    f"- Confidence score <0.55 ⇒ model is uncertain; treat top 3 as a cluster, not a single pick.\n"
                    f"\nAsk me to compare two drivers or explain why a specific driver is ranked where they are."
                )
            else:
                text = (
                    "No prediction is loaded yet – run the prediction engine first (select a Grand Prix and hit Run Prediction). "
                    "Once loaded I can vet the top picks, explain confidence, and flag over/under-valued drivers against grid and wet skill."
                )
        elif any(k in q for k in ("how", "engine", "model", "monte carlo", "ensemble")):
            text = (
                "**How the predictor works:**\n"
                "- Grid: live Q3 model or manual P1-P22 (heavily weighted, ~43% pole→win).\n"
                "- Monte Carlo (up to 100k sims): simulates race with chaos, weather, safety-car, tyre degradation.\n"
                "- Probability shaping: chaos slider linearly blends toward uniform; reliability and wet_skill modulate DNF.\n"
                "- Targets: Winner (58% vs 4.5% random), Podium 89%, Points 81%, Q3 74% (backtested).\n"
                "- AI blend (optional): LLM provides adjustments ±0.1 blended by AI weight.\n"
            )
        elif any(k in q for k in ("calendar", "round", "next race", "season")):
            text = (
                "2026 season is 23 rounds (Mar 6 Abu Dhabi finale Dec 4-6). Next upcoming races include Azerbaijan (Baku, Sep 25-27, SC 55% – chaotic), "
                "Malaysia-Sepang (Sepang, Oct 2-4, rain 55%, temp 32°C), Singapore (Marina Bay, Oct 9-11, SC 65% – highest). "
                "Use the dashboard Grand Prix selector to load circuit traits (laps, DRS zones, overtaking, base rain/SC)."
            )
        else:
            text = (
                f"You asked: \"{prompt[:300]}\"\n\n"
                "I’m the **project-aware F1 predictor assistant**. I know:\n"
                "- 11 teams / 22 drivers with strength/reliability/wet_skill (e.g., ANT 97 strength leader, RUS 88, VER 90 wet skill).\n"
                "- Full 23-race calendar with base rain/SC/temp per circuit.\n"
                "- Engine internals: GridModel → MonteCarlo → chaos smoothing → probability_model → AI blend.\n"
                "- Current prediction (if you’ve run one) and how to vet it (grid weight, chaos, wet skill, DNF).\n\n"
                "Try: *\"Vet my current prediction\"*, *\"Why is HAM above LEC here?\"*, *\"Explain the engine\"*, or *\"What’s risky about Baku?\"*"
            )
        return {"text": text, "provider": "local-rules", "model": "rule-based-v1"}

    def predict(self, prompt: str = "", **kwargs) -> Dict[str, Any]:
        actual_prompt = prompt or kwargs.get("prompt") or kwargs.get("inputs") or ""
        if isinstance(actual_prompt, dict):
            actual_prompt = str(actual_prompt)
        result = self.chat(actual_prompt, context=kwargs.get("context"))
        return result
