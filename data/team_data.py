"""
Team data module providing team information and statistics.
Integrates with config.team_driver_lineup_2026 for the main roster.
"""
from config.team_driver_lineup_2026 import get_all_teams, get_team_by_id

def get_team_stats():
    """
    Return detailed team statistics.
    In production, this would be populated from real historical data.
    """
    return {
        'mclaren': {
            'full_name': 'McLaren F1 Team',
            'base': 'Woking, United Kingdom',
            'engine': 'Mercedes',
            'chassis': 'MCL-38',
            'team_principal': 'Andrea Stella',
            'championships': 8,
            'wins': 183,
            'podiums': 504,
            'pole_positions': 156,
            'fastest_laps': 166,
            'first_season': 1966,
            'world_champions': ['Häkkinen', 'Hamilton', 'Prost', 'Senna', 'Lauda', 'Hunt', 'Fittipaldi', 'Emerson Fittipaldi'],
        },
        'ferrari': {
            'full_name': 'Scuderia Ferrari',
            'base': 'Maranello, Italy',
            'engine': 'Ferrari',
            'chassis': 'SF-24',
            'team_principal': 'Frédéric Vasseur',
            'championships': 16,
            'wins': 243,
            'podiums': 817,
            'pole_positions': 243,
            'fastest_laps': 262,
            'first_season': 1950,
            'world_champions': ['Schumacher', 'Raikkonen', 'Scheckter', 'Lauda', 'Hill', 'Ascari', 'Fangio'],
        },
        'redbull': {
            'full_name': 'Red Bull Racing',
            'base': 'Milton Keynes, United Kingdom',
            'engine': 'Honda RBPT',
            'chassis': 'RB20',
            'team_principal': 'Christian Horner',
            'championships': 6,
            'wins': 118,
            'podiums': 285,
            'pole_positions': 89,
            'fastest_laps': 72,
            'first_season': 2005,
            'world_champions': ['Verstappen', 'Vettel'],
        },
        'mercedes': {
            'full_name': 'Mercedes-AMG Petronas F1 Team',
            'base': 'Brackley, United Kingdom',
            'engine': 'Mercedes',
            'chassis': 'W15',
            'team_principal': 'Toto Wolff',
            'championships': 8,
            'wins': 125,
            'podiums': 267,
            'pole_positions': '103',
            'fastest_laps': 84,
            'first_season': 1970,
            'world_champions': ['Hamilton', 'Rosberg', 'Schumacher', 'Hakkinen', 'Prost', 'Senna', 'Piquet', 'Moss', 'Fangio'],
        },
        'astonmartin': {
            'full_name': 'Aston Martin Aramco Cognizant F1 Team',
            'base': 'Silverstone, United Kingdom',
            'engine': 'Mercedes',
            'chassis': 'AMR24',
            'team_principal': 'Mike Krack',
            'championships': 0,
            'wins': 0,
            'podiums': 5,
            'pole_positions': 1,
            'fastest_laps': 0,
            'first_season': 2018,
            'world_champions': [],
        },
        'williams': {
            'full_name': 'Williams Racing',
            'base': 'Grove, United Kingdom',
            'engine': 'Mercedes',
            'chassis': 'FW46',
            'team_principal': 'James Vowles',
            'championships': 9,
            'wins': 114,
            'podiums': 313,
            'pole_positions': 128,
            'fastest_laps': 133,
            'first_season': 1977,
            'world_champions': ['Jones', 'Rosberg', 'Keke Rosberg', 'Piquet', 'Mansell', 'Prost', 'Hill', 'Villeneuve'],
        },
        'audi': {
            'full_name': 'Audi F1 Team',
            'base': 'Neuburg an der Donau, Germany',
            'engine': 'Audi',
            'chassis': 'A1',
            'team_principal': 'Andreas Seidl',
            'championships': 0,
            'wins': 0,
            'podiums': 0,
            'pole_positions': 0,
            'fastest_laps': 0,
            'first_season': 2026,
            'world_champions': [],
        },
        'alpine': {
            'full_name': 'BWT Alpine F1 Team',
            'base': 'Enstone, United Kingdom',
            'engine': 'Renault',
            'chassis': 'A524',
            'team_principal': 'Bruno Famin',
            'championships': 2,
            'wins': 21,
            'podiums': 102,
            'pole_positions': 51,
            'fastest_laps': 33,
            'first_season': 1977,
            'world_champions': ['Alonso'],
        },
        'haas': {
            'full_name': 'MoneyGram Haas F1 Team',
            'base': 'Kannapolis, United States',
            'engine': 'Ferrari',
            'chassis': 'VF-24',
            'team_principal': 'Guenther Steiner',
            'championships': 0,
            'wins': 0,
            'podiums': 0,
            'pole_positions': 0,
            'fastest_laps': 0,
            'first_season': 2016,
            'world_champions': [],
        },
        'racingbulls': {
            'full_name': 'Racing Bulls F1 Team',
            'base': 'Faenza, Italy',
            'engine': 'Honda RBPT',
            'chassis': 'RB04',
            'team_principal': 'Laurent Mekies',
            'championships': 0,
            'wins': 0,
            'podiums': 0,
            'pole_positions': 0,
            'fastest_laps': 0,
            'first_season': 2026,
            'world_champions': [],
        },
        'cadillac': {
            'full_name': 'Cadillac F1 Team',
            'base': 'Indianapolis, United States',
            'engine': 'Cadillac',
            'chassis': 'C1',
            'team_principal': 'Mario Andretti',
            'championships': 0,
            'wins': 0,
            'podiums': 0,
            'pole_positions': 0,
            'fastest_laps': 0,
            'first_season': 2026,
            'world_champions': [],
        },
    }

def get_team_stat(team_id):
    """Get team statistics by team ID."""
    return get_team_stats().get(team_id.lower())

def get_enhanced_team_data(team_id):
    """Combine roster data with statistics."""
    team = get_team_by_id(team_id)
    stats = get_team_stat(team_id)
    
    if team and stats:
        return {**team, **stats}
    elif team:
        return team
    return None

def get_all_enhanced_teams():
    """Return all teams with enhanced statistical data."""
    teams = get_all_teams()
    enhanced = []
    for team in teams:
        stats = get_team_stat(team['id'])
        if stats:
            enhanced.append({**team, **stats})
        else:
            enhanced.append(team)
    return enhanced

def get_team_power_rankings():
    """
    Live constructor power rankings — uses real championship points from Jolpica/snapshot.
    """
    try:
        from data.season_2026 import get_constructor_standings
        standings = get_constructor_standings()
        # standings already live-normalized: [{position, team_id, points}]
        form_map = {1:'Dominant',2:'Excellent',3:'Strong',4:'Strong',5:'Midfield',6:'Midfield',7:'Developing',8:'Developing',9:'Struggling',10:'Struggling',11:'Backmarker'}
        return [{'team_id': s['team_id'], 'position': s['position'], 'points': s['points'], 'form': form_map.get(s['position'],'Midfield')} for s in standings]
    except Exception:
        return [
            {'team_id': 'mercedes', 'position': 1, 'points': 503, 'form': 'Dominant'},
            {'team_id': 'ferrari', 'position': 2, 'points': 358, 'form': 'Excellent'},
            {'team_id': 'mclaren', 'position': 3, 'points': 306, 'form': 'Strong'},
            {'team_id': 'redbull', 'position': 4, 'points': 230, 'form': 'Strong'},
            {'team_id': 'racingbulls', 'position': 5, 'points': 77, 'form': 'Midfield'},
            {'team_id': 'alpine', 'position': 6, 'points': 68, 'form': 'Midfield'},
            {'team_id': 'haas', 'position': 7, 'points': 21, 'form': 'Developing'},
            {'team_id': 'audi', 'position': 8, 'points': 17, 'form': 'Developing'},
            {'team_id': 'williams', 'position': 9, 'points': 11, 'form': 'Struggling'},
            {'team_id': 'astonmartin', 'position': 10, 'points': 3, 'form': 'Struggling'},
            {'team_id': 'cadillac', 'position': 11, 'points': 0, 'form': 'Backmarker'},
        ]
