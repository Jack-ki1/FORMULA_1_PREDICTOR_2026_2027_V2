"""
Hugging Face dataset loader for historical race data.
Provides access to the tracinginsights/RaceData dataset for backtesting.

tracinginsights/RaceData is a multi-config dataset: each table is a separate
config (circuits, drivers, races, results, qualifying, etc.).  See
https://huggingface.co/datasets/tracinginsights/RaceData
HF cache is directed to $HF_HOME (/tmp/hf_cache on Spaces) via env in Dockerfile.
"""
import os
import logging
from typing import Optional, Dict, List, Any
from config.api_settings import api_settings

logger = logging.getLogger(__name__)


class HuggingFaceDataset:
    """Loader for Hugging Face race data datasets — multi-config aware with graceful fallback."""

    # Known configs for tracinginsights/RaceData (extend as needed)
    KNOWN_TABLES = [
        "circuits", "constructors", "drivers", "races", "results",
        "qualifying", "sprint_results", "pit_stops", "lap_times",
        "driver_standings", "constructor_standings", "seasons", "status",
    ]

    def __init__(self):
        # Don't hard-fail if disabled — allow lazy fallback so Spaces can boot without secrets
        self.enabled = api_settings.is_enabled('huggingface')
        self.dataset_name = api_settings.HUGGINGFACE_DATASET
        self._cache: Dict[str, Any] = {}
    
    def _hf_kwargs(self) -> Dict[str, Any]:
        """Pass HF token + cache dir if available (Spaces provides HF_TOKEN)."""
        kw: Dict[str, Any] = {}
        token = os.getenv("HF_TOKEN") or os.getenv("HUGGINGFACE_API_KEY") or os.getenv("HF_API_TOKEN")
        if token:
            kw["token"] = token
        # datasets respects HF_HOME env already set in Dockerfile
        return kw

    def load_table(self, table: str = "races", split: str = "train") -> Dict[str, Any]:
        """Load a single table/config from tracinginsights/RaceData."""
        cache_key = f"{table}:{split}"
        if cache_key in self._cache:
            return {"data": self._cache[cache_key], "source": "cached", "table": table}
        try:
            from datasets import load_dataset
            # Multi-config: load_dataset(name, config)
            try:
                ds = load_dataset(self.dataset_name, table, **self._hf_kwargs())
            except Exception as e:
                # Some installs expose single-config with that table as split name
                logger.warning(f"load_dataset config fallback for {table}: {e}")
                ds = load_dataset(self.dataset_name, **self._hf_kwargs())
            # datasets returns DatasetDict; prefer split, else first
            if hasattr(ds, "keys"):
                if split in ds:
                    data = ds[split]
                else:
                    # try first key
                    first = list(ds.keys())[0]
                    data = ds[first]
            else:
                data = ds
            # Cache a compact conversion (keep as HF Dataset for caller to slice)
            self._cache[cache_key] = data
            return {"data": data, "source": "live", "table": table, "rows": len(data)}
        except ImportError:
            return self._error_response("datasets library not installed — pip install datasets huggingface-hub")
        except Exception as e:
            logger.warning(f"HF load_table {table} failed: {e}")
            return self._error_response(f"Hugging Face error: {str(e)[:300]}")

    def load_dataset(self) -> Dict[str, Any]:
        """Load dataset overview — lists available tables and row counts."""
        overview: Dict[str, Any] = {"dataset_name": self.dataset_name, "tables": {}}
        any_live = False
        for table in self.KNOWN_TABLES:
            res = self.load_table(table)
            if res.get("source") in ("live", "cached"):
                overview["tables"][table] = res.get("rows", 0)
                any_live = True
            else:
                overview["tables"][table] = f"error: {res.get('error','')[:80]}"
        return {"data": overview, "source": "live" if any_live else "error",
                "error": None if any_live else "No HF tables loaded — check network / HF_TOKEN"}
    
    def get_historical_race_results(self, season: int) -> Dict[str, Any]:
        """Get historical race results for a specific season (uses 'races'+'results' join)."""
        res = self.load_table("results")
        if res["source"] == "error":
            return res
        try:
            ds = res["data"]
            # results table has raceId -> join races to filter by year
            races_res = self.load_table("races")
            if races_res["source"] == "error":
                # fallback: filter results directly if year column exists
                try:
                    season_data = ds.filter(lambda x: int(x.get("year", x.get("season", 0))) == season)
                except Exception:
                    season_data = ds
                return {"data": season_data.to_pandas().to_dict(orient="records") if hasattr(season_data, "to_pandas") else [], "source": "live", "season": season}
            races = races_res["data"]
            # Build raceId->year map
            race_year = {}
            try:
                df_races = races.to_pandas()
                for _, r in df_races.iterrows():
                    race_year[int(r["raceId"])] = int(r["year"])
            except Exception:
                # fallback iter
                for r in races:
                    race_year[int(r["raceId"])] = int(r.get("year", r.get("season", 0)))
            # Filter results
            def _keep(x):
                rid = int(x.get("raceId", 0))
                return race_year.get(rid) == season
            season_data = ds.filter(_keep)
            # Return as list of dicts for easier consumption
            try:
                data = season_data.to_pandas().to_dict(orient="records")
            except Exception:
                data = [dict(x) for x in season_data]
            return {"data": data, "source": "live", "season": season, "rows": len(data)}
        except Exception as e:
            return self._error_response(f"Error filtering results for {season}: {e}")
    
    def get_driver_history(self, driver_code: str) -> Dict[str, Any]:
        """
        Get historical performance data for a specific driver.
        
        Args:
            driver_code: Driver code (e.g., 'VER', 'HAM')
        
        Returns:
            Dictionary with driver history and source info
        """
        if not self._dataset:
            load_result = self.load_dataset()
            if load_result['source'] == 'error':
                return load_result
        
        try:
            # Assuming dataset has driver information
            if 'train' in self._dataset:
                driver_data = self._dataset['train'].filter(lambda x: x['driver_code'] == driver_code.upper())
                
                return {
                    'data': driver_data.to_dict(),
                    'source': 'live',
                    'driver_code': driver_code,
                }
            else:
                return self._error_response("Dataset structure not recognized")
                
        except Exception as e:
            return self._error_response(f"Error filtering driver data: {str(e)}")
    
    def get_circuit_history(self, circuit_name: str) -> Dict[str, Any]:
        """
        Get historical race data for a specific circuit.
        
        Args:
            circuit_name: Circuit name or partial match
        
        Returns:
            Dictionary with circuit history and source info
        """
        if not self._dataset:
            load_result = self.load_dataset()
            if load_result['source'] == 'error':
                return load_result
        
        try:
            # Assuming dataset has circuit information
            if 'train' in self._dataset:
                circuit_data = self._dataset['train'].filter(
                    lambda x: circuit_name.lower() in x['circuit_name'].lower()
                )
                
                return {
                    'data': circuit_data.to_dict(),
                    'source': 'live',
                    'circuit_name': circuit_name,
                }
            else:
                return self._error_response("Dataset structure not recognized")
                
        except Exception as e:
            return self._error_response(f"Error filtering circuit data: {str(e)}")
    
    def get_backtest_data(self, start_season: int, end_season: int) -> Dict[str, Any]:
        """
        Get data for backtesting model accuracy.
        
        Args:
            start_season: Start season year
            end_season: End season year
        
        Returns:
            Dictionary with backtest data and source info
        """
        if not self._dataset:
            load_result = self.load_dataset()
            if load_result['source'] == 'error':
                return load_result
        
        try:
            # Get data for multiple seasons
            all_data = []
            for season in range(start_season, end_season + 1):
                season_result = self.get_historical_race_results(season)
                if season_result['source'] == 'live':
                    all_data.extend(season_result['data'])
            
            return {
                'data': all_data,
                'source': 'live',
                'seasons': list(range(start_season, end_season + 1)),
            }
            
        except Exception as e:
            return self._error_response(f"Error getting backtest data: {str(e)}")
    
    def _error_response(self, message: str) -> Dict[str, Any]:
        """Return error response."""
        return {
            'data': None,
            'source': 'error',
            'error': message,
        }
    
    def _fallback_data(self, message: str) -> Dict[str, Any]:
        """Fallback when Hugging Face is unavailable."""
        return {
            'data': [],
            'source': 'simulated',
            'note': f'Hugging Face unavailable - {message}',
        }
