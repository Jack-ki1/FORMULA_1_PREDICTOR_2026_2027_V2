'''
AI/LLM Client for prediction enhancement.
Supports Gemini, OpenAI, Anthropic, Groq, Mistral, Cohere, OpenAI-compatible,
plus FREE providers: Puter.js (client-side), Pollinations, HuggingFace-free,
and a deterministic local fallback so the AI section never breaks.

The AI is project-aware: every prompt is enriched with calendar/lineup/engine context
via ai.project_context.
'''
import logging
import requests
import json
from typing import Dict, List, Any, Optional
from ai.provider import AIProviderManager

logger = logging.getLogger(__name__)

# Free provider detection
FREE_MODEL_PREFIXES = (
    "pollinations", "puter", "free", "hf-free", "local",
)
FREE_MODEL_IDS = {
    # Puter free models (client-side, but also work server-side via Pollinations fallback)
    "puter-gpt-4o-mini", "puter-gpt-5-nano", "puter-claude-sonnet", "puter-gemini-flash",
    "gpt-4o-mini-free", "pollinations-openai", "pollinations-mistral", "openai-free",
    "gemini-flash-free", "llama-free", "mistral-free",
}


class AIClient:
    """Client for AI/LLM providers to enhance predictions and chat."""
    
    def __init__(self):
        self.provider_manager = AIProviderManager()
    
    def is_free_model(self, model: str) -> bool:
        """True if model is a free/no-key model (Puter, Pollinations, local)."""
        m = model.lower()
        if m in FREE_MODEL_IDS:
            return True
        if m.startswith(FREE_MODEL_PREFIXES):
            return True
        # Puter-style slugs like openai/gpt-4o-mini, google/gemini-2.0 etc are often free via Puter
        if "/" in m and m.startswith(("openai/", "google/", "anthropic/", "meta-llama/", "mistralai/")):
            # These are Puter model IDs – treat as free when no api key is present (fallback path handles it)
            return False  # only free if api_key empty – handled in call_ai
        return False

    def _determine_provider(self, model: str) -> str:
        """Determine provider from model name."""
        m = model.lower()
        # Free provider prefix
        if m.startswith("pollinations") or m.startswith("puter") or m.startswith("free"):
            return "free"
        if m.startswith('gemini'):
            return 'gemini'
        elif m.startswith('gpt') or m.startswith('o1') or m.startswith('o3') or m.startswith('text-embedding') or m.startswith('chatgpt'):
            return 'openai'
        elif m.startswith('claude'):
            return 'anthropic'
        elif m.startswith('llama') or m.startswith('gemma'):
            return 'groq'
        elif m.startswith('mistral') or m.startswith('mixtral'):
            return 'mistral'
        elif m.startswith('command'):
            return 'cohere'
        elif m.startswith('deepseek'):
            return 'deepseek'
        elif m.startswith('qwen'):
            return 'qwen'
        else:
            return 'openai_compatible'
    
    def _enrich_with_project_context(self, prompt: str, context: Dict[str, Any] | None = None) -> str:
        """Inject project-aware context so free models also understand the predictor."""
        try:
            from ai.project_context import build_project_context
            ctx = build_project_context(
                user_query=prompt,
                race_id=(context or {}).get("race_id"),
                predictions=(context or {}).get("predictions"),
                grid_positions=(context or {}).get("grid_positions"),
            )
            # Prepend context, keep user prompt at end for relevance
            return ctx
        except Exception as e:
            logger.debug(f"Context enrichment failed: {e}")
            return prompt

    def call_ai(
        self,
        model: str,
        api_key: str,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 1000,
        context: Dict[str, Any] | None = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Call AI API with the given prompt.
        Now supports FREE models (no API key): routes through Pollinations / local fallback.
        
        Args:
            model: Model identifier
            api_key: API key for the provider (optional for free models)
            prompt: Prompt text
            temperature: Temperature parameter
            max_tokens: Maximum tokens to generate
            context: Optional project context {race_id, predictions, grid_positions}
        
        Returns:
            AI response as dictionary, or None if failed
        """
        # Enrich prompt with project knowledge for all calls
        enriched_prompt = self._enrich_with_project_context(prompt, context)

        # Free path: no API key required – use provider_manager free chain
        if not api_key or not api_key.strip():
            # If model is free-ish or any model with no key, try free chain first
            try:
                # Re-use project-enriched prompt
                result = self.provider_manager.predict(prompt=enriched_prompt, model=model, temperature=temperature, max_tokens=max_tokens, context=context)
                if result and result.get("text"):
                    return result
            except Exception as e:
                logger.debug(f"Free provider chain failed for {model}: {e}")
            # Also try pollinations directly with shorter raw prompt as fallback
            try:
                from ai.free_providers import PollinationsFreeClient
                client = PollinationsFreeClient()
                # For pollinations, use raw prompt (enriched is too long for GET URL); send enriched via POST if needed
                raw = prompt[:3000]
                res = client.chat(raw, model="openai", temperature=temperature, max_tokens=max_tokens)
                if res:
                    return res
            except Exception:
                pass
            # Local rule-based is guaranteed – try it
            try:
                from ai.free_providers import LocalRuleBasedClient
                client = LocalRuleBasedClient()
                return client.chat(prompt, context=context)
            except Exception:
                pass
            logger.warning("No API key and free providers unavailable")
            return None

        provider = self._determine_provider(model)

        # If provider is free, delegate to free chain even when key is present (cheaper/free)
        if provider == "free":
            try:
                result = self.provider_manager.predict(prompt=enriched_prompt, model=model, temperature=temperature, max_tokens=max_tokens, context=context)
                if result and result.get("text"):
                    return result
            except Exception as e:
                logger.debug(f"Free provider failed: {e}")
            # continue to try paid providers below as fallback if free fails
        
        try:
            if provider == 'gemini':
                # Gemini REST generateContent API - updated for latest models
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key.strip()}"
                headers = {'Content-Type': 'application/json'}
                payload = {
                    'contents': [{'parts': [{'text': prompt}]}],
                    'generationConfig': {
                        'temperature': temperature,
                        'maxOutputTokens': max_tokens,
                    }
                }
                try:
                    # Use enriched prompt for Gemini
                    payload["contents"][0]["parts"][0]["text"] = enriched_prompt
                    resp = requests.post(url, headers=headers, json=payload, timeout=30)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get('candidates', [])
                        if candidates:
                            parts = candidates[0].get('content', {}).get('parts', [])
                            if parts:
                                return {'text': parts[0].get('text', ''), 'provider': 'gemini'}
                    else:
                        logger.warning(f"Gemini API error {resp.status_code}: {resp.text}")
                        # Try fallback to v1 API if v1beta fails
                        if 'v1beta' in url:
                            fallback_url = url.replace('v1beta', 'v1')
                            resp = requests.post(fallback_url, headers=headers, json=payload, timeout=30)
                            if resp.status_code == 200:
                                data = resp.json()
                                candidates = data.get('candidates', [])
                                if candidates:
                                    parts = candidates[0].get('content', {}).get('parts', [])
                                    if parts:
                                        return {'text': parts[0].get('text', ''), 'provider': 'gemini'}
                except Exception as gemini_err:
                    logger.warning(f"Gemini API request failed: {gemini_err}")

            elif provider == 'anthropic':
                # Anthropic Messages API
                url = "https://api.anthropic.com/v1/messages"
                headers = {
                    'Content-Type': 'application/json',
                    'x-api-key': api_key.strip(),
                    'anthropic-version': '2023-06-01'
                }
                payload = {
                    'model': model,
                    'max_tokens': max_tokens,
                    'messages': [{'role': 'user', 'content': enriched_prompt}],
                    'temperature': temperature,
                }
                resp = requests.post(url, headers=headers, json=payload, timeout=25)
                if resp.status_code == 200:
                    data = resp.json()
                    content = data.get('content', [])
                    if content:
                        return {'text': content[0].get('text', ''), 'provider': 'anthropic'}
                else:
                    logger.warning(f"Anthropic API error {resp.status_code}: {resp.text}")

            elif provider == 'groq':
                url = "https://api.groq.com/openai/v1/chat/completions"
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': f"Bearer {api_key.strip()}"
                }
                payload = {
                    'model': model,
                    'messages': [
                        {'role': 'system', 'content': 'You are a concise Formula 1 analysis assistant.'},
                        {'role': 'user', 'content': enriched_prompt}
                    ],
                    'temperature': temperature,
                    'max_tokens': max_tokens
                }
                resp = requests.post(url, headers=headers, json=payload, timeout=25)
                if resp.status_code == 200:
                    data = resp.json()
                    choices = data.get('choices', [])
                    if choices:
                        return {'text': choices[0].get('message', {}).get('content', ''), 'provider': 'groq'}
                else:
                    logger.warning(f"Groq API error {resp.status_code}: {resp.text}")

            elif provider == 'mistral':
                url = "https://api.mistral.ai/v1/chat/completions"
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': f"Bearer {api_key.strip()}"
                }
                payload = {
                    'model': model,
                    'messages': [
                        {'role': 'system', 'content': 'You are a concise Formula 1 analysis assistant.'},
                        {'role': 'user', 'content': enriched_prompt}
                    ],
                    'temperature': temperature,
                    'max_tokens': max_tokens
                }
                resp = requests.post(url, headers=headers, json=payload, timeout=25)
                if resp.status_code == 200:
                    data = resp.json()
                    choices = data.get('choices', [])
                    if choices:
                        return {'text': choices[0].get('message', {}).get('content', ''), 'provider': 'mistral'}
                else:
                    logger.warning(f"Mistral API error {resp.status_code}: {resp.text}")

            else:
                # Default OpenAI / OpenAI-compatible endpoint
                url = "https://api.openai.com/v1/chat/completions"
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': f"Bearer {api_key.strip()}"
                }
                payload = {
                    'model': model if model != 'custom' else 'gpt-4o',
                    'messages': [
                        {'role': 'system', 'content': 'You are a concise Formula 1 analysis assistant. State uncertainty and do not invent live telemetry.'},
                        {'role': 'user', 'content': enriched_prompt}
                    ],
                    'temperature': temperature,
                    'max_tokens': max_tokens,
                }
                resp = requests.post(url, headers=headers, json=payload, timeout=25)
                if resp.status_code == 200:
                    data = resp.json()
                    choices = data.get('choices', [])
                    if choices:
                        return {'text': choices[0].get('message', {}).get('content', ''), 'provider': 'openai'}
                else:
                    logger.warning(f"OpenAI API error {resp.status_code}: {resp.text}")

        except Exception as e:
            logger.warning(f"AI API request failed for {model}: {e}")

        # Paid providers failed – try free chain as last resort before giving up
        try:
            result = self.provider_manager.predict(prompt=enriched_prompt, model=model, temperature=temperature, max_tokens=max_tokens, context=context)
            if result and result.get("text"):
                logger.info(f"Fallback to free provider succeeded after paid failure for {model}")
                return result
        except Exception:
            pass
        try:
            from ai.free_providers import LocalRuleBasedClient
            return LocalRuleBasedClient().chat(prompt, context=context)
        except Exception:
            pass

        return None
    
    def call_multi_agent(
        self,
        query: str,
        context: Dict[str, Any] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Call the Multi-Agent Pit Wall system to analyze a 'What-If' scenario.
        
        Args:
            query: Natural language scenario (e.g., "What happens if a Safety Car deploys on Lap 24?")
            context: Additional context like race_id, session_type, current_grid, etc.
        
        Returns:
            Dictionary with analysis results and broadcast-style narrative.
        """
        try:
            result = self.provider_manager.call_multi_agent(query, context)
            
            if result.get("success"):
                return {
                    "result": result["result"],
                    "provider": result["provider"],
                    "timestamp": result.get("timestamp", "")
                }
            else:
                logger.error(f"Multi-Agent Pit Wall failed: {result.get('error', 'Unknown error')}")
                return None
                
        except Exception as e:
            logger.error(f"Multi-Agent Pit Wall call failed: {e}")
            return None
    
    def get_prediction_insights(
        self,
        model: str,
        api_key: str,
        race_context: Dict[str, Any],
        current_predictions: Dict[str, float],
        temperature: float = 0.7,
    ) -> Optional[Dict[str, Any]]:
        """
        Get AI insights and adjustments for race predictions.
        Now project-aware: injects full calendar/lineup/engine context.
        Works with free models (no api_key) too.
        """
        # Build enriched context for project-aware prompt
        try:
            from ai.project_context import build_project_context
            project_ctx = build_project_context(
                user_query=f"Analyze this race prediction and vet it for adjustments.",
                race_id=race_context.get("race_id"),
                predictions=current_predictions,
            )
            # Prepend project knowledge to the analysis prompt
            _prefix = project_ctx[:3000] + "\n\n---\n\n"
        except Exception:
            _prefix = ""

        prompt = f"""{_prefix}You are an F1 racing expert with deep knowledge of driver performance, circuit characteristics, and race strategy. Analyze the following race prediction and provide insights.

Race: {race_context.get('race_name', 'Unknown')}
Circuit: {race_context.get('circuit', 'Unknown')}
Weather: {race_context.get('weather', 'Unknown')}
Session: {race_context.get('session_type', 'Unknown')}
Sub-Session: {race_context.get('sub_session', 'N/A')}

Current top 5 predictions (driver, probability):
{self._format_predictions(current_predictions)}

Provide your analysis in JSON format with this exact structure:
{{
    "insights": "brief analysis of the race considering circuit characteristics, weather impact, and driver form",
    "upset_picks": ["driver1", "driver2"],
    "risk_factors": ["factor1", "factor2"],
    "adjustments": {{
        "DRIVER_CODE": 0.05
    }}
}}

Important guidelines:
- Only include adjustments between -0.1 and 0.1 for drivers you think are significantly over or under-valued
- Consider the specific session type (practice, qualifying, race) when making adjustments
- Factor in weather conditions and their impact on driver performance
- Be conservative with adjustments - small tweaks are better than large changes
- If you're uncertain about a driver, don't include them in adjustments"""
        
        try:
            # Pass project context so free providers also get it
            ctx = {"race_id": race_context.get("race_id"), "predictions": current_predictions}
            response = self.call_ai(model, api_key, prompt, temperature, context=ctx)
            
            if response and response.get('text'):
                try:
                    text = response['text']
                    start_idx = text.find('{')
                    end_idx = text.rfind('}') + 1
                    if start_idx >= 0 and end_idx > start_idx:
                        json_str = text[start_idx:end_idx]
                        insights = json.loads(json_str)
                        
                        # Validate adjustments
                        if 'adjustments' in insights:
                            for driver, adj in insights['adjustments'].items():
                                # Clamp adjustments to valid range
                                insights['adjustments'][driver] = max(-0.1, min(0.1, float(adj)))
                        
                        logger.info(f"AI insights generated successfully using {response.get('provider', 'ai')}")
                        return {
                            'insights': insights,
                            'provider': response.get('provider', 'ai'),
                            'raw_text': text
                        }
                except json.JSONDecodeError as e:
                    logger.warning(f"Failed to parse AI response JSON: {e}")
                    # Try to extract partial JSON or provide fallback
                    return self._fallback_insights(current_predictions)
                except Exception as e:
                    logger.warning(f"Error processing AI response: {e}")
                    return self._fallback_insights(current_predictions)
        except Exception as e:
            logger.warning(f"AI API call failed: {e}")
            return None
        
        return None
    
    def _fallback_insights(self, current_predictions: Dict[str, float]) -> Dict[str, Any]:
        """Provide fallback insights when AI fails."""
        sorted_preds = sorted(current_predictions.items(), key=lambda x: x[1], reverse=True)
        top_driver = sorted_preds[0][0] if sorted_preds else "VER"
        
        return {
            'insights': {
                'insights': f"Based on current model predictions, {top_driver} appears to be the favorite. Weather and track conditions will play a significant role in the final result.",
                'upset_picks': [sorted_preds[1][0] if len(sorted_preds) > 1 else "HAM"],
                'risk_factors': ['Weather conditions', 'Safety car probability', 'Tyre degradation'],
                'adjustments': {}  # No adjustments when AI fails
            },
            'provider': 'fallback',
            'raw_text': 'Fallback analysis due to AI unavailability'
        }
    
    def vet_predictions(
        self,
        model: str,
        api_key: str,
        race_id: str,
        session_type: str,
        predictions: Dict[str, float],
        grid_positions: Dict[str, int] | None = None,
        weather: str = "dry",
        temperature: float = 0.6,
    ) -> Optional[Dict[str, Any]]:
        """
        Vet a prediction – returns markdown analysis that can be shown directly in chat.
        Works without API key (free path).
        """
        try:
            from ai.project_context import build_vet_prompt
            prompt = build_vet_prompt(race_id, session_type, predictions, grid_positions, weather)
            ctx = {"race_id": race_id, "predictions": predictions, "grid_positions": grid_positions}
            res = self.call_ai(model, api_key, prompt, temperature=temperature, max_tokens=1200, context=ctx)
            if res and res.get("text"):
                return res
        except Exception as e:
            logger.warning(f"vet_predictions failed: {e}")
        # Fallback deterministic vet
        try:
            from ai.free_providers import LocalRuleBasedClient
            from ai.project_context import build_vet_prompt
            prompt = build_vet_prompt(race_id, session_type, predictions, grid_positions, weather)
            return LocalRuleBasedClient().chat(prompt, context={"race_id": race_id, "predictions": predictions, "grid_positions": grid_positions})
        except Exception:
            pass
        return None

    def _format_predictions(self, predictions: Dict[str, float]) -> str:
        """Format predictions for prompt."""
        sorted_preds = sorted(predictions.items(), key=lambda x: x[1], reverse=True)
        lines = []
        for driver, prob in sorted_preds[:5]:
            lines.append(f"  {driver}: {prob:.1%}")
        return '\n'.join(lines)


# Global AI client instance
ai_client = AIClient()
