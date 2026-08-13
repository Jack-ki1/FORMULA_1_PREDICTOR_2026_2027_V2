"""
Share card generator - creates shareable text/image summary cards.
Generates social media-friendly summary cards.
"""
from typing import Dict, Any
import json


class ShareCardGenerator:
    """Generates shareable summary cards for social media."""
    
    def generate_card(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate shareable summary card.
        
        Args:
            data: Prediction data dictionary
        
        Returns:
            Share card data with text and HTML representations
        """
        predictions = data.get('predictions', [])
        if not predictions:
            return {
                'error': 'No predictions available',
                'summary': 'Unable to generate share card',
            }
        
        # Extract top prediction
        top_prediction = predictions[0] if predictions else None
        top_driver = top_prediction.get('driver_code', 'Unknown') if top_prediction else 'Unknown'
        top_probability = top_prediction.get('probability', 0.0) if top_prediction else 0.0
        
        # Generate text summary
        text_summary = self._generate_text_summary(data, top_driver, top_probability)
        
        # Generate HTML card
        html_card = self._generate_html_card(data, top_driver, top_probability)
        
        # Generate markdown card
        markdown_card = self._generate_markdown_card(data, top_driver, top_probability)
        
        return {
            'summary': text_summary,
            'html': html_card,
            'markdown': markdown_card,
            'top_driver': top_driver,
            'top_probability': top_probability,
            'confidence': data.get('confidence', 0.0),
            'race_id': data.get('race_id', 'Unknown'),
            'target': data.get('target_id', 'Unknown'),
        }
    
    def _generate_text_summary(self, data: Dict[str, Any], top_driver: str, top_probability: float) -> str:
        """Generate text summary for sharing."""
        race_id = data.get('race_id', 'Unknown')
        target = data.get('target_id', 'Unknown')
        confidence = data.get('confidence', 0.0)
        
        summary = f"🏎️ F1 Predictor 2026\n"
        summary += f"📍 {race_id}\n"
        summary += f"🎯 {target.upper()} Prediction\n"
        summary += f"🏆 Top Pick: {top_driver} ({top_probability * 100:.1f}%)\n"
        summary += f"📊 Confidence: {confidence * 100:.1f}%\n"
        summary += f"#F1 #F1Predictor2026"
        
        return summary
    
    def _generate_html_card(self, data: Dict[str, Any], top_driver: str, top_probability: float) -> str:
        """Generate HTML card for sharing."""
        race_id = data.get('race_id', 'Unknown')
        target = data.get('target_id', 'Unknown')
        confidence = data.get('confidence', 0.0)
        
        html = f"""
        <div class="share-card" style="
            font-family: Arial, sans-serif;
            max-width: 400px;
            border: 2px solid #E10600;
            border-radius: 12px;
            padding: 20px;
            background: linear-gradient(135deg, #F4F5F7 0%, #FFFFFF 100%);
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        ">
            <div style="text-align: center; margin-bottom: 15px;">
                <div style="
                    font-size: 32px;
                    font-weight: 900;
                    color: #E10600;
                    margin-bottom: 5px;
                ">F1</div>
                <div style="font-size: 14px; font-weight: 700; color: #15151E;">
                    Predictor 2026
                </div>
            </div>
            
            <div style="
                background-color: #E10600;
                color: white;
                padding: 10px;
                border-radius: 6px;
                text-align: center;
                margin-bottom: 15px;
                font-weight: 600;
            ">
                {target.upper()} Prediction
            </div>
            
            <div style="margin-bottom: 15px;">
                <div style="font-size: 12px; color: #6B7280; margin-bottom: 5px;">
                    📍 Race
                </div>
                <div style="font-size: 16px; font-weight: 700; color: #15151E;">
                    {race_id}
                </div>
            </div>
            
            <div style="
                background-color: #F9FAFB;
                border: 2px solid #E10600;
                border-radius: 8px;
                padding: 15px;
                text-align: center;
                margin-bottom: 15px;
            ">
                <div style="font-size: 12px; color: #6B7280; margin-bottom: 5px;">
                    🏆 Top Pick
                </div>
                <div style="font-size: 24px; font-weight: 900; color: #E10600;">
                    {top_driver}
                </div>
                <div style="font-size: 20px; font-weight: 700; color: #15151E; margin-top: 5px;">
                    {top_probability * 100:.1f}%
                </div>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-size: 12px; color: #6B7280;">📊 Confidence</div>
                    <div style="font-size: 16px; font-weight: 700; color: #15151E;">
                        {confidence * 100:.1f}%
                    </div>
                </div>
                <div style="font-size: 12px; color: #6B7280;">
                    #F1 #F1Predictor2026
                </div>
            </div>
        </div>
        """
        
        return html
    
    def _generate_markdown_card(self, data: Dict[str, Any], top_driver: str, top_probability: float) -> str:
        """Generate markdown card for sharing."""
        race_id = data.get('race_id', 'Unknown')
        target = data.get('target_id', 'Unknown')
        confidence = data.get('confidence', 0.0)
        
        markdown = f"""
## 🏎️ F1 Predictor 2026

### 📍 {race_id}
### 🎯 {target.upper()} Prediction

**🏆 Top Pick:** **{top_driver}** (`{top_probability * 100:.1f}%`)

**📊 Confidence:** `{confidence * 100:.1f}%`

---
*Generated by F1 Predictor 2026*
#F1 #F1Predictor2026
        """
        
        return markdown.strip()
    
    def generate_multiple_cards(self, predictions_data: Dict[str, Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        """
        Generate share cards for multiple predictions.
        
        Args:
            predictions_data: Dictionary of target IDs to prediction data
        
        Returns:
            Dictionary of share cards by target
        """
        cards = {}
        
        for target_id, data in predictions_data.items():
            cards[target_id] = self.generate_card(data)
        
        return cards
