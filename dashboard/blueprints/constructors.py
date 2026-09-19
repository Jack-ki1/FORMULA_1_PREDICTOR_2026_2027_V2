from flask import Blueprint, render_template, jsonify, make_response
from data.team_data import get_all_enhanced_teams, get_team_power_rankings
import time

constructors_bp = Blueprint('constructors', __name__)
_CACHE = {}
_TTL = 60
def _cget(k):
    v = _CACHE.get(k)
    if v and time.time() - v[1] < _TTL:
        return v[0]
    return None
def _cset(k,v): _CACHE[k]=(v,time.time())

@constructors_bp.route('/')
def index():
    teams = get_all_enhanced_teams()
    resp = make_response(render_template('constructors.html', teams=teams))
    resp.headers['Cache-Control'] = 'public, max-age=60'
    return resp

@constructors_bp.route('/api/teams')
def api_teams():
    """Get all teams — cached 60s."""
    c = _cget('teams')
    if c:
        resp = make_response(jsonify(c))
        resp.headers['X-Cache'] = 'HIT'
        resp.headers['Cache-Control'] = 'public, max-age=60'
        return resp
    teams = get_all_enhanced_teams()
    _cset('teams', teams)
    resp = make_response(jsonify(teams))
    resp.headers['Cache-Control'] = 'public, max-age=60'
    resp.headers['X-Cache'] = 'MISS'
    return resp

@constructors_bp.route('/api/power-rankings')
def api_power_rankings():
    """Get team power rankings — cached 60s (live standings)."""
    c = _cget('rankings')
    if c:
        resp = make_response(jsonify(c))
        resp.headers['X-Cache'] = 'HIT'
        resp.headers['Cache-Control'] = 'public, max-age=30'
        return resp
    rankings = get_team_power_rankings()
    _cset('rankings', rankings)
    resp = make_response(jsonify(rankings))
    resp.headers['Cache-Control'] = 'public, max-age=30'
    resp.headers['X-Cache'] = 'MISS'
    return resp