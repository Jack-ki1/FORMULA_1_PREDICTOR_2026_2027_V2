"""
Feature engineering module - builds the feature matrix per driver per session.
This transforms raw data into ML-ready features for prediction models.
"""
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional
from config.team_driver_lineup_2026 import get_all_drivers, get_driver_by_code
from config.constants import grid_prior_multiplier
from data.circuit_data import get_circuit_characteristics
from data.calendar_2026 import get_race_by_id


class FeatureEngineer:
    """Engineers features for ML prediction models."""
    
    def __init__(self):
        self.drivers = get_all_drivers()
        self.driver_map = {d['code']: d for d in self.drivers}
    
    def build_driver_features(
        self,
        driver_code: str,
        race_id: str,
        weather: str = 'dry',
        grid_position: Optional[int] = None,
        session_type: str = 'race',
        feature_weights: Optional[Dict[str, float]] = None,
    ) -> Dict[str, float]:
        """
        Build feature vector for a specific driver in a specific session.
        
        Args:
            driver_code: Driver code (e.g., 'VER', 'HAM')
            race_id: Race identifier
            weather: Weather condition ('dry', 'mixed', 'wet')
            grid_position: Starting grid position (for race sessions)
            session_type: Session type ('race', 'qualifying', 'practice')
            feature_weights: Weights for feature scaling
        
        Returns:
            Dictionary of engineered features
        """
        driver = self.driver_map.get(driver_code.upper())
        if not driver:
            return {}
        
        race = get_race_by_id(race_id)
        if not race:
            return {}
        
        circuit = get_circuit_characteristics(race['circuit'].lower().replace(' ', '_'))
        if not circuit:
            circuit = {}
        
        weights = feature_weights or {}
        
        # Base driver attributes
        features = {
            # Driver performance
            'strength': driver['strength'] / 100.0,  # Normalized 0-1
            'reliability': driver['reliability'] / 100.0,
            'wet_skill': driver['wet_skill'] / 100.0,
            
            # Weather adaptation
            'weather_dry': 1.0 if weather == 'dry' else 0.0,
            'weather_mixed': 1.0 if weather == 'mixed' else 0.0,
            'weather_wet': 1.0 if weather == 'wet' else 0.0,
            
            # Circuit characteristics
            'overtaking_difficulty': circuit.get('overtaking_difficulty', 0.5),
            'drs_zones': circuit.get('drs_zones_count', 2) / 4.0,  # Normalized
            'avg_speed': circuit.get('average_speed', 230) / 250.0,  # Normalized
            'corner_count': circuit.get('corner_count', 15) / 20.0,  # Normalized
            
            # Race conditions
            'safety_car_prob': circuit.get('safety_car_probability', 0.3),
            'rain_prob': circuit.get('rain_probability', 0.2),
            'base_temp': circuit.get('base_temperature', 25) / 35.0,  # Normalized
        }
        
        # Session-specific features
        if session_type == 'race':
            features['session_race'] = 1.0
            features['session_qualifying'] = 0.0
            features['session_practice'] = 0.0
            
            # Grid position features
            if grid_position:
                features['grid_position'] = grid_position / 22.0  # Normalized
                features['grid_multiplier'] = grid_prior_multiplier(grid_position)
                features['grid_weight'] = weights.get('grid_weight', 55) / 100.0
            else:
                features['grid_position'] = 0.5  # Mid-field average
                features['grid_multiplier'] = 1.0
                features['grid_weight'] = 0.0
                
        elif session_type == 'qualifying':
            features['session_race'] = 0.0
            features['session_qualifying'] = 1.0
            features['session_practice'] = 0.0
            features['grid_position'] = 0.0
            features['grid_multiplier'] = 1.0
            features['grid_weight'] = 0.0
            
        else:  # practice
            features['session_race'] = 0.0
            features['session_qualifying'] = 0.0
            features['session_practice'] = 1.0
            features['grid_position'] = 0.0
            features['grid_multiplier'] = 1.0
            features['grid_weight'] = 0.0
        
        # Feature interactions
        features['strength_x_circuit'] = features['strength'] * (1.0 - features['overtaking_difficulty'])
        features['wet_skill_x_weather'] = features['wet_skill'] * features['weather_wet']
        features['reliability_x_sc_prob'] = features['reliability'] * (1.0 - features['safety_car_prob'])

        # ── Advanced features (40+ total, leakage-safe — only completed rounds) ──
        # Derived from: recent form, team momentum, circuit history, championship pressure
        # Inspired by MohitUnecha/EveryLap 8-category scheme + apex-pulse checkpoint provenance
        try:
            from data.season_2026 import get_driver_standings
            from data.calendar_2026 import get_completed_races
            standings = {s['driver_code']: s for s in get_driver_standings()} if callable(get_driver_standings) else {}
        except Exception:
            standings = {}
        try:
            completed = len([r for r in get_race_by_id.__self__ if False])  # placeholder
        except Exception:
            completed = 0
        # Use calendar status to count completed rounds (leakage-safe)
        try:
            from data.calendar_2026 import CALENDAR_2026
            completed_rounds = sum(1 for r in CALENDAR_2026 if r.get('status') == 'completed')
            race_round = race.get('round', 1)
            progress = completed_rounds / max(1, len([r for r in CALENDAR_2026 if r.get('status') != 'cancelled']))
            features['season_progress'] = progress
            features['is_early_season'] = 1.0 if race_round <= 5 else 0.0
            features['is_mid_season'] = 1.0 if 6 <= race_round <= 15 else 0.0
            features['is_finale'] = 1.0 if race_round >= 20 else 0.0
        except Exception:
            features['season_progress'] = 0.5
            features['is_early_season'] = 0.0
            features['is_mid_season'] = 1.0
            features['is_finale'] = 0.0

        # Championship pressure (from local standings snapshot if available)
        sd = standings.get(driver_code.upper(), {}) if isinstance(standings, dict) else {}
        features['championship_position'] = (sd.get('position', 11) / 22.0) if sd else 0.5
        features['championship_points_norm'] = min(1.0, sd.get('points', 0) / 250.0) if sd else 0.3
        features['is_championship_leader'] = 1.0 if sd.get('position') == 1 else 0.0
        features['is_championship_contender'] = 1.0 if sd.get('position', 22) <= 3 else 0.0
        # Team momentum proxy: average strength of teammates
        team_id = driver.get('team_id')
        teammates = [d for d in self.drivers if d.get('team_id') == team_id]
        team_avg = sum(t.get('strength', 50) for t in teammates) / max(1, len(teammates)) / 100.0
        features['team_avg_strength'] = team_avg
        features['team_strength_vs_driver'] = team_avg - features['strength']
        features['is_top_team'] = 1.0 if team_avg >= 0.80 else 0.0
        # Grid-derived features (2026: 22 cars, active aero replaces DRS)
        if grid_position:
            features['is_front_row'] = 1.0 if grid_position <= 2 else 0.0
            features['is_top5_grid'] = 1.0 if grid_position <= 5 else 0.0
            features['is_back_row'] = 1.0 if grid_position >= 21 else 0.0
            features['grid_penalty_risk'] = 1.0 if grid_position >= 15 else 0.0
            # Track-dependent overtake factor: high-overtaking circuits de-weight grid (Monza) vs Monaco
            overtake_factor = {'Low': 0.85, 'Medium': 0.55, 'High': 0.30}.get(race.get('overtaking', 'Medium'), 0.55)
            features['grid_x_overtake'] = features['grid_multiplier'] * (1 - overtake_factor)
            features['expected_overtakes'] = (1 - features['overtaking_difficulty']) * (22 - grid_position) / 11.0
        else:
            features['is_front_row'] = 0.0
            features['is_top5_grid'] = 0.0
            features['is_back_row'] = 0.0
            features['grid_penalty_risk'] = 0.0
            features['grid_x_overtake'] = 0.0
            features['expected_overtakes'] = 0.0
        # Tyre / strategy / temperature
        features['temp_optimal'] = 1.0 - abs(features['base_temp'] - 0.71)  # 25C optimal ~0.71 norm
        features['tyre_stress'] = circuit.get('tyre_stress', 0.5) if isinstance(circuit.get('tyre_stress'), float) else 0.5
        features['is_sprint_weekend'] = 1.0 if race.get('sprint') else 0.0
        features['laps_norm'] = race.get('laps', 58) / 78.0
        features['track_length_norm'] = race.get('length_km', 5.0) / 7.0
        features['is_street_circuit'] = 1.0 if circuit.get('overtaking_difficulty', 0.5) > 0.7 and race.get('drs_zones', 2) <= 1 else 0.0
        # Consistency / risk
        features['consistency_proxy'] = (features['reliability'] * 0.6 + features['strength'] * 0.4)
        features['risk_score'] = (1 - features['reliability']) * 0.7 + features['safety_car_prob'] * 0.3
        features['wet_risk'] = features['wet_skill'] * features['weather_wet'] + features['rain_prob'] * 0.5
        # Momentum vs field
        field_avg_strength = sum(d.get('strength', 50) for d in self.drivers) / len(self.drivers) / 100.0
        features['strength_vs_field'] = features['strength'] - field_avg_strength
        features['strength_percentile'] = sum(1 for d in self.drivers if d.get('strength', 50) <= driver.get('strength', 50)) / len(self.drivers)

        # Apply feature weights
        if weights:
            wet_influence = weights.get('wet_influence', 50) / 100.0
            reliability_influence = weights.get('reliability_influence', 50) / 100.0
            # Adjust features based on weights
            features['wet_skill'] = features['wet_skill'] * (0.5 + wet_influence * 0.5)
            features['wet_skill_x_weather'] = features['wet_skill_x_weather'] * wet_influence
            features['wet_risk'] = features['wet_risk'] * wet_influence
            features['reliability'] = features['reliability'] * (0.5 + reliability_influence * 0.5)
            features['reliability_x_sc_prob'] = features['reliability_x_sc_prob'] * reliability_influence
            features['risk_score'] = features['risk_score'] * (0.5 + reliability_influence * 0.5)
            # Chaos flattens strength signals slightly
            chaos = weights.get('chaos_level', 50) / 100.0
            if chaos > 0.6:
                features['strength'] = features['strength'] * (1 - (chaos - 0.6) * 0.3)
                features['strength_vs_field'] = features['strength_vs_field'] * (1 - (chaos - 0.6) * 0.5)

        return features
    
    def build_session_features(
        self,
        race_id: str,
        weather: str = 'dry',
        session_type: str = 'race',
        grid_positions: Optional[Dict[str, int]] = None,
        feature_weights: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Dict[str, float]]:
        """
        Build feature matrix for all drivers in a session.
        
        Args:
            race_id: Race identifier
            weather: Weather condition
            session_type: Session type
            grid_positions: Dictionary of driver codes to grid positions
            feature_weights: Weights for feature scaling
        
        Returns:
            Dictionary mapping driver codes to feature vectors
        """
        all_features = {}
        
        for driver in self.drivers:
            grid_pos = grid_positions.get(driver['code']) if grid_positions else None
            features = self.build_driver_features(
                driver['code'],
                race_id,
                weather,
                grid_pos,
                session_type,
                feature_weights,
            )
            all_features[driver['code']] = features
        
        return all_features
    
    def features_to_dataframe(self, features_dict: Dict[str, Dict[str, float]]) -> pd.DataFrame:
        """
        Convert features dictionary to pandas DataFrame for ML models.
        
        Args:
            features_dict: Dictionary of driver features
        
        Returns:
            DataFrame with drivers as index and features as columns
        """
        return pd.DataFrame.from_dict(features_dict, orient='index')
    
    def get_feature_names(self) -> List[str]:
        """Return list of feature names."""
        # Get a sample feature set to extract names
        sample = self.build_driver_features('VER', 'au', 'dry', 1, 'race')
        return list(sample.keys())
    
    def get_feature_importance_template(self) -> Dict[str, str]:
        """
        Return template for feature importance documentation.
        Maps features to their business meaning (40+ features, 8 categories).
        """
        return {
            # Driver
            'strength': 'Overall driver performance rating',
            'reliability': 'Mechanical reliability score',
            'wet_skill': 'Driver skill in wet conditions',
            'consistency_proxy': 'Consistency proxy (reliability×0.6 + strength×0.4)',
            'risk_score': 'DNF risk (1−reliability × SC prob)',
            # Weather
            'weather_dry': 'Binary: dry conditions',
            'weather_mixed': 'Binary: mixed conditions',
            'weather_wet': 'Binary: wet conditions',
            'wet_risk': 'Wet-risk composite',
            # Circuit
            'overtaking_difficulty': 'Circuit overtaking difficulty',
            'drs_zones': 'Number of DRS / active-aero zones',
            'avg_speed': 'Average circuit speed',
            'corner_count': 'Number of corners',
            'safety_car_prob': 'Probability of safety car',
            'rain_prob': 'Probability of rain',
            'base_temp': 'Base circuit temperature',
            'temp_optimal': 'Temperature optimality (25C peak)',
            'tyre_stress': 'Tyre stress at circuit',
            'is_street_circuit': 'Street circuit flag',
            'track_length_norm': 'Track length normalized',
            'laps_norm': 'Lap count normalized',
            # Grid
            'grid_position': 'Starting grid position',
            'grid_multiplier': 'Historical pole-to-win multiplier',
            'grid_weight': 'Weight given to grid position',
            'is_front_row': 'Front row starter',
            'is_top5_grid': 'Top-5 grid',
            'grid_x_overtake': 'Grid × overtake interaction',
            'expected_overtakes': 'Expected overtakes from grid',
            # Team / championship
            'team_avg_strength': 'Team average strength',
            'is_top_team': 'Top team flag',
            'championship_position': 'Championship position normalized',
            'championship_points_norm': 'Championship points normalized',
            'season_progress': 'Season progress (completed/total)',
            # Interactions
            'strength_x_circuit': 'Driver strength × circuit',
            'wet_skill_x_weather': 'Wet skill × wet weather',
            'reliability_x_sc_prob': 'Reliability × SC prob',
            'strength_vs_field': 'Strength vs field average',
            'strength_percentile': 'Strength percentile in field',
        }


# Global feature engineer instance
feature_engineer = FeatureEngineer()
