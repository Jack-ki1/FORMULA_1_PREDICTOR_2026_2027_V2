"""
Test probability model functionality.
Tests probability shaping, DNF risk adjustment, and confidence scoring.
"""
import pytest
import numpy as np
from engine.probability_model import probability_model
from config.constants import TARGETS


class TestProbabilityModel:
    """Test suite for probability model."""
    
    def test_shape_probabilities_basic(self):
        """Test basic probability shaping."""
        raw_scores = {
            'VER': 0.8,
            'HAM': 0.7,
            'NOR': 0.6,
            'LEC': 0.5,
        }
        
        result = probability_model.shape_probabilities(
            raw_scores,
            'podium',
            chaos_level=50,
        )
        
        # Check that probabilities are returned
        assert isinstance(result, dict)
        assert len(result) == len(raw_scores)
        
        # Check that probabilities sum to target sum (3 for podium)
        total = sum(result.values())
        assert abs(total - 3.0) < 0.1  # Allow small floating point error
    
    def test_shape_probabilities_with_chaos(self):
        """Test probability shaping with different chaos levels."""
        raw_scores = {
            'VER': 0.8,
            'HAM': 0.7,
            'NOR': 0.6,
        }
        
        # Low chaos should concentrate probabilities
        low_chaos = probability_model.shape_probabilities(
            raw_scores,
            'winner',
            chaos_level=0,
        )
        
        # High chaos should flatten probabilities
        high_chaos = probability_model.shape_probabilities(
            raw_scores,
            'winner',
            chaos_level=100,
        )
        
        # Low chaos should have higher max probability
        max_low = max(low_chaos.values())
        max_high = max(high_chaos.values())
        
        assert max_low > max_high
    
    def test_apply_dnf_risk(self):
        """Test DNF risk adjustment."""
        probabilities = {
            'VER': 0.4,
            'HAM': 0.3,
            'NOR': 0.2,
            'LEC': 0.1,
        }
        
        reliability_scores = {
            'VER': 90,
            'HAM': 85,
            'NOR': 80,
            'LEC': 75,
        }
        
        result = probability_model.apply_dnf_risk(
            probabilities,
            reliability_scores,
            reliability_influence=50,
            weather='dry',
        )
        
        # Check that probabilities are still returned
        assert isinstance(result, dict)
        assert len(result) == len(probabilities)
        
        # Check that probabilities are still normalized
        total = sum(result.values())
        assert abs(total - 1.0) < 0.1
    
    def test_apply_grid_weight(self):
        """Test grid weight application."""
        probabilities = {
            'VER': 0.3,
            'HAM': 0.25,
            'NOR': 0.2,
            'LEC': 0.15,
            'PIA': 0.1,
        }
        
        grid_positions = {
            'VER': 1,
            'HAM': 2,
            'NOR': 5,
            'LEC': 10,
            'PIA': 15,
        }
        
        result = probability_model.apply_grid_weight(
            probabilities,
            grid_positions,
            grid_weight=50,
        )
        
        # Check that pole position (VER) gets boosted
        assert result['VER'] > probabilities['VER']
        
        # Check normalization
        total = sum(result.values())
        assert abs(total - 1.0) < 0.1
    
    def test_get_confidence_score(self):
        """Test confidence score calculation."""
        # High concentration = high confidence
        concentrated = {
            'VER': 0.7,
            'HAM': 0.2,
            'NOR': 0.1,
        }
        
        # Low concentration = low confidence
        distributed = {
            'VER': 0.25,
            'HAM': 0.25,
            'NOR': 0.25,
            'LEC': 0.25,
        }
        
        confidence_high = probability_model.get_confidence_score(concentrated, 'podium')
        confidence_low = probability_model.get_confidence_score(distributed, 'podium')
        
        assert confidence_high > confidence_low
        assert 0 <= confidence_high <= 1
        assert 0 <= confidence_low <= 1
    
    def test_invalid_target(self):
        """Test handling of invalid target."""
        raw_scores = {'VER': 0.8, 'HAM': 0.7}
        
        with pytest.raises(ValueError):
            probability_model.shape_probabilities(raw_scores, 'invalid_target')
