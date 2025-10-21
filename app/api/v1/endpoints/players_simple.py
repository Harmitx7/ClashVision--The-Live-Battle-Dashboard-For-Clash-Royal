from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging

from app.services.clash_royale_service import ClashRoyaleService

router = APIRouter()
logger = logging.getLogger(__name__)
clash_service = ClashRoyaleService()

@router.get("/{player_tag}")
async def get_player(
    player_tag: str,
    refresh: bool = Query(True, description="Force refresh from API")
):
    """Get player information by tag (simplified)"""
    try:
        # Clean player tag
        clean_tag = player_tag.replace("#", "").upper()
        
        # Fetch data from API
        player_data = await clash_service.get_player(clean_tag)
        if not player_data:
            raise HTTPException(status_code=404, detail="Player not found")
        
        # Return simplified player data
        return {
            "tag": clean_tag,
            "name": player_data.get("name", "Unknown"),
            "trophies": player_data.get("trophies", 0),
            "best_trophies": player_data.get("bestTrophies", 0),
            "wins": player_data.get("wins", 0),
            "losses": player_data.get("losses", 0),
            "battle_count": player_data.get("battleCount", 0),
            "three_crown_wins": player_data.get("threeCrownWins", 0),
            "exp_level": player_data.get("expLevel", 1),
            "arena_name": player_data.get("arena", {}).get("name", "Unknown"),
            "clan_name": player_data.get("clan", {}).get("name", "No Clan"),
            "clan_tag": player_data.get("clan", {}).get("tag", "").replace("#", "")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting player {player_tag}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/{player_tag}/battles")
async def get_player_battles(
    player_tag: str,
    limit: int = Query(25, ge=1, le=100)
):
    """Get player battle history (simplified)"""
    try:
        clean_tag = player_tag.replace("#", "").upper()
        
        # Get battles from API
        battles = await clash_service.get_player_battles(clean_tag, limit)
        
        return {
            "player_tag": clean_tag,
            "battles": battles,
            "count": len(battles)
        }
        
    except Exception as e:
        logger.error(f"Error getting player battles {player_tag}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/{player_tag}/stats")
async def get_player_stats(
    player_tag: str
):
    """Get calculated player statistics (simplified)"""
    try:
        clean_tag = player_tag.replace("#", "").upper()
        
        # Get player data
        player_data = await clash_service.get_player(clean_tag)
        if not player_data:
            raise HTTPException(status_code=404, detail="Player not found")
        
        # Calculate simple stats
        wins = player_data.get("wins", 0)
        losses = player_data.get("losses", 0)
        total_battles = wins + losses
        win_rate = wins / max(1, total_battles)
        
        return {
            "player_tag": clean_tag,
            "win_rate": win_rate,
            "total_battles": total_battles,
            "skill_rating": min(1.0, player_data.get("trophies", 0) / 6000),
            "consistency_score": 0.7,  # Placeholder
            "deck_mastery": 0.8,  # Placeholder
            "average_elixir_cost": 3.8  # Placeholder
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting player stats {player_tag}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
