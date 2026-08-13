"""
Pit strategy prediction module.
Predicts optimal pit strategies (1-stop vs 2-stop) based on circuit and conditions.
"""
import numpy as np
from typing import Dict, List, Any, Optional
from config.team_driver_lineup_2026 import get_all_drivers
from config.constants import PIRELLI_COMPOUNDS
from data.circuit_data import get_circuit_characteristics


class PitStrategyPredictor:
    """
    Predicts optimal pit strategies for drivers.
    Considers circuit characteristics, weather, and driver style.
    """
    
    def __init__(self):
        self.drivers = get_all_drivers()
        self.driver_map = {d['code']: d for d in self.drivers}
    
    def predict_strategy(
        self,
        driver_code: str,
        race_id: str,
        weather: str = 'dry',
        strategy_aggressiveness: float = 50,
        laps: int = None,
    ) -> Dict[str, Any]:
        """
        Predict optimal pit strategy for a driver.
        
        Args:
            driver_code: Driver code
            race_id: Race identifier
            weather: Weather condition
            strategy_aggressiveness: Aggressiveness level (0-100)
            laps: Number of laps in race
        
        Returns:
            Predicted strategy with compound choices
        """
        driver = self.driver_map.get(driver_code.upper())
        if not driver:
            return self._error_response(f"Driver not found: {driver_code}")
        
        # Get circuit information
        from data.calendar_2026 import get_race_by_id
        race = get_race_by_id(race_id)
        if not race:
            return self._error_response(f"Race not found: {race_id}")
        
        laps = laps or race['laps']
        circuit = get_circuit_characteristics(race['circuit'].lower().replace(' ', '_'))
        
        # Determine strategy type
        two_stop_threshold = 0.65 - (strategy_aggressiveness / 100.0) * 0.4
        two_stop = np.random.random() > two_stop_threshold
        
        # Predict compound choices
        if weather == 'wet':
            strategy = self._wet_strategy(laps, driver)
        elif weather == 'mixed':
            strategy = self._mixed_strategy(laps, driver, two_stop)
        else:
            strategy = self._dry_strategy(laps, driver, two_stop, circuit)
        
        return {
            'driver_code': driver_code,
            'race_id': race_id,
            'weather': weather,
            'strategy_type': '2-stop' if two_stop else '1-stop',
            'strategy_aggressiveness': strategy_aggressiveness,
            'stops': strategy,
            'total_laps': laps,
        }
    
    def _dry_strategy(
        self,
        laps: int,
        driver: Dict,
        two_stop: bool,
        circuit: Dict,
    ) -> List[Dict[str, Any]]:
        """Predict dry weather strategy."""
        strategies = []
        
        # Determine starting compound
        start_compound = self._select_starting_compound(driver, circuit)
        
        if two_stop:
            # 2-stop strategy
            s1_laps = int(laps * (0.28 + np.random.random() * 0.08))
            s2_laps = int(laps * (0.32 + np.random.random() * 0.08))
            s3_laps = laps - s1_laps - s2_laps
            
            strategies.append({'compound': start_compound, 'laps': s1_laps})
            strategies.append({'compound': 'Medium', 'laps': s2_laps})
            strategies.append({'compound': 'Hard', 'laps': s3_laps})
        else:
            # 1-stop strategy
            s1_laps = int(laps * (0.35 + np.random.random() * 0.1))
            s2_laps = laps - s1_laps
            
            strategies.append({'compound': start_compound, 'laps': s1_laps})
            strategies.append({'compound': 'Hard', 'laps': s2_laps})
        
        return strategies
    
    def _wet_strategy(self, laps: int, driver: Dict) -> List[Dict[str, Any]]:
        """Predict wet weather strategy."""
        strategies = []
        
        # Wet strategy: Start on inters or wets
        start_compound = 'Intermediate' if np.random.random() > 0.3 else 'Wet'
        
        # Split strategy
        split_lap = int(laps * (0.45 + np.random.random() * 0.15))
        
        strategies.append({'compound': start_compound, 'laps': split_lap})
        strategies.append({'compound': 'Wet', 'laps': laps - split_lap})
        
        return strategies
    
    def _mixed_strategy(
        self,
        laps: int,
        driver: Dict,
        two_stop: bool,
    ) -> List[Dict[str, Any]]:
        """Predict mixed weather strategy."""
        strategies = []
        
        if two_stop:
            # More flexible for mixed conditions
            s1_laps = int(laps * (0.30 + np.random.random() * 0.10))
            s2_laps = int(laps * (0.30 + np.random.random() * 0.10))
            s3_laps = laps - s1_laps - s2_laps
            
            strategies.append({'compound': 'Intermediate', 'laps': s1_laps})
            strategies.append({'compound': 'Medium', 'laps': s2_laps})
            strategies.append({'compound': 'Hard', 'laps': s3_laps})
        else:
            # Conservative 1-stop
            s1_laps = int(laps * (0.40 + np.random.random() * 0.10))
            s2_laps = laps - s1_laps
            
            strategies.append({'compound': 'Intermediate', 'laps': s1_laps})
            strategies.append({'compound': 'Medium', 'laps': s2_laps})
        
        return strategies
    
    def _select_starting_compound(self, driver: Dict, circuit: Dict) -> str:
        """Select optimal starting compound."""
        # Factor in driver style and circuit characteristics
        overtaking_difficulty = circuit.get('overtaking_difficulty', 0.5)
        
        # High overtaking difficulty = favor softer compounds for position
        if overtaking_difficulty < 0.4:
            return 'Soft'
        elif overtaking_difficulty > 0.7:
            return 'Hard'
        else:
            # Random choice based on driver strength
            if driver['strength'] > 80:
                return 'Soft'
            elif driver['strength'] > 60:
                return 'Medium'
            else:
                return 'Hard'
    
    def predict_team_strategies(
        self,
        race_id: str,
        weather: str = 'dry',
        strategy_aggressiveness: float = 50,
    ) -> Dict[str, Dict[str, Any]]:
        """Predict strategies for all drivers by team."""
        all_strategies = {}
        
        for driver in self.drivers:
            strategy = self.predict_strategy(
                driver['code'],
                race_id,
                weather,
                strategy_aggressiveness,
            )
            all_strategies[driver['code']] = strategy
        
        return all_strategies
    
    def _error_response(self, message: str) -> Dict[str, Any]:
        """Generate error response."""
        return {
            'error': message,
            'strategy_type': 'unknown',
            'stops': [],
        }


# Global pit strategy predictor instance
pit_strategy = PitStrategyPredictor()
