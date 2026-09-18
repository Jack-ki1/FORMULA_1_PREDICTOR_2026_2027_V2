from flask import Blueprint, render_template, jsonify
from data.season_2026 import get_driver_standings, get_constructor_standings
from data.jolpica_client import JolpicaClient

standings_bp = Blueprint('standings', __name__)

def _normalize_driver_standings(payload):
    """Normalize Jolpica MRData to [{position, driver_code, points, team}] for UI."""
    try:
        data = payload.get('data') or {}
        mr = data.get('MRData') if isinstance(data, dict) else None
        if mr:
            lst = mr['StandingsTable']['StandingsLists'][0]['DriverStandings']
            team_map = {"mercedes":"mercedes","ferrari":"ferrari","mclaren":"mclaren","red_bull":"redbull","rb":"racingbulls","alpine":"alpine","haas":"haas","audi":"audi","williams":"williams","aston_martin":"astonmartin","cadillac":"cadillac"}
            out = []
            for d in lst:
                out.append({"position": int(d["position"]), "driver_code": d["Driver"]["code"], "points": int(d["points"]), "wins": int(d.get("wins",0)), "team": team_map.get(d["Constructors"][0]["constructorId"], d["Constructors"][0]["constructorId"])})
            return out
    except Exception:
        pass
    return None

def _normalize_constructor_standings(payload):
    try:
        data = payload.get('data') or {}
        mr = data.get('MRData') if isinstance(data, dict) else None
        if mr:
            lst = mr['StandingsTable']['StandingsLists'][0]['ConstructorStandings']
            cmap = {"red_bull":"redbull","rb":"racingbulls","aston_martin":"astonmartin"}
            out=[]
            for d in lst:
                cid=d["Constructor"]["constructorId"]
                out.append({"position": int(d["position"]), "team_id": cmap.get(cid,cid), "points": int(d["points"]), "wins": int(d.get("wins",0))})
            return out
    except Exception:
        pass
    return None

@standings_bp.route('/')
def index():
    return render_template('standings.html')

@standings_bp.route('/api/driver-standings')
def api_driver_standings():
    """Live driver standings — Jolpica MRData → normalized list; cached counts as live."""
    try:
        client = JolpicaClient()
        from config.settings import settings
        result = client.get_driver_standings(settings.SEASON_YEAR)
        if result.get('source') in ('live','cached'):
            norm = _normalize_driver_standings(result)
            if norm:
                return jsonify({'data': norm, 'source': result.get('source'), 'provenance': result.get('provenance')})
        # fallback to snapshot (now synced to Round 14 live snapshot)
        standings = get_driver_standings()
        src = 'local'
        # if we have MRData fallback already parsed, use that source label
        return jsonify({'data': standings, 'source': src})
    except Exception as e:
        standings = get_driver_standings()
        return jsonify({'data': standings, 'source': 'local', 'error': str(e)})

@standings_bp.route('/api/constructor-standings')
def api_constructor_standings():
    """Live constructor standings — normalized."""
    try:
        client = JolpicaClient()
        result = client.get_constructor_standings()
        if result.get('source') in ('live','cached'):
            norm = _normalize_constructor_standings(result)
            if norm:
                return jsonify({'data': norm, 'source': result.get('source'), 'provenance': result.get('provenance')})
        standings = get_constructor_standings()
        return jsonify({'data': standings, 'source': 'local'})
    except Exception as e:
        standings = get_constructor_standings()
        return jsonify({'data': standings, 'source': 'local', 'error': str(e)})