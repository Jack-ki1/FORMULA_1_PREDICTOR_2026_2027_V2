"""
Test grid model functionality.
Tests grid position model with real qualifying fallback and manual override.
"""
import pytest
from engine.grid_model import grid_model
from config.team_driver_lineup_2026 import get_all_drivers


class TestGridModel:
    """Test suite for grid model."""
    
    def test_simulated_qualifying(self):
        """Test simulated qualifying session."""
        grid = grid_model._simulate_qualifying()
        
        # Check that all 22 drivers have positions
        assert len(grid) == 22
        
        # Check that positions are 1-22
        positions = list(grid.values())
        assert set(positions) == set(range(1, 23))
    
    def test_manual_override(self):
        """Test manual grid position override."""
        grid_model.set_manual_override('VER', 5)
        grid_model.set_manual_override('HAM', 3)
        
        grid = grid_model.get_grid_positions(2026, 1, use_real_qualifying=False)
        
        # Check that manual overrides are applied
        assert grid['grid']['VER'] == 5
        assert grid['grid']['HAM'] == 3
    
    def test_clear_manual_overrides(self):
        """Test clearing manual overrides."""
        grid_model.set_manual_override('VER', 5)
        grid_model.clear_manual_overrides()
        
        # Check that overrides are cleared
        assert len(grid_model.manual_overrides) == 0
    
    def test_grid_multiplier(self):
        """Test grid position multiplier."""
        # Pole position should have multiplier > 1
        pole_multiplier = grid_model.get_grid_multiplier(1)
        assert pole_multiplier == 1.0
        
        # Last position should have lower multiplier
        last_multiplier = grid_model.get_grid_multiplier(22)
        assert last_multiplier < pole_multiplier
        
        # Multiplier should decrease as position worsens
        mult_10 = grid_model.get_grid_multiplier(10)
        mult_20 = grid_model.get_grid_multiplier(20)
        assert mult_10 > mult_20
    
    def test_resolve_position_conflicts(self):
        """Test resolving position conflicts after penalties."""
        grid_positions = {
            'VER': 1,
            'HAM': 1,  # Conflict
            'NOR': 3,
        }
        
        resolved = grid_model._resolve_position_conflicts(grid_positions)
        
        # Check that conflicts are resolved
        assert len(set(resolved.values())) == len(resolved)
        
        # Check that all positions are unique
        assert len(resolved) == len(set(resolved.values()))
    
    def test_apply_grid_penalties(self):
        """Test applying grid penalties."""
        grid_positions = {
            'VER': 1,
            'HAM': 2,
            'NOR': 3,
        }
        
        penalties = {
            'VER': 5,  # 5-place penalty
        'HAM': 0,
        'NOR': 0,
        }
        
        result = grid_model.apply_grid_penalties(grid_positions, penalties)
        
        # Check that VER gets penalized
        assert result['VER'] > grid_positions['VER']
        
        # Check that HAM and NOR stay the same
        assert result['HAM'] == grid_positions['HAM']
        assert result['NOR'] == grid_positions['NOR']
