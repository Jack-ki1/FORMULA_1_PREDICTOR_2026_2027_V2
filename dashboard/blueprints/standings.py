from flask import Blueprint, render_template, jsonify, make_response
from data.season_2026 import get_driver_standings, get_constructor_standings
from data.jolpica_client import JolpicaClient
import time

standings_bp = Blueprint('standings', __name__)

# Simple in-memory TTL cache for live standings (60s) — massively faster than Jolpica round-trip
_CACHE = {}
_CACHE_TTL = 60
def _get_cached(key):
    v = _CACHE.get(key)
    if v and time.time() - v[1] < _CACHE_TTL:
        return v[0]
    return None
def _set_cached(key, val):
    _CACHE[key] = (val, time.time())

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
    """Live driver standings — TTL cached 60s, ~2ms vs 800ms live."""
    cached = _get_cached('driver')
    if cached:
        resp = make_response(jsonify(cached))
        resp.headers['Cache-Control'] = 'public, max-age=30'
        resp.headers['X-Cache'] = 'HIT'
        return resp
    try:
        client = JolpicaClient()
        from config.settings import settings
        result = client.get_driver_standings(settings.SEASON_YEAR)
        if result.get('source') in ('live','cached'):
            norm = _normalize_driver_standings(result)
            if norm:
                payload = {'data': norm, 'source': result.get('source'), 'provenance': result.get('provenance')}
                _set_cached('driver', payload)
                resp = make_response(jsonify(payload))
                resp.headers['Cache-Control'] = 'public, max-age=30'
                resp.headers['X-Cache'] = 'MISS'
                return resp
        standings = get_driver_standings()
        payload = {'data': standings, 'source': 'local'}
        _set_cached('driver', payload)
        resp = make_response(jsonify(payload))
        resp.headers['Cache-Control'] = 'public, max-age=30'
        return resp
    except Exception as e:
        standings = get_driver_standings()
        payload = {'data': standings, 'source': 'local', 'error': str(e)}
        return jsonify(payload)

@standings_bp.route('/api/constructor-standings')
def api_constructor_standings():
    """Live constructor standings — TTL cached 60s."""
    cached = _get_cached('constructor')
    if cached:
        resp = make_response(jsonify(cached))
        resp.headers['Cache-Control'] = 'public, max-age=30'
        resp.headers['X-Cache'] = 'HIT'
        return resp
    try:
        client = JolpicaClient()
        result = client.get_constructor_standings()
        if result.get('source') in ('live','cached'):
            norm = _normalize_constructor_standings(result)
            if norm:
                payload = {'data': norm, 'source': result.get('source'), 'provenance': result.get('provenance')}
                _set_cached('constructor', payload)
                resp = make_response(jsonify(payload))
                resp.headers['Cache-Control'] = 'public, max-age=30'
                resp.headers['X-Cache'] = 'MISS'
                return resp
        standings = get_constructor_standings()
        payload = {'data': standings, 'source': 'local'}
        _set_cached('constructor', payload)
        resp = make_response(jsonify(payload))
        resp.headers['Cache-Control'] = 'public, max-age=30'
        return resp
    except Exception as e:
        standings = get_constructor_standings()
        return jsonify({'data': standings, 'source': 'local', 'error': str(e)})