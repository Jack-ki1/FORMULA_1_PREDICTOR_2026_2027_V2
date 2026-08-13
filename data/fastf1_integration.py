"""
FastF1 integration for lap-by-lap telemetry and practice/qualifying data.
This provides detailed telemetry data for advanced analysis.
"""
import fastf1
from typing import Optional, Dict, List, Any
from config.api_settings import api_settings
from config.settings import settings


class FastF1Integration:
    """Integration with FastF1 for detailed telemetry data."""
    
    def __init__(self):
        if not api_settings.is_enabled('fastf1'):
            raise ValueError("FastF1 integration is not enabled in settings")
        
        # Configure FastF1 cache
        if api_settings.FASTF1_CACHE_ENABLED:
            fastf1.Cache.enable_cache(settings.FASTF1_CACHE_PATH)
        else:
            fastf1.Cache.disable_cache()
    
    def get_session(self, year: int, round_number: int, session_type: str) -> Optional[fastf1.core.Session]:
        """
        Get a FastF1 session object.
        
        Args:
            year: Season year
            round_number: Round number
            session_type: Session type ('FP1', 'FP2', 'FP3', 'Q', 'R', 'SQ', 'S')
        
        Returns:
            FastF1 Session object or None if unavailable
        """
        try:
            session = fastf1.get_session(year, round_number, session_type)
            session.load()
            return session
        except Exception as e:
            print(f"FastF1 error loading session: {e}")
            return None
    
    def get_lap_times(self, year: int, round_number: int, session_type: str) -> Dict[str, Any]:
        """
        Get lap times for a session.
        
        Args:
            year: Season year
            round_number: Round number
            session_type: Session type
        
        Returns:
            Dictionary with lap times data and source info
        """
        try:
            session = self.get_session(year, round_number, session_type)
            if not session:
                return self._error_response("Session not available")
            
            lap_data = []
            for driver in session.drivers:
                driver_laps = session.laps[session.laps['DriverNumber'] == driver]
                for _, lap in driver_laps.iterrows():
                    lap_data.append({
                        'driver': driver,
                        'lap_number': lap['LapNumber'],
                        'lap_time': str(lap['LapTime']) if lap['LapTime'] else None,
                        'sector_times': [
                            str(lap['Sector1Time']) if lap['Sector1Time'] else None,
                            str(lap['Sector2Time']) if lap['Sector2Time'] else None,
                            str(lap['Sector3Time']) if lap['Sector3Time'] else None,
                        ],
                        'compound': lap['Compound'],
                        'tyre_life': lap['TyreLife'],
                        'fresh_tyre': lap['FreshTyre'],
                    })
            
            return {
                'data': lap_data,
                'source': 'live',
                'session_info': {
                    'year': year,
                    'round': round_number,
                    'session_type': session_type,
                },
            }
            
        except Exception as e:
            return self._error_response(f"FastF1 error: {str(e)}")
    
    def get_telemetry(self, year: int, round_number: int, session_type: str, driver: str) -> Dict[str, Any]:
        """
        Get detailed telemetry for a specific driver.
        
        Args:
            year: Season year
            round_number: Round number
            session_type: Session type
            driver: Driver identifier
        
        Returns:
            Dictionary with telemetry data and source info
        """
        try:
            session = self.get_session(year, round_number, session_type)
            if not session:
                return self._error_response("Session not available")
            
            driver_laps = session.laps[session.laps['Driver'] == driver]
            if driver_laps.empty:
                return self._error_response(f"No data for driver {driver}")
            
            # Get telemetry for fastest lap
            fastest_lap = driver_laps.loc[driver_laps['LapTime'].idxmin()]
            telemetry = fastest_lap.get_telemetry()
            
            telemetry_data = {
                'driver': driver,
                'lap_number': fastest_lap['LapNumber'],
                'speed': telemetry['Speed'].tolist(),
                'throttle': telemetry['Throttle'].tolist(),
                'brake': telemetry['Brake'].tolist(),
                'gear': telemetry['nGear'].tolist(),
                'rpm': telemetry['RPM'].tolist(),
                'distance': telemetry['Distance'].tolist(),
            }
            
            return {
                'data': telemetry_data,
                'source': 'live',
            }
            
        except Exception as e:
            return self._error_response(f"FastF1 error: {str(e)}")
    
    def get_weather_data(self, year: int, round_number: int, session_type: str) -> Dict[str, Any]:
        """
        Get weather data for a session.
        
        Args:
            year: Season year
            round_number: Round number
            session_type: Session type
        
        Returns:
            Dictionary with weather data and source info
        """
        try:
            session = self.get_session(year, round_number, session_type)
            if not session:
                return self._error_response("Session not available")
            
            weather_data = session.weather_data
            
            weather_list = []
            for _, row in weather_data.iterrows():
                weather_list.append({
                    'time': str(row['Time']),
                    'air_temp': row['AirTemp'],
                    'track_temp': row['TrackTemp'],
                    'humidity': row['Humidity'],
                    'pressure': row['Pressure'],
                    'wind_speed': row['WindSpeed'],
                    'wind_direction': row['WindDirection'],
                    'rain': row['Rainfall'],
                })
            
            return {
                'data': weather_list,
                'source': 'live',
            }
            
        except Exception as e:
            return self._error_response(f"FastF1 error: {str(e)}")
    
    def get_session_results(self, year: int, round_number: int, session_type: str) -> Dict[str, Any]:
        """
        Get session results (practice/qualifying/race).
        
        Args:
            year: Season year
            round_number: Round number
            session_type: Session type
        
        Returns:
            Dictionary with results data and source info
        """
        try:
            session = self.get_session(year, round_number, session_type)
            if not session:
                return self._error_response("Session not available")
            
            results = session.results
            
            results_list = []
            for _, result in results.iterrows():
                results_list.append({
                    'position': result['Position'],
                    'driver': result['DriverNumber'],
                    'driver_name': result['Abbreviation'],
                    'team': result['TeamName'],
                    'lap_time': str(result['Time']) if result['Time'] else None,
                    'gap': str(result['Delta']) if result['Delta'] else None,
                    'laps': result['Laps'],
                    'status': result['Status'],
                })
            
            return {
                'data': results_list,
                'source': 'live',
            }
            
        except Exception as e:
            return self._error_response(f"FastF1 error: {str(e)}")
    
    def _error_response(self, message: str) -> Dict[str, Any]:
        """Return error response."""
        return {
            'data': None,
            'source': 'error',
            'error': message,
        }
    
    def _fallback_lap_times(self, year: int, round_number: int, session_type: str) -> Dict[str, Any]:
        """Fallback when FastF1 is unavailable."""
        from config.team_driver_lineup_2026 import get_all_drivers
        
        drivers = get_all_drivers()
        # Generate simulated lap times based on driver strength
        simulated_data = []
        for driver in drivers:
            base_time = 90.0 - (driver['strength'] * 0.2)  # Base lap time in seconds
            for lap in range(1, 6):  # Simulate 5 laps
                simulated_data.append({
                    'driver': driver['code'],
                    'lap_number': lap,
                    'lap_time': f"{base_time + (lap * 0.1):.3f}",
                    'sector_times': [f"{base_time * 0.4:.3f}", f"{base_time * 0.3:.3f}", f"{base_time * 0.3:.3f}"],
                    'compound': 'Medium',
                    'tyre_life': lap,
                    'fresh_tyre': lap == 1,
                })
        
        return {
            'data': simulated_data,
            'source': 'simulated',
            'note': 'FastF1 unavailable - using simulated lap times',
        }
