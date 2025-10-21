import random
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)

class WinPredictor:
    """Simplified Win Predictor without heavy ML dependencies"""
    
    def __init__(self):
        self.model_version = "1.0.0-simple"
        self.is_ready = True
        self.confidence_threshold = 0.7
        
    async def initialize(self):
        """Initialize the predictor"""
        logger.info("Initializing Simple Win Predictor...")
        self.is_ready = True
        logger.info("Simple Win Predictor initialized successfully")
    
    async def predict(
        self,
        player_data: Dict[str, Any],
        opponent_data: Optional[Dict[str, Any]] = None,
        battle_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Make a win prediction using simple heuristics"""
        try:
            if not self.is_ready:
                raise ValueError("Model not ready")
            
            # Simple prediction based on player stats
            player_trophies = player_data.get("trophies", 0)
            player_wins = player_data.get("wins", 0)
            player_losses = player_data.get("losses", 0)
            
            # Calculate base win probability
            win_rate = player_wins / max(1, player_wins + player_losses)
            trophy_factor = min(1.0, player_trophies / 6000)  # Normalize to 6000 trophies
            
            # Base probability
            base_probability = (win_rate * 0.6) + (trophy_factor * 0.4)
            
            # Add some randomness for demo
            win_probability = max(0.1, min(0.9, base_probability + (random.random() - 0.5) * 0.3))
            
            # Calculate confidence
            confidence = 0.6 + random.random() * 0.3
            
            # Generate influencing factors
            influencing_factors = {
                "deck_synergy": random.uniform(0.3, 0.9),
                "elixir_efficiency": random.uniform(0.4, 0.8),
                "opponent_counter": random.uniform(0.2, 0.7),
                "player_skill": win_rate,
                "recent_performance": random.uniform(0.3, 0.8)
            }
            
            # Generate recommendations
            recommendations = self._generate_recommendations(win_probability, player_data)
            
            return {
                "win_probability": win_probability,
                "confidence": confidence,
                "model_version": self.model_version,
                "input_features": {
                    "player_trophies": player_trophies,
                    "win_rate": win_rate,
                    "trophy_factor": trophy_factor
                },
                "influencing_factors": influencing_factors,
                "recommendations": recommendations,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error making prediction: {e}")
            raise
    
    async def predict_live(self, player_tag: str, battle_data: Dict[str, Any]) -> Dict[str, Any]:
        """Make a live prediction during an ongoing battle"""
        try:
            # Simulate live prediction
            win_probability = 0.5 + (random.random() - 0.5) * 0.6
            confidence = 0.6 + random.random() * 0.3
            
            battle_analysis = {
                "battle_time_remaining": battle_data.get("time_remaining", 180),
                "player_towers": battle_data.get("player_towers", 3),
                "opponent_towers": battle_data.get("opponent_towers", 3),
                "elixir_advantage": random.randint(-2, 2),
                "current_phase": self._determine_battle_phase(battle_data.get("time_remaining", 180))
            }
            
            recommendations = self._generate_live_recommendations(win_probability, battle_data)
            
            return {
                "win_probability": win_probability,
                "confidence": confidence,
                "model_version": self.model_version,
                "battle_analysis": battle_analysis,
                "recommendations": recommendations,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error making live prediction: {e}")
            raise
    
    def _generate_recommendations(self, win_probability: float, player_data: Dict[str, Any]) -> List[str]:
        """Generate strategic recommendations"""
        recommendations = []
        
        if win_probability < 0.4:
            recommendations.extend([
                "Focus on defensive plays",
                "Look for positive elixir trades",
                "Play more conservatively"
            ])
        elif win_probability > 0.7:
            recommendations.extend([
                "Maintain aggressive pressure",
                "Look for tower damage opportunities",
                "Keep up the momentum"
            ])
        else:
            recommendations.extend([
                "Adapt to opponent's strategy",
                "Monitor elixir carefully",
                "Stay flexible with your approach"
            ])
        
        # Add random recommendations for variety
        extra_recommendations = [
            "Cycle to your win condition",
            "Defend and counter-attack",
            "Build a strong push",
            "Use spells for maximum value",
            "Protect your towers"
        ]
        
        recommendations.append(random.choice(extra_recommendations))
        return recommendations[:3]  # Limit to 3 recommendations
    
    def _generate_live_recommendations(self, win_probability: float, battle_data: Dict[str, Any]) -> List[str]:
        """Generate live battle recommendations"""
        recommendations = []
        
        time_remaining = battle_data.get("time_remaining", 180)
        
        if time_remaining > 120:
            recommendations.append("Learn opponent's deck rotation")
        elif time_remaining > 60:
            recommendations.append("Build your main push")
        else:
            recommendations.append("Go for decisive plays")
        
        if win_probability > 0.6:
            recommendations.append("Maintain pressure")
        else:
            recommendations.append("Focus on defense")
        
        recommendations.append("Watch your elixir management")
        
        return recommendations
    
    def _determine_battle_phase(self, time_remaining: int) -> str:
        """Determine current battle phase"""
        if time_remaining > 120:
            return "early_game"
        elif time_remaining > 60:
            return "mid_game"
        elif time_remaining > 0:
            return "late_game"
        else:
            return "overtime"
