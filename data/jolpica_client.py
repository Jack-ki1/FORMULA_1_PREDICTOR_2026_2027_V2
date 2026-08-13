"""
Jolpica API client for F1 data.
Provides standings, race results, and qualifying data.
"""
from typing import Optional, Dict, List, Any
from data.api_client import APIClient
from config.api_settings import api_settings
from config.settings import settings


class JolpicaClient(APIClient):
    """Client for Jolpica F1 API."""
    
    def __init__(self):
        if not api_settings.is_enabled('jolpica'):
            raise ValueError("Jolpica API is not enabled in settings")
        super().__init__(api_settings.JOLPICA_BASE_URL)
    
    def get_driver_standings(self, season: int = None) -> Dict[str, Any]:
        """
        Get driver championship standings for a season.
        
        Args:
            season: Season year (defaults to settings.SEASON_YEAR)
        
        Returns:
            Dictionary with standings data and source info
        """
        season = season or settings.SEASON_YEAR
        endpoint = api_settings.get_endpoint('jolpica', 'driver_standings', season=season)
        
        if not endpoint:
            return self._error_response("Driver standings endpoint not configured")
        
        response = self.get(endpoint, cache_ttl=api_settings.CACHE_TTL_LONG)
        
        if response['source'] == 'error':
            return self._fallback_driver_standings(season)
        
        return response
    
    def get_constructor_standings(self, season: int = None) -> Dict[str, Any]:
        """
        Get constructor championship standings for a season.
        
        Args:
            season: Season year (defaults to settings.SEASON_YEAR)
        
        Returns:
            Dictionary with standings data and source info
        """
        season = season or settings.SEASON_YEAR
        endpoint = api_settings.get_endpoint('jolpica', 'constructor_standings', season=season)
        
        if not endpoint:
            return self._error_response("Constructor standings endpoint not configured")
        
        response = self.get(endpoint, cache_ttl=api_settings.CACHE_TTL_LONG)
        
        if response['source'] == 'error':
            return self._fallback_constructor_standings(season)
        
        return response
    
    def get_race_result(self, season: int, round_number: int) -> Dict[str, Any]:
        """
        Get race results for a specific round.
        
        Args:
            season: Season year
            round_number: Round number
        
        Returns:
            Dictionary with race results and source info
        """
        endpoint = api_settings.get_endpoint('jolpica', 'race_result', season=season, round=round_number)
        
        if not endpoint:
            return self._error_response("Race result endpoint not configured")
        
        response = self.get(endpoint, cache_ttl=api_settings.CACHE_TTL_LONG)
        
        if response['source'] == 'error':
            return self._fallback_race_result(season, round_number)
        
        return response
    
    def get_qualifying_result(self, season: int, round_number: int) -> Dict[str, Any]:
        """
        Get qualifying results for a specific round.
        
        Args:
            season: Season year
            round_number: Round number
        
        Returns:
            Dictionary with qualifying results and source info
        """
        endpoint = api_settings.get_endpoint('jolpica', 'qualifying_result', season=season, round=round_number)
        
        if not endpoint:
            return self._error_response("Qualifying result endpoint not configured")
        
        response = self.get(endpoint, cache_ttl=api_settings.CACHE_TTL_LONG)
        
        if response['source'] == 'error':
            return self._fallback_qualifying_result(season, round_number)
        
        return response
    
    def get_race_schedule(self, season: int = None) -> Dict[str, Any]:
        """
        Get complete race schedule for a season.
        
        Args:
            season: Season year (defaults to settings.SEASON_YEAR)
        
        Returns:
            Dictionary with schedule data and source info
        """
        season = season or settings.SEASON_YEAR
        endpoint = api_settings.get_endpoint('jolpica', 'race_schedule', season=season)
        
        if not endpoint:
            return self._error_response("Race schedule endpoint not configured")
        
        response = self.get(endpoint, cache_ttl=api_settings.CACHE_TTL_LONG)
        
        if response['source'] == 'error':
            return self._fallback_race_schedule(season)
        
        return response
    
    def _error_response(self, message: str) -> Dict[str, Any]:
        """Return error response."""
        return {
            'data': None,
            'source': 'error',
            'error': message,
        }
    
    def _fallback_driver_standings(self, season: int) -> Dict[str, Any]:
        """Fallback to simulated data when API fails."""
        # Import here to avoid circular dependency
        from data.season_2026 import get_driver_standings
        
        if season == settings.SEASON_YEAR:
            return {
                'data': get_driver_standings(),
                'source': 'simulated',
                'note': 'Using season snapshot data',
            }
        
        return {
            'data': None,
            'source': 'simulated',
            'note': f'No simulated data available for season {season}',
        }
    
    def _fallback_constructor_standings(self, season: int) -> Dict[str, Any]:
        """Fallback to simulated data when API fails."""
        from data.season_2026 import get_constructor_standings
        
        if season == settings.SEASON_YEAR:
            return {
                'data': get_constructor_standings(),
                'source': 'simulated',
                'note': 'Using season snapshot data',
            }
        
        return {
            'data': None,
            'source': 'simulated',
            'note': f'No simulated data available for season {season}',
        }
    
    def _fallback_race_result(self, season: int, round_number: int) -> Dict[str, Any]:
        """Fallback to simulated data when API fails."""
        from data.season_2026 import get_race_result
        
        if season == settings.SEASON_YEAR:
            result = get_race_result(round_number)
            if result:
                return {
                    'data': result,
                    'source': 'simulated',
                    'note': 'Using season snapshot data',
                }
        
        return {
            'data': None,
            'source': 'simulated',
            'note': f'No simulated data available for season {season} round {round_number}',
        }
    
    def _fallback_qualifying_result(self, season: int, round_number: int) -> Dict[str, Any]:
        """Fallback to simulated data when API fails."""
        # Generate simulated qualifying based on driver strengths
        from config.team_driver_lineup_2026 import get_all_drivers
        
        drivers = get_all_drivers()
        simulated_grid = sorted(
            drivers,
            key=lambda d: d['strength'] + (hash(f"{season}-{round_number}-{d['code']}") % 20),
            reverse=True,
        )
        
        grid_positions = {
            driver['code']: i + 1
            for i, driver in enumerate(simulated_grid)
        }
        
        return {
            'data': {
                'season': season,
                'round': round_number,
                'grid': grid_positions,
            },
            'source': 'simulated',
            'note': 'Simulated qualifying based on driver strengths',
        }
    
    def _fallback_race_schedule(self, season: int) -> Dict[str, Any]:
        """Fallback to simulated data when API fails."""
        if season == settings.SEASON_YEAR:
            from data.calendar_2026 import CALENDAR_2026
            return {
                'data': CALENDAR_2026,
                'source': 'simulated',
                'note': 'Using calendar configuration',
            }
        
        return {
            'data': None,
            'source': 'simulated',
            'note': f'No simulated data available for season {season}',
        }
