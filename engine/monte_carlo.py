"""
Monte Carlo race simulator - full-race simulation with DNF risk, safety cars, and strategy variance.
Runs thousands of simulations to generate defensible confidence scores.
"""
import numpy as np
from typing import Dict, List, Any, Optional
from config.team_driver_lineup_2026 import get_all_drivers
from config.constants import grid_prior_multiplier
import random


class MonteCarloSimulator:
    """
    Monte Carlo race simulator for confidence estimation.
    Simulates thousands of race scenarios to estimate outcome probabilities.
    """
    
    def __init__(self, num_simulations: int = 1000):
        self.num_simulations = num_simulations
        self.drivers = get_all_drivers()
        self.driver_map = {d['code']: d for d in self.drivers}
    
    def simulate_race(
        self,
        race_id: str,
        grid_positions: Dict[str, int],
        weather: str = 'dry',
        safety_car_prob: float = 0.3,
        chaos_level: float = 50,
    ) -> Dict[str, Any]:
        """
        Run Monte Carlo simulation of a race.
        
        Args:
            race_id: Race identifier
            grid_positions: Starting grid positions
            weather: Weather condition
            safety_car_prob: Probability of safety car
            chaos_level: Chaos level (0-100)
        
        Returns:
            Simulation results with confidence scores
        """
        simulation_results = []
        
        for _ in range(self.num_simulations):
            result = self._simulate_single_race(
                grid_positions,
                weather,
                safety_car_prob,
                chaos_level,
            )
            simulation_results.append(result)
        
        # Aggregate results
        aggregated = self._aggregate_simulations(simulation_results)
        
        return {
            'race_id': race_id,
            'num_simulations': self.num_simulations,
            'weather': weather,
            'safety_car_prob': safety_car_prob,
            'chaos_level': chaos_level,
            'results': aggregated,
        }
    
    def _simulate_single_race(
        self,
        grid_positions: Dict[str, int],
        weather: str,
        safety_car_prob: float,
        chaos_level: float,
    ) -> Dict[str, int]:
        """
        Simulate a single race instance.
        
        Args:
            grid_positions: Starting grid positions
            weather: Weather condition
            safety_car_prob: Safety car probability
            chaos_level: Chaos level
        
        Returns:
            Dictionary of driver codes to finishing positions
        """
        # Initialize race state
        positions = grid_positions.copy()
        drivers = list(positions.keys())
        
        # Apply chaos factor to lap-by-lap variance
        chaos_factor = chaos_level / 100.0
        
        # Simulate race lap by lap (simplified)
        for lap in range(1, 60):  # Assume 60 laps
            # Random overtakes based on relative strength
            self._simulate_overtakes(positions, weather, chaos_factor)
            
            # Random DNFs based on reliability
            self._simulate_dnfs(positions, weather)
            
            # Safety car events
            if random.random() < safety_car_prob / 60:
                self._simulate_safety_car(positions)
        
        return positions
    
    def _simulate_overtakes(
        self,
        positions: Dict[str, int],
        weather: str,
        chaos_factor: float,
    ):
        """Simulate overtakes during the race."""
        drivers = list(positions.keys())
        
        for i in range(len(drivers)):
            for j in range(i + 1, len(drivers)):
                driver_a = drivers[i]
                driver_b = drivers[j]
                
                if positions[driver_a] > positions[driver_b]:  # A is behind B
                    # Calculate overtake probability
                    driver_a_data = self.driver_map.get(driver_a)
                    driver_b_data = self.driver_map.get(driver_b)
                    
                    if driver_a_data and driver_b_data:
                        strength_diff = driver_a_data['strength'] - driver_b_data['strength']
                        
                        # Wet weather adjustment
                        if weather == 'wet':
                            wet_diff = driver_a_data['wet_skill'] - driver_b_data['wet_skill']
                            strength_diff = strength_diff * 0.5 + wet_diff * 0.5
                        
                        # Base overtake probability
                        overtake_prob = 0.02 + (strength_diff / 100.0) * 0.03
                        
                        # Chaos adjustment
                        overtake_prob += chaos_factor * 0.02
                        
                        # Perform overtake
                        if random.random() < overtake_prob:
                            positions[driver_a] -= 1
                            positions[driver_b] += 1
    
    def _simulate_dnfs(self, positions: Dict[str, int], weather: str):
        """Simulate DNFs during the race."""
        for driver_code in list(positions.keys()):
            driver = self.driver_map.get(driver_code)
            if not driver:
                continue
            
            # Base DNF probability
            dnf_prob = (100 - driver['reliability']) / 5000.0  # ~0-0.016 per lap
            
            # Weather adjustment
            if weather == 'wet':
                dnf_prob *= 1.5
            elif weather == 'mixed':
                dnf_prob *= 1.2
            
            # Check for DNF
            if random.random() < dnf_prob:
                # Mark as DNF (position = 99)
                positions[driver_code] = 99
    
    def _simulate_safety_car(self, positions: Dict[str, int]):
        """Simulate safety car period."""
        # Safety car bunches the field
        active_drivers = {k: v for k, v in positions.items() if v < 99}
        if not active_drivers:
            return
        
        # Sort by position
        sorted_drivers = sorted(active_drivers.items(), key=lambda x: x[1])
        
        # Bunch positions slightly
        for i, (driver_code, pos) in enumerate(sorted_drivers):
            # Add some randomness to safety car restart
            if random.random() < 0.1:
                new_pos = max(1, pos + random.choice([-1, 1]))
                positions[driver_code] = new_pos
    
    def _aggregate_simulations(
        self,
        simulation_results: List[Dict[str, int]],
    ) -> Dict[str, Any]:
        """Aggregate results from multiple simulations."""
        # Count wins, podiums, points finishes for each driver
        win_counts = {}
        podium_counts = {}
        points_counts = {}
        position_sums = {}
        
        for result in simulation_results:
            for driver_code, position in result.items():
                if position == 99:  # DNF
                    continue
                
                if driver_code not in win_counts:
                    win_counts[driver_code] = 0
                    podium_counts[driver_code] = 0
                    points_counts[driver_code] = 0
                    position_sums[driver_code] = 0
                
                if position == 1:
                    win_counts[driver_code] += 1
                if position <= 3:
                    podium_counts[driver_code] += 1
                if position <= 10:
                    points_counts[driver_code] += 1
                
                position_sums[driver_code] += position
        
        # Calculate probabilities
        num_valid_sims = len([r for r in simulation_results if any(p < 99 for p in r.values())])
        
        probabilities = {}
        for driver_code in self.driver_map.keys():
            if driver_code in win_counts:
                probabilities[driver_code] = {
                    'win_prob': win_counts[driver_code] / num_valid_sims,
                    'podium_prob': podium_counts[driver_code] / num_valid_sims,
                    'points_prob': points_counts[driver_code] / num_valid_sims,
                    'avg_position': position_sums[driver_code] / win_counts.get(driver_code, 1),
                }
            else:
                probabilities[driver_code] = {
                    'win_prob': 0.0,
                    'podium_prob': 0.0,
                    'points_prob': 0.0,
                    'avg_position': 22.0,
                }
        
        # Calculate confidence score
        confidence = self._calculate_confidence(probabilities)
        
        return {
            'probabilities': probabilities,
            'confidence': confidence,
            'num_valid_simulations': num_valid_sims,
        }
    
    def _calculate_confidence(self, probabilities: Dict[str, Dict[str, float]]) -> float:
        """Calculate confidence score based on probability distribution."""
        win_probs = [p['win_prob'] for p in probabilities.values()]
        
        if not win_probs:
            return 0.0
        
        # Calculate entropy
        max_prob = max(win_probs)
        entropy = -sum(p * np.log2(p) if p > 0 else 0 for p in win_probs)
        max_entropy = np.log2(len(win_probs))
        
        # Confidence based on max probability and entropy
        confidence = (max_prob + (1 - entropy / max_entropy)) / 2
        
        return confidence
    
    def get_confidence_intervals(
        self,
        race_id: str,
        grid_positions: Dict[str, int],
        confidence_level: float = 0.95,
    ) -> Dict[str, Dict[str, float]]:
        """
        Get confidence intervals for finishing positions.
        
        Args:
            race_id: Race identifier
            grid_positions: Starting grid positions
            confidence_level: Confidence level (0-1)
        
        Returns:
            Dictionary of driver codes to confidence intervals
        """
        # Run simulations
        results = self.simulate_race(race_id, grid_positions)
        
        # Calculate confidence intervals for each driver
        intervals = {}
        for driver_code in self.driver_map.keys():
            driver_probs = results['results']['probabilities'].get(driver_code, {})
            
            # Simple confidence interval based on win probability
            win_prob = driver_probs.get('win_prob', 0.0)
            avg_pos = driver_probs.get('avg_position', 12.0)
            
            # Margin of error (simplified)
            margin = 1.96 * np.sqrt(win_prob * (1 - win_prob) / self.num_simulations)
            
            intervals[driver_code] = {
                'win_prob_lower': max(0, win_prob - margin),
                'win_prob_upper': min(1, win_prob + margin),
                'avg_position_lower': max(1, avg_pos - 2),
                'avg_position_upper': min(22, avg_pos + 2),
            }
        
        return intervals


# Global Monte Carlo simulator instance
monte_carlo = MonteCarloSimulator()
