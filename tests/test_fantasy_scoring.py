"""
Test fantasy scoring functionality.
Tests real F1 Fantasy rules implementation.
"""
import pytest
from engine.fantasy_scoring import fantasy_scoring


class TestFantasyScoring:
    """Test suite for fantasy scoring."""
    
    def test_calculate_driver_points_race(self):
        """Test driver fantasy points calculation for race."""
        points = fantasy_scoring.calculate_driver_fantasy_points(
            driver_code='VER',
            race_position=1,
            qualifying_position=1,
            fastest_lap=True,
            overtakes=5,
            dnf=False,
            is_sprint=False,
        )
        
        # Check that winner gets points
        assert points['position_points'] > 0
        
        # Check that fastest lap bonus is applied
        assert points['fastest_lap_bonus'] == 1
        
        # Check that qualifying bonus is applied
        assert points['qualifying_bonus'] > 0
        
        # Check that overtake bonus is applied
        assert points['overtake_bonus'] == 10  # 5 overtakes * 2 points
    
    def test_calculate_driver_points_sprint(self):
        """Test driver fantasy points calculation for sprint."""
        points = fantasy_scoring.calculate_driver_fantasy_points(
            driver_code='VER',
            race_position=1,
            is_sprint=True,
        )
        
        # Check that sprint points are used
        assert points['position_points'] == 8  # Sprint winner gets 8 points
    
    def test_dnf_penalty(self):
        """Test DNF penalty application."""
        points = fantasy_scoring.calculate_driver_fantasy_points(
            driver_code='VER',
            race_position=99,  # DNF
            dnf=True,
        )
        
        # Check that DNF penalty is applied
        assert points['dnf_penalty'] == -5
        
        # Check that no position points for DNF
        assert points['position_points'] == 0
    
    def test_calculate_team_points(self):
        """Test team fantasy points calculation."""
        race_results = {
            'VER': {
                'race_position': 1,
                'qualifying_position': 1,
                'fastest_lap': True,
                'overtakes': 3,
                'dnf': False,
            },
            'PER': {
                'race_position': 10,
                'qualifying_position': 8,
                'fastest_lap': False,
                'overtakes': 1,
                'dnf': False,
            },
        }
        
        team_points = fantasy_scoring.calculate_team_fantasy_points('redbull', race_results)
        
        # Check that team points are calculated
        assert team_points['total_points'] > 0
        
        # Check that both drivers are included
        assert 'VER' in team_points['driver_breakdowns']
        assert 'PER' in team_points['driver_breakdowns']
    
    def test_expected_fantasy_points(self):
        """Test expected fantasy points calculation."""
        expected = fantasy_scoring.calculate_expected_fantasy_points(
            driver_code='VER',
            predicted_position=1.5,
            grid_position=2,
        )
        
        # Check that expected points are calculated
        assert expected['expected_points'] >= 0
        
        # Check that confidence interval is provided
        assert 'lower_bound' in expected
        assert 'upper_bound' in expected
        assert expected['lower_bound'] <= expected['expected_points']
        assert expected['upper_bound'] >= expected['expected_points']
    
    def test_fantasy_league_score(self):
        """Test fantasy league score calculation."""
        user_picks = {
            'driver_1': 'VER',
            'driver_2': 'HAM',
            'driver_3': 'NOR',
        }
        
        race_results = {
            'VER': {
                'race_position': 1,
                'qualifying_position': 1,
                'fastest_lap': True,
                'overtakes': 5,
                'dnf': False,
            },
            'HAM': {
                'race_position': 2,
                'qualifying_position': 3,
                'fastest_lap': False,
                'overtakes': 2,
                'dnf': False,
            },
            'NOR': {
                'race_position': 3,
                'qualifying_position': 5,
                'fastest_lap': False,
                'overtakes': 1,
                'dnf': False,
            },
        }
        
        score = fantasy_scoring.calculate_fantasy_league_score(user_picks, race_results)
        
        # Check that total score is calculated
        assert score['total_score'] > 0
        
        # Check that all picks are scored
        assert len(score['slot_scores']) == 3
    
    def test_driver_fantasy_rankings(self):
        """Test driver fantasy rankings."""
        season_points = {
            'VER': 150,
            'HAM': 140,
            'NOR': 130,
        }
        
        rankings = fantasy_scoring.get_driver_fantasy_rankings(season_points)
        
        # Check that rankings are returned
        assert len(rankings) == 3
        
        # Check that rankings are sorted by points
        assert rankings[0]['fantasy_points'] >= rankings[1]['fantasy_points']
        assert rankings[1]['fantasy_points'] >= rankings[2]['fantasy_points']
        
        # Check that positions are assigned correctly
        assert rankings[0]['position'] == 1
        assert rankings[1]['position'] == 2
        assert rankings[2]['position'] == 3
