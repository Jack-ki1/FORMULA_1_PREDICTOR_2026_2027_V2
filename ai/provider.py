import logging
from typing import Dict, Any, Optional
import requests
from config.settings import settings
from ai.local.ollama_provider import OllamaClient
from ai.agents.chief_strategist import ChiefStrategistAgent

logger = logging.getLogger(__name__)

# Free providers – always available, no API key
try:
    from ai.free_providers import PollinationsFreeClient, HuggingFaceFreeClient, LocalRuleBasedClient
except Exception:
    PollinationsFreeClient = None
    HuggingFaceFreeClient = None
    LocalRuleBasedClient = None


class AIProviderError(Exception):
    """Base exception for AI provider errors."""
    pass


class HuggingFaceClient:
    """Client for Hugging Face Inference API."""
    
    def __init__(self):
        self.api_key = settings.HUGGINGFACE_API_KEY
        self.model_id = settings.HUGGINGFACE_MODEL_ID
        self.base_url = "https://api-inference.huggingface.co/models/"
        
        if not self.api_key:
            logger.warning("Hugging Face API key not configured")
    
    def predict(self, prompt: str = "", **kwargs) -> Dict[str, Any]:
        """Make prediction using Hugging Face model. Supports uniform kwargs interface."""
        # Accept prompt as positional or via kwargs (prompt / inputs)
        if not prompt:
            prompt = kwargs.get("prompt") or kwargs.get("inputs") or ""
        if isinstance(prompt, dict):
            prompt = prompt.get("prompt") or prompt.get("inputs") or str(prompt)
        if not self.api_key:
            raise AIProviderError("Hugging Face API key not configured")
        if not prompt:
            raise AIProviderError("Empty prompt")
        
        try:
            headers = {"Authorization": f"Bearer {self.api_key}"}
            response = requests.post(
                f"{self.base_url}{self.model_id}",
                headers=headers,
                json={"inputs": prompt},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                # Normalize to {text: ...}
                if isinstance(data, list) and data and isinstance(data[0], dict) and "generated_text" in data[0]:
                    return {"text": data[0]["generated_text"], "provider": "huggingface", "model": self.model_id}
                if isinstance(data, dict) and "generated_text" in data:
                    return {"text": data["generated_text"], "provider": "huggingface", "model": self.model_id}
                # Fallback: return raw but wrap
                text = str(data)[:4000] if data else ""
                if text:
                    return {"text": text, "provider": "huggingface", "model": self.model_id}
                return data if isinstance(data, dict) else {"text": str(data), "provider": "huggingface"}
            else:
                error_msg = f"Hugging Face API error {response.status_code}: {response.text}"
                logger.error(error_msg)
                raise AIProviderError(error_msg)
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error with Hugging Face API: {e}")
            raise AIProviderError(f"Network error: {str(e)}") from e
        except AIProviderError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error with Hugging Face API: {e}")
            raise AIProviderError(f"Unexpected error: {str(e)}") from e


class OpenAIClient:
    """Client for OpenAI API – now supports chat.completions and uniform kwargs."""
    
    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self.model = settings.OPENAI_MODEL
        self.base_url = "https://api.openai.com/v1/chat/completions"
        
        if not self.api_key:
            logger.warning("OpenAI API key not configured")
    
    def predict(self, prompt: str = "", **kwargs) -> Dict[str, Any]:
        """Make prediction using OpenAI model. Supports uniform kwargs."""
        if not prompt:
            prompt = kwargs.get("prompt") or kwargs.get("inputs") or ""
        if isinstance(prompt, dict):
            prompt = prompt.get("prompt") or str(prompt)
        if not self.api_key:
            raise AIProviderError("OpenAI API key not configured")
        if not prompt:
            raise AIProviderError("Empty prompt")
        
        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": kwargs.get("model") or self.model,
                "messages": [
                    {"role": "system", "content": "You are a concise Formula 1 analysis assistant. State uncertainty and do not invent telemetry."},
                    {"role": "user", "content": prompt}
                ],
                "max_tokens": int(kwargs.get("max_tokens", 800)),
                "temperature": float(kwargs.get("temperature", 0.7))
            }
            
            response = requests.post(
                self.base_url,
                headers=headers,
                json=payload,
                timeout=15
            )
            
            if response.status_code == 200:
                data = response.json()
                choices = data.get("choices", [])
                if choices:
                    content = choices[0].get("message", {}).get("content", "")
                    if content:
                        return {"text": content, "provider": "openai", "model": payload["model"]}
                return data
            else:
                error_msg = f"OpenAI API error {response.status_code}: {response.text}"
                logger.error(error_msg)
                raise AIProviderError(error_msg)
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error with OpenAI API: {e}")
            raise AIProviderError(f"Network error: {str(e)}") from e
        except AIProviderError:
            raise
        except Exception as e:
            logger.error(f"Unexpected error with OpenAI API: {e}")
            raise AIProviderError(f"Unexpected error: {str(e)}") from e


class AIProviderFactory:
    """Factory for creating AI provider instances."""
    
    @staticmethod
    def get_provider():
        """Get appropriate AI provider based on configuration."""
        provider_name = settings.AI_PROVIDER.lower()
        
        if provider_name == 'huggingface':
            return HuggingFaceClient()
        elif provider_name == 'openai':
            return OpenAIClient()
        elif provider_name == 'ollama':
            return OllamaClient()
        else:
            logger.warning(f"Unknown AI provider: {provider_name}. Using fallback.")
            return None


class AIProviderManager:
    """Manager for handling AI provider fallback strategies."""
    
    def __init__(self):
        self.primary_provider = AIProviderFactory.get_provider()
        
    def predict(self, **kwargs) -> Dict[str, Any]:
        """Make prediction with fallback strategy. Never throws if free providers exist."""
        providers_tried = []
        
        # Try primary provider
        if self.primary_provider:
            try:
                result = self.primary_provider.predict(**kwargs)
                if result and (result.get("text") or result.get("choices") or result.get("generated_text")):
                    return result
                # If result is falsy, treat as failure
                if result:
                    return result
            except AIProviderError as e:
                providers_tried.append(type(self.primary_provider).__name__)
                logger.warning(f"Primary AI provider failed: {e}")
            except Exception as e:
                providers_tried.append(type(self.primary_provider).__name__)
                logger.warning(f"Primary AI provider exception: {e}")
        
        # Try fallback providers (includes free)
        fallback_providers = self._get_fallback_providers()
        for provider in fallback_providers:
            try:
                providers_tried.append(type(provider).__name__)
                result = provider.predict(**kwargs)
                if result:
                    # Normalize any provider that returned plain string
                    if isinstance(result, str):
                        return {"text": result, "provider": type(provider).__name__}
                    return result
            except AIProviderError as e:
                logger.warning(f"Fallback AI provider {type(provider).__name__} failed: {e}")
            except Exception as e:
                logger.warning(f"Fallback AI provider {type(provider).__name__} exception: {e}")

        # Last resort: deterministic local answer – guarantees the UI never breaks
        if LocalRuleBasedClient:
            try:
                prompt = kwargs.get("prompt") or kwargs.get("inputs") or ""
                if isinstance(prompt, dict):
                    prompt = str(prompt)
                client = LocalRuleBasedClient()
                result = client.chat(prompt, context=kwargs.get("context"))
                logger.info("Used LocalRuleBasedClient as final fallback")
                return result
            except Exception:
                pass

        # All providers failed - return error
        error_msg = f"All AI providers failed: {', '.join(providers_tried)}"
        logger.error(error_msg)
        raise AIProviderError(error_msg)

    def _get_fallback_providers(self):
        """Get fallback providers in order of preference. Always includes free providers."""
        fallbacks = []
        
        # Add Hugging Face if not primary and key exists
        if settings.HUGGINGFACE_API_KEY and \
           (not self.primary_provider or not isinstance(self.primary_provider, HuggingFaceClient)):
            fallbacks.append(HuggingFaceClient())
        
        # Add OpenAI if not primary and key exists
        if settings.OPENAI_API_KEY and \
           (not self.primary_provider or not isinstance(self.primary_provider, OpenAIClient)):
            fallbacks.append(OpenAIClient())
        
        # Add Ollama if not primary and configured
        if settings.OLLAMA_BASE_URL and \
           (not self.primary_provider or not isinstance(self.primary_provider, OllamaClient)):
            try:
                fallbacks.append(OllamaClient())
            except Exception:
                pass

        # --- FREE providers – always tried last, never require keys ---
        if PollinationsFreeClient:
            try:
                fallbacks.append(PollinationsFreeClient())
            except Exception:
                pass
        if HuggingFaceFreeClient:
            try:
                fallbacks.append(HuggingFaceFreeClient())
            except Exception:
                pass
        if LocalRuleBasedClient:
            try:
                fallbacks.append(LocalRuleBasedClient())
            except Exception:
                pass
        
        return fallbacks
    
    def call_multi_agent(self, query: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Call the Multi-Agent Pit Wall system to analyze a 'What-If' scenario.
        
        Args:
            query: Natural language scenario (e.g., "What happens if a Safety Car deploys on Lap 24?")
            context: Additional context like race_id, session_type, current_grid, etc.
        
        Returns:
            Dictionary with analysis results and broadcast-style narrative.
        """
        if context is None:
            context = {}
        
        try:
            # Initialize Chief Strategist Agent
            strategist = ChiefStrategistAgent()
            
            # Analyze the scenario
            result = strategist.analyze_scenario(query, context)
            
            return {
                "success": True,
                "result": result,
                "provider": "multi-agent",
                "timestamp": context.get("timestamp", "")
            }
            
        except Exception as e:
            logger.error(f"Multi-Agent Pit Wall analysis failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "provider": "multi-agent"
            }