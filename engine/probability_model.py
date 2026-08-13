"""
Probability model - session/target-aware probability shaping.
Applies chaos level, target exponent, and calibration to raw model outputs.
"""
import numpy as np
from typing import Dict, List, Any, Optional
from config.constants import TARGETS
from config.feature_weights import feature_weights


class ProbabilityModel:
    """
    Shapes raw model outputs into calibrated probabilities.
    Handles chaos level, target-specific exponents, and probability calibration.
    """
    
    def __init__(self):
        self.targets = TARGETS
        self.calibration_params = {}
    
    def shape_probabilities(
        self,
        raw_scores: Dict[str, float],
        target_id: str,
        chaos_level: float = 50,
        feature_weights: Optional[Dict[str, float]] = None,
    ) -> Dict[str, float]:
        """
        Shape raw scores into calibrated probabilities.
        
        Args:
            raw_scores: Dictionary of driver codes to raw scores
            target_id: Target identifier (winner, podium, points, q3)
            chaos_level: Chaos level (0-100) for uncertainty
            feature_weights: Feature weight overrides
        
        Returns:
            Dictionary of driver codes to calibrated probabilities
        """
        target = self.targets.get(target_id.lower())
        if not target:
            raise ValueError(f"Unknown target: {target_id}")
        
        weights = feature_weights or feature_weights.get_defaults()
        chaos_factor = feature_weights.get_chaos_factor(chaos_level)
        
        # Apply target-specific exponent with chaos adjustment
        eff_exp = target['exp'] * chaos_factor
        
        # Apply exponent transformation to scores
        shaped_scores = {}
        for driver_code, score in raw_scores.items():
            shaped_scores[driver_code] = np.power(max(0.01, score), eff_exp)
        
        # Normalize to sum to target sum (e.g., 1 for winner, 3 for podium)
        total_score = sum(shaped_scores.values())
        if total_score == 0:
            # Equal probabilities if all scores are zero
            num_drivers = len(raw_scores)
            equal_prob = target['sum'] / num_drivers
            return {code: equal_prob for code in raw_scores.keys()}
        
        probabilities = {}
        for driver_code, shaped_score in shaped_scores.items():
            raw_prob = (shaped_score / total_score) * target['sum']
            # Cap probability at reasonable maximum (0.97 for single target)
            probabilities[driver_code] = min(0.97, raw_prob)
        
        return probabilities
    
    def apply_dnf_risk(
        self,
        probabilities: Dict[str, float],
        reliability_scores: Dict[str, float],
        reliability_influence: float = 50,
        weather: str = 'dry',
    ) -> Dict[str, float]:
        """
        Adjust probabilities based on DNF risk.
        
        Args:
            probabilities: Base probabilities
            reliability_scores: Driver reliability scores (0-100)
            reliability_influence: How much to weight reliability (0-100)
            weather: Weather condition
        
        Returns:
            Adjusted probabilities
        """
        influence_factor = reliability_influence / 50.0  # 50 = baseline
        
        adjusted = {}
        for driver_code, prob in probabilities.items():
            reliability = reliability_scores.get(driver_code, 50)
            
            # Calculate DNF risk
            risk_score = (100 - reliability) * influence_factor
            if weather == 'wet':
                risk_score += 6  # Additional risk in wet conditions
            elif weather == 'mixed':
                risk_score += 3
            
            # Adjust probability based on DNF risk
            dnf_factor = 1.0 - (risk_score / 200.0)  # Max 50% reduction
            adjusted[driver_code] = prob * dnf_factor
        
        # Renormalize
        total = sum(adjusted.values())
        if total > 0:
            adjusted = {k: v / total for k, v in adjusted.items()}
        
        return adjusted
    
    def apply_grid_weight(
        self,
        probabilities: Dict[str, float],
        grid_positions: Dict[str, int],
        grid_weight: float = 55,
    ) -> Dict[str, float]:
        """
        Adjust probabilities based on grid position using empirical multiplier.
        
        Args:
            probabilities: Base probabilities
            grid_positions: Driver grid positions
            grid_weight: Weight for grid influence (0-100)
        
        Returns:
            Adjusted probabilities
        """
        from config.constants import grid_prior_multiplier
        
        weight_factor = grid_weight / 100.0
        adjusted = {}
        
        for driver_code, prob in probabilities.items():
            grid_pos = grid_positions.get(driver_code)
            if grid_pos:
                mult = grid_prior_multiplier(grid_pos)
                grid_factor = 1.0 + (mult - 1.0) * weight_factor
                adjusted[driver_code] = prob * max(0.1, grid_factor)
            else:
                adjusted[driver_code] = prob
        
        # Renormalize
        total = sum(adjusted.values())
        if total > 0:
            adjusted = {k: v / total for k, v in adjusted.items()}
        
        return adjusted
    
    def calibrate_probabilities(
        self,
        probabilities: Dict[str, float],
        target_id: str,
        calibration_params: Optional[Dict[str, float]] = None,
    ) -> Dict[str, float]:
        """
        Apply calibration to probabilities using historical accuracy data.
        
        Args:
            probabilities: Base probabilities
            target_id: Target identifier
            calibration_params: Calibration parameters for target
        
        Returns:
            Calibrated probabilities
        """
        params = calibration_params or self.calibration_params.get(target_id, {})
        
        if not params:
            # No calibration parameters, return as-is
            return probabilities
        
        # Apply isotonic-like calibration
        # Simple version: scale based on historical accuracy
        target = self.targets.get(target_id.lower())
        if target:
            model_accuracy = target['accuracy']
            baseline_accuracy = target.get('baseline_accuracy', 0.1)
            
            # Calibration factor based on model vs baseline performance
            calib_factor = model_accuracy / max(baseline_accuracy, 0.01)
            
            calibrated = {}
            for driver_code, prob in probabilities.items():
                # Apply calibration with some smoothing
                calibrated[driver_code] = prob * calib_factor
            
            # Renormalize
            total = sum(calibrated.values())
            if total > 0:
                calibrated = {k: v / total for k, v in calibrated.items()}
            
            return calibrated
        
        return probabilities
    
    def get_confidence_score(
        self,
        probabilities: Dict[str, float],
        target_id: str,
    ) -> float:
        """
        Calculate confidence score for predictions.
        Higher confidence when probability is concentrated in few drivers.
        
        Args:
            probabilities: Driver probabilities
            target_id: Target identifier
        
        Returns:
            Confidence score (0-1)
        """
        target = self.targets.get(target_id.lower())
        if not target:
            return 0.5
        
        # Calculate entropy-based confidence
        probs = list(probabilities.values())
        probs = [p for p in probs if p > 0]  # Filter zero probabilities
        
        if not probs:
            return 0.0
        
        # Normalize probabilities
        total = sum(probs)
        if total == 0:
            return 0.0
        probs = [p / total for p in probs]
        
        # Calculate entropy
        entropy = -sum(p * np.log2(p) if p > 0 else 0 for p in probs)
        
        # Maximum entropy for uniform distribution
        max_entropy = np.log2(len(probs))
        
        # Confidence = 1 - (entropy / max_entropy)
        confidence = 1.0 - (entropy / max_entropy) if max_entropy > 0 else 0.0
        
        return confidence
    
    def generate_prediction_summary(
        self,
        probabilities: Dict[str, float],
        target_id: str,
        confidence: float,
        source: str = 'model',
    ) -> Dict[str, Any]:
        """
        Generate a comprehensive prediction summary.
        
        Args:
            probabilities: Driver probabilities
            target_id: Target identifier
            confidence: Confidence score
            source: Data source label
        
        Returns:
            Prediction summary dictionary
        """
        # Sort drivers by probability
        sorted_drivers = sorted(probabilities.items(), key=lambda x: x[1], reverse=True)
        
        target = self.targets.get(target_id.lower())
        
        return {
            'target_id': target_id,
            'target_label': target['label'] if target else target_id,
            'predictions': [
                {
                    'driver_code': code,
                    'probability': prob,
                    'percentage': prob * 100,
                }
                for code, prob in sorted_drivers
            ],
            'confidence': confidence,
            'source': source,
            'top_prediction': sorted_drivers[0] if sorted_drivers else None,
            'target_info': target,
        }


# Global probability model instance
probability_model = ProbabilityModel()
