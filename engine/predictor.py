"""
Main predictor orchestrator - coordinates features, models, and probability shaping.
This is the main entry point for generating predictions.
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional
from engine.feature_engineering import feature_engineer
from engine.ml_models import model_zoo
from engine.probability_model import probability_model
from config.team_driver_lineup_2026 import get_all_drivers, get_driver_by_code
from config.constants import TARGETS, is_valid_target
from config.feature_weights import feature_weights


class Predictor:
    """
    Main prediction orchestrator.
    Coordinates feature engineering, model inference, and probability shaping.
    """
    
    def __init__(self):
        self.feature_engineer = feature_engineer
        self.model_zoo = model_zoo
        self.probability_model = probability_model
        self.drivers = get_all_drivers()
        
        # Load trained models if available
        try:
            self.model_zoo.load_models()
        except Exception as e:
            print(f"Could not load trained models: {e}")
    
    def predict(
        self,
        race_id: str,
        target_id: str,
        session_type: str = 'race',
        weather: str = 'dry',
        grid_positions: Optional[Dict[str, int]] = None,
        feature_weights: Optional[Dict[str, float]] = None,
        use_ensemble: bool = True,
    ) -> Dict[str, Any]:
        """
        Generate predictions for a specific target.
        
        Args:
            race_id: Race identifier
            target_id: Target identifier (winner, podium, points, q3)
            session_type: Session type (race, qualifying, practice)
            weather: Weather condition (dry, mixed, wet)
            grid_positions: Dictionary of driver codes to grid positions
            feature_weights: Feature weight overrides
            use_ensemble: Whether to use ensemble of models
        
        Returns:
            Comprehensive prediction results
        """
        # Validate inputs
        if not is_valid_target(target_id):
            return self._error_response(f"Invalid target: {target_id}")
        
        target = TARGETS[target_id.lower()]
        
        # Use default weights if not provided
        weights = feature_weights or feature_weights.get_defaults()
        
        # Build features for all drivers
        features_dict = self.feature_engineer.build_session_features(
            race_id,
            weather,
            session_type,
            grid_positions,
            weights,
        )
        
        # Convert to DataFrame for ML models
        features_df = self.feature_engineer.features_to_dataframe(features_dict)
        
        # Get raw scores from ML models
        raw_scores = self._get_raw_scores(features_df, use_ensemble)
        
        # Shape probabilities
        chaos_level = weights.get('chaos_level', 50)
        probabilities = self.probability_model.shape_probabilities(
            raw_scores,
            target_id,
            chaos_level,
            weights,
        )
        
        # Apply DNF risk adjustment
        reliability_scores = {d['code']: d['reliability'] for d in self.drivers}
        reliability_influence = weights.get('reliability_influence', 50)
        probabilities = self.probability_model.apply_dnf_risk(
            probabilities,
            reliability_scores,
            reliability_influence,
            weather,
        )
        
        # Apply grid weight for race sessions
        if session_type == 'race' and grid_positions:
            grid_weight = weights.get('grid_weight', 55)
            probabilities = self.probability_model.apply_grid_weight(
                probabilities,
                grid_positions,
                grid_weight,
            )
        
        # Calibrate probabilities
        probabilities = self.probability_model.calibrate_probabilities(
            probabilities,
            target_id,
        )
        
        # Calculate confidence score
        confidence = self.probability_model.get_confidence_score(
            probabilities,
            target_id,
        )
        
        # Generate comprehensive summary
        summary = self.probability_model.generate_prediction_summary(
            probabilities,
            target_id,
            confidence,
            source='model',
        )
        
        # Add additional context
        summary['race_id'] = race_id
        summary['session_type'] = session_type
        summary['weather'] = weather
        summary['feature_weights'] = weights
        summary['feature_matrix'] = features_dict
        
        return summary
    
    def predict_multiple_targets(
        self,
        race_id: str,
        session_type: str = 'race',
        weather: str = 'dry',
        grid_positions: Optional[Dict[str, int]] = None,
        feature_weights: Optional[Dict[str, float]] = None,
        targets: Optional[List[str]] = None,
    ) -> Dict[str, Dict[str, Any]]:
        """
        Generate predictions for multiple targets.
        
        Args:
            race_id: Race identifier
            session_type: Session type
            weather: Weather condition
            grid_positions: Grid positions
            feature_weights: Feature weights
            targets: List of target IDs (defaults to all)
        
        Returns:
            Dictionary mapping target IDs to prediction results
        """
        targets = targets or list(TARGETS.keys())
        
        results = {}
        for target_id in targets:
            try:
                # Filter targets by session type
                target = TARGETS[target_id.lower()]
                if target['session'] != session_type:
                    continue
                
                result = self.predict(
                    race_id,
                    target_id,
                    session_type,
                    weather,
                    grid_positions,
                    feature_weights,
                )
                results[target_id] = result
            except Exception as e:
                results[target_id] = self._error_response(str(e))
        
        return results
    
    def predict_session(
        self,
        race_id: str,
        session_type: str = 'race',
        weather: str = 'dry',
        grid_positions: Optional[Dict[str, int]] = None,
        feature_weights: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        """
        Generate predictions for all applicable targets in a session.
        
        Args:
            race_id: Race identifier
            session_type: Session type
            weather: Weather condition
            grid_positions: Grid positions
            feature_weights: Feature weights
        
        Returns:
            Session prediction results
        """
        # Get applicable targets for this session
        applicable_targets = [
            target_id for target_id, target in TARGETS.items()
            if target['session'] == session_type
        ]
        
        predictions = self.predict_multiple_targets(
            race_id,
            session_type,
            weather,
            grid_positions,
            feature_weights,
            applicable_targets,
        )
        
        return {
            'race_id': race_id,
            'session_type': session_type,
            'weather': weather,
            'predictions': predictions,
            'feature_weights': feature_weights or feature_weights.get_defaults(),
        }
    
    def _get_raw_scores(self, features_df: pd.DataFrame, use_ensemble: bool) -> Dict[str, float]:
        """
        Get raw prediction scores from ML models.
        
        Args:
            features_df: Feature DataFrame
            use_ensemble: Whether to use ensemble
        
        Returns:
            Dictionary of driver codes to raw scores
        """
        raw_scores = {}
        
        if use_ensemble and self.model_zoo.active_models:
            # Use ensemble of trained models
            model_predictions = self.model_zoo.predict_all(features_df)
            
            # Average predictions from all models
            ensemble_scores = {}
            for model_name, predictions in model_predictions.items():
                if predictions is not None:
                    for i, driver_code in enumerate(features_df.index):
                        if driver_code not in ensemble_scores:
                            ensemble_scores[driver_code] = []
                        # Use probability of positive class
                        prob = predictions[i][1] if len(predictions[i]) > 1 else predictions[i][0]
                        ensemble_scores[driver_code].append(prob)
            
            # Average ensemble scores
            for driver_code, scores in ensemble_scores.items():
                raw_scores[driver_code] = np.mean(scores)
            
            # If ensemble didn't produce results, fall back to feature-based scoring
            if not raw_scores:
                raw_scores = self._feature_based_scoring(features_df)
        else:
            # Use feature-based scoring
            raw_scores = self._feature_based_scoring(features_df)
        
        return raw_scores
    
    def _feature_based_scoring(self, features_df: pd.DataFrame) -> Dict[str, float]:
        """
        Generate scores based on features when ML models are unavailable.
        
        Args:
            features_df: Feature DataFrame
        
        Returns:
            Dictionary of driver codes to scores
        """
        scores = {}
        
        for driver_code in features_df.index:
            features = features_df.loc[driver_code]
            
            # Simple weighted combination of key features
            score = (
                features['strength'] * 0.4 +
                features['reliability'] * 0.2 +
                features['wet_skill'] * features['weather_wet'] * 0.15 +
                features['strength_x_circuit'] * 0.15 +
                features['grid_multiplier'] * features.get('grid_weight', 0) * 0.1
            )
            
            scores[driver_code] = score
        
        return scores
    
    def _error_response(self, message: str) -> Dict[str, Any]:
        """Generate error response."""
        return {
            'error': message,
            'source': 'error',
            'predictions': [],
            'confidence': 0.0,
        }
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about available models."""
        return {
            'available_models': list(self.model_zoo.models.keys()),
            'active_models': self.model_zoo.active_models,
            'trained_models': [
                name for name, model in self.model_zoo.models.items()
                if model.is_trained
            ],
            'feature_names': self.feature_engineer.get_feature_names(),
        }


# Global predictor instance
predictor = Predictor()
