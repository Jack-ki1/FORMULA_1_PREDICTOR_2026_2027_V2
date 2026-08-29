"""
AI/LLM Client for prediction enhancement.
Supports Gemini, OpenAI, Anthropic, and OpenAI-compatible endpoints.
"""
import requests
import json
from typing import Dict, List, Any, Optional


class AIClient:
    """Client for AI/LLM providers to enhance predictions."""
    
    def __init__(self):
        self.providers = {
            'gemini': {
                'base_url': 'https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent',
                'headers': lambda key: {'Content-Type': 'application/json'},
                'key_param': 'key',
            },
            'openai': {
                'base_url': 'https://api.openai.com/v1/responses',
                'headers': lambda key: {
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {key}'
                },
                'key_param': None,
            },
            'anthropic': {
                'base_url': 'https://api.anthropic.com/v1/messages',
                'headers': lambda key: {
                    'Content-Type': 'application/json',
                    'x-api-key': key,
                    'anthropic-version': '2023-06-01'
                },
                'key_param': None,
            },
        }
    
    def _determine_provider(self, model: str) -> str:
        """Determine provider from model name."""
        if model.startswith('gemini'):
            return 'gemini'
        elif model.startswith('gpt'):
            return 'openai'
        elif model.startswith('claude'):
            return 'anthropic'
        elif model.startswith('llama') or model.startswith('mixtral') or model.startswith('mistral'):
            return 'openai'  # Usually via OpenAI-compatible endpoint
        else:
            return 'openai'  # Default
    
    def call_ai(
        self,
        model: str,
        api_key: str,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 1000,
    ) -> Optional[Dict[str, Any]]:
        """
        Call AI API with the given prompt.
        
        Args:
            model: Model identifier
            api_key: API key for the provider
            prompt: Prompt text
            temperature: Temperature parameter
            max_tokens: Maximum tokens to generate
        
        Returns:
            AI response as dictionary, or None if failed
        """
        provider = self._determine_provider(model)
        provider_config = self.providers.get(provider)
        
        if not provider_config:
            print(f"[AI Client] Unknown provider for model: {model}")
            return None
        
        url = provider_config['base_url'].format(model)
        headers = provider_config['headers'](api_key)
        
        # Build request based on provider
        if provider == 'gemini':
            # Gemini API format
            if provider_config['key_param']:
                url = f"{url}?{provider_config['key_param']}={api_key}"
            
            payload = {
                'contents': [{
                    'parts': [{'text': prompt}]
                }],
                'generationConfig': {
                    'temperature': temperature,
                    'maxOutputTokens': max_tokens,
                }
            }
            
            try:
                response = requests.post(url, headers=headers, json=payload, timeout=30)
                response.raise_for_status()
                data = response.json()
                
                # Extract text from Gemini response
                if 'candidates' in data and len(data['candidates']) > 0:
                    content = data['candidates'][0].get('content', {})
                    parts = content.get('parts', [])
                    if parts and len(parts) > 0:
                        return {'text': parts[0].get('text', ''), 'provider': provider}
                
                return None
            except Exception as e:
                print(f"[AI Client] Gemini API error: {e}")
                return None
                
        elif provider == 'openai':
            # Responses is OpenAI's current unified API.  Keep the provider
            # adapter here so the dashboard has one stable contract.
            payload = {
                'model': model,
                'instructions': 'You are a concise Formula 1 analysis assistant. State uncertainty and do not invent live telemetry.',
                'input': prompt,
                'temperature': temperature,
                'max_output_tokens': max_tokens,
                'store': False,
            }
            
            try:
                response = requests.post(url, headers=headers, json=payload, timeout=30)
                response.raise_for_status()
                data = response.json()
                
                text = data.get('output_text', '')
                if not text:
                    for item in data.get('output', []):
                        for content in item.get('content', []):
                            if content.get('type') == 'output_text':
                                text += content.get('text', '')
                if text:
                    return {'text': text, 'provider': provider}
                
                return None
            except Exception as e:
                print(f"[AI Client] OpenAI API error: {e}")
                return None
                
        elif provider == 'anthropic':
            # Anthropic API format
            payload = {
                'model': model,
                'max_tokens': max_tokens,
                'messages': [{'role': 'user', 'content': prompt}],
                'temperature': temperature,
            }
            
            try:
                response = requests.post(url, headers=headers, json=payload, timeout=30)
                response.raise_for_status()
                data = response.json()
                
                # Extract text from Anthropic response
                if 'content' in data and len(data['content']) > 0:
                    return {
                        'text': data['content'][0].get('text', ''),
                        'provider': provider
                    }
                
                return None
            except Exception as e:
                print(f"[AI Client] Anthropic API error: {e}")
                return None
        
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
        Get AI insights for race predictions.
        
        Args:
            model: Model identifier
            api_key: API key
            race_context: Race information (circuit, weather, etc.)
            current_predictions: Current statistical predictions
            temperature: Temperature parameter
        
        Returns:
            AI insights including adjustments
        """
        # Build prompt
        prompt = f"""You are an F1 racing expert. Analyze the following race prediction and provide insights.

Race: {race_context.get('race_name', 'Unknown')}
Circuit: {race_context.get('circuit', 'Unknown')}
Weather: {race_context.get('weather', 'Unknown')}
Session: {race_context.get('session_type', 'Unknown')}

Current top 5 predictions (driver, probability):
{self._format_predictions(current_predictions)}

Provide your analysis in JSON format with this structure:
{{
    "insights": "brief analysis of the race",
    "upset_picks": ["driver1", "driver2"],
    "risk_factors": ["factor1", "factor2"],
    "adjustments": {{
        "DRIVER_CODE": -0.1 to 0.1 adjustment
    }}
}}

Only include adjustments for drivers you think are significantly over or under-valued."""
        
        response = self.call_ai(model, api_key, prompt, temperature)
        
        if response:
            try:
                # Try to parse JSON from response
                text = response['text']
                # Find JSON in the response
                start_idx = text.find('{')
                end_idx = text.rfind('}') + 1
                if start_idx >= 0 and end_idx > start_idx:
                    json_str = text[start_idx:end_idx]
                    insights = json.loads(json_str)
                    return {
                        'insights': insights,
                        'provider': response['provider'],
                        'raw_text': text
                    }
            except Exception as e:
                print(f"[AI Client] Failed to parse AI response: {e}")
        
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
