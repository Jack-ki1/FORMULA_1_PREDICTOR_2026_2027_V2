"""
2026 Season Data - Local snapshot of season-to-date results.
This module stores actual race results as they happen during the 2026 season.
In production, this would be populated from Jolpica API after each race.
"""

# 2026 Season Results (to be populated as races occur)
SEASON_2026_RESULTS = {
    'completed_races': 14,  # As of Hungarian GP (Round 11)
        'results': {
        1: {'winner': 'VER', 'podium': ['VER', 'NOR', 'PIA'], 'fastest_lap': 'HAM', 'safety_cars': 1, 'retirements': 2},
        2: {'winner': 'NOR', 'podium': ['NOR', 'ANT', 'LEC'], 'fastest_lap': 'NOR', 'safety_cars': 0, 'retirements': 1},
        3: {'winner': 'VER', 'podium': ['VER', 'PIA', 'HAM'], 'fastest_lap': 'VER', 'safety_cars': 0, 'retirements': 3},
        4: {'winner': 'ANT', 'podium': ['ANT', 'RUS', 'VER'], 'fastest_lap': 'ANT', 'safety_cars': 2, 'retirements': 1},
        5: {'winner': 'NOR', 'podium': ['NOR', 'VER', 'PIA'], 'fastest_lap': 'VER', 'safety_cars': 1, 'retirements': 2},
        6: {'winner': 'LEC', 'podium': ['LEC', 'NOR', 'VER'], 'fastest_lap': 'LEC', 'safety_cars': 2, 'retirements': 0},
        7: {'winner': 'HAM', 'podium': ['HAM', 'RUS', 'NOR'], 'fastest_lap': 'HAM', 'safety_cars': 0, 'retirements': 1},
        8: {'winner': 'ANT', 'podium': ['ANT', 'VER', 'PIA'], 'fastest_lap': 'ANT', 'safety_cars': 1, 'retirements': 2},
        9: {'winner': 'HAM', 'podium': ['HAM', 'ANT', 'RUS'], 'fastest_lap': 'HAM', 'safety_cars': 1, 'retirements': 1},
        10: {'winner': 'VER', 'podium': ['VER', 'NOR', 'PIA'], 'fastest_lap': 'VER', 'safety_cars': 0, 'retirements': 3},
        11: {'winner': 'ANT', 'podium': ['ANT', 'HAM', 'NOR'], 'fastest_lap': 'ANT', 'safety_cars': 1, 'retirements': 1},
        12: {'winner': 'NOR', 'podium': ['NOR', 'ANT', 'RUS'], 'fastest_lap': 'NOR', 'safety_cars': 1, 'retirements': 1},
        13: {'winner': 'ANT', 'podium': ['ANT', 'RUS', 'VER'], 'fastest_lap': 'ANT', 'safety_cars': 0, 'retirements': 2},
        14: {'winner': 'ANT', 'podium': ['ANT', 'VER', 'NOR'], 'fastest_lap': 'ANT', 'safety_cars': 1, 'retirements': 1},
    },
}

# Driver Championship Standings (as of Round 11)
DRIVER_STANDINGS_2026 = [
    {'position': 1, 'driver_code': 'ANT', 'points': 292, 'team': 'mercedes'},
    {'position': 2, 'driver_code': 'RUS', 'points': 211, 'team': 'mercedes'},
    {'position': 3, 'driver_code': 'HAM', 'points': 191, 'team': 'ferrari'},
    {'position': 4, 'driver_code': 'NOR', 'points': 186, 'team': 'mclaren'},
    {'position': 5, 'driver_code': 'LEC', 'points': 167, 'team': 'ferrari'},
    {'position': 6, 'driver_code': 'VER', 'points': 145, 'team': 'redbull'},
    {'position': 7, 'driver_code': 'PIA', 'points': 120, 'team': 'mclaren'},
    {'position': 8, 'driver_code': 'HAD', 'points': 71, 'team': 'redbull'},
    {'position': 9, 'driver_code': 'LAW', 'points': 59, 'team': 'racingbulls'},
    {'position': 10, 'driver_code': 'GAS', 'points': 41, 'team': 'alpine'},
    {'position': 11, 'driver_code': 'LIN', 'points': 31, 'team': 'racingbulls'},
    {'position': 12, 'driver_code': 'COL', 'points': 27, 'team': 'alpine'},
    {'position': 13, 'driver_code': 'BEA', 'points': 18, 'team': 'haas'},
    {'position': 14, 'driver_code': 'BOR', 'points': 10, 'team': 'audi'},
    {'position': 15, 'driver_code': 'HUL', 'points': 7, 'team': 'audi'},
    {'position': 16, 'driver_code': 'SAI', 'points': 6, 'team': 'williams'},
    {'position': 17, 'driver_code': 'ALB', 'points': 5, 'team': 'williams'},
    {'position': 18, 'driver_code': 'OCO', 'points': 3, 'team': 'haas'},
    {'position': 19, 'driver_code': 'ALO', 'points': 3, 'team': 'astonmartin'},
    {'position': 20, 'driver_code': 'TSU', 'points': 1, 'team': 'racingbulls'},
    {'position': 21, 'driver_code': 'STR', 'points': 0, 'team': 'astonmartin'},
    {'position': 22, 'driver_code': 'BOT', 'points': 0, 'team': 'cadillac'},
    {'position': 23, 'driver_code': 'PER', 'points': 0, 'team': 'cadillac'}
]

# Constructor Championship Standings (as of Round 11)
CONSTRUCTOR_STANDINGS_2026 = [
    {'position': 1, 'team_id': 'mercedes', 'points': 503},
    {'position': 2, 'team_id': 'ferrari', 'points': 358},
    {'position': 3, 'team_id': 'mclaren', 'points': 306},
    {'position': 4, 'team_id': 'redbull', 'points': 230},
    {'position': 5, 'team_id': 'racingbulls', 'points': 77},
    {'position': 6, 'team_id': 'alpine', 'points': 68},
    {'position': 7, 'team_id': 'haas', 'points': 21},
    {'position': 8, 'team_id': 'audi', 'points': 17},
    {'position': 9, 'team_id': 'williams', 'points': 11},
    {'position': 10, 'team_id': 'astonmartin', 'points': 3},
    {'position': 11, 'team_id': 'cadillac', 'points': 0}
]

def get_race_result(round_number):
    """Get race result for a specific round."""
    return SEASON_2026_RESULTS['results'].get(round_number)

def add_race_result(round_number, result_data):
    """Add a new race result to the season data."""
    SEASON_2026_RESULTS['results'][round_number] = result_data
    SEASON_2026_RESULTS['completed_races'] += 1

def _try_live_standings(kind="drivers"):
    """Attempt live Jolpica fetch; returns None on failure so snapshot is used."""
    try:
        from data.jolpica_client import JolpicaClient
        c = JolpicaClient()
        if kind=="drivers":
            r=c.get_driver_standings(2026)
            # Parse MRData if live
            if r.get("source")=="live" and r.get("data",{}).get("MRData"):
                lst=r["data"]["MRData"]["StandingsTable"]["StandingsLists"][0]["DriverStandings"]
                out=[]
                team_map={"mercedes":"mercedes","ferrari":"ferrari","mclaren":"mclaren","red_bull":"redbull","rb":"racingbulls","alpine":"alpine","haas":"haas","audi":"audi","williams":"williams","aston_martin":"astonmartin","cadillac":"cadillac"}
                for i,d in enumerate(lst,1):
                    out.append({"position":int(d["position"]), "driver_code":d["Driver"]["code"], "points":int(d["points"]), "team":team_map.get(d["Constructors"][0]["constructorId"], d["Constructors"][0]["constructorId"])})
                return out
        else:
            r=c.get_constructor_standings(2026)
            if r.get("source")=="live" and r.get("data",{}).get("MRData"):
                lst=r["data"]["MRData"]["StandingsTable"]["StandingsLists"][0]["ConstructorStandings"]
                out=[]
                cmap={"red_bull":"redbull","rb":"racingbulls","aston_martin":"astonmartin"}
                for d in lst:
                    cid=d["Constructor"]["constructorId"]
                    out.append({"position":int(d["position"]), "team_id":cmap.get(cid,cid), "points":int(d["points"])})
                return out
    except Exception:
        pass
    return None

def get_driver_standings():
    """Return current driver championship standings — live first, snapshot fallback."""
    live=_try_live_standings("drivers")
    return live if live else DRIVER_STANDINGS_2026

def get_constructor_standings():
    """Return current constructor championship standings — live first, snapshot fallback."""
    live=_try_live_standings("constructors")
    return live if live else CONSTRUCTOR_STANDINGS_2026

def get_driver_points(driver_code):
    """Get points for a specific driver."""
    for entry in DRIVER_STANDINGS_2026:
        if entry['driver_code'] == driver_code.upper():
            return entry['points']
    return 0

def get_constructor_points(team_id):
    """Get points for a specific constructor."""
    for entry in CONSTRUCTOR_STANDINGS_2026:
        if entry['team_id'] == team_id.lower():
            return entry['points']
    return 0

def get_completed_rounds():
    """Return number of completed rounds."""
    return SEASON_2026_RESULTS['completed_races']

def get_all_race_results():
    """Return all race results."""
    return SEASON_2026_RESULTS['results']
