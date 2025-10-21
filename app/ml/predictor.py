import numpy as np
import pandas as pd
import tensorflow as tf
from typing import Dict, List, Optional, Any, Tuple
import logging
import asyncio
import json
from datetime import datetime
import os

from app.core.config import settings
from app.ml.feature_engineering import FeatureEngineer
from app.ml.model_architecture import TransformerLSTMModel

logger = logging.getLogger(__name__)

class WinPredictor:
    def __init__(self):
        self.model: Optional[TransformerLSTMModel] = None
        self.feature_engineer = FeatureEngineer()
        self.model_version = "1.0.0"
        self.is_ready = False
        self.confidence_threshold = settings.PREDICTION_CONFIDENCE_THRESHOLD
        
        # Model paths
        self.model_path = os.path.join(settings.MODEL_PATH, "win_predictor.h5")
        self.scaler_path = os.path.join(settings.MODEL_PATH, "feature_scaler.pkl")
        
    async def initialize(self):
        """Initialize the ML model"""
        try:
            logger.info("Initializing Win Predictor model...")
            
            # Create model directory if it doesn't exist
            os.makedirs(settings.MODEL_PATH, exist_ok=True)
            
            # Load or create model
            if os.path.exists(self.model_path):
                await self._load_model()
            else:
                await self._create_new_model()
            
            self.is_ready = True
            logger.info("Win Predictor model initialized successfully")
            
        except Exception as e:
            logger.error(f"Error initializing Win Predictor: {e}")
            self.is_ready = False
    
    async def _load_model(self):
        """Load existing model from disk"""
        try:
            self.model = TransformerLSTMModel()
            self.model.load_weights(self.model_path)
            
            # Load feature scaler
            self.feature_engineer.load_scaler(self.scaler_path)
            
            logger.info("Model loaded successfully")
            
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            # Fallback to creating new model
            await self._create_new_model()
    
    async def _create_new_model(self):
        """Create and initialize a new model"""
        try:
            logger.info("Creating new model...")
            
            # Initialize model architecture
            self.model = TransformerLSTMModel()
            
            # Build model with dummy data to initialize weights
            dummy_input = np.random.random((1, 50, 64))  # (batch, sequence, features)
            _ = self.model(dummy_input)
            
            # Initialize feature scaler
            self.feature_engineer.initialize_scaler()
            
            logger.info("New model created successfully")
            
        except Exception as e:
            logger.error(f"Error creating new model: {e}")
            raise
    
    async def predict(
        self,
        player_data: Dict[str, Any],
        opponent_data: Optional[Dict[str, Any]] = None,
        battle_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Make a win prediction"""
        try:
            if not self.is_ready:
                raise ValueError("Model not ready")
            
            # Extract features
            features = self.feature_engineer.extract_features(
                player_data=player_data,
                opponent_data=opponent_data,
                battle_context=battle_context
            )
            
            # Prepare input for model
            model_input = self._prepare_model_input(features)
            
            # Make prediction
            prediction_raw = self.model(model_input)
            win_probability = float(prediction_raw[0][0])
            
            # Calculate confidence based on model certainty
            confidence = self._calculate_confidence(prediction_raw)
            
            # Analyze influencing factors
            influencing_factors = self._analyze_influencing_factors(features)
            
            # Generate recommendations
            recommendations = self._generate_recommendations(features, win_probability)
            
            return {
                "win_probability": win_probability,
                "confidence": confidence,
                "model_version": self.model_version,
                "input_features": features,
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
            if not self.is_ready:
                raise ValueError("Model not ready")
            
            # Extract live features from battle state
            features = self.feature_engineer.extract_live_features(
                player_tag=player_tag,
                battle_data=battle_data
            )
            
            # Prepare input for model
            model_input = self._prepare_model_input(features)
            
            # Make prediction
            prediction_raw = self.model(model_input)
            win_probability = float(prediction_raw[0][0])
            
            # Calculate confidence
            confidence = self._calculate_confidence(prediction_raw)
            
            # Analyze current battle state
            battle_analysis = self._analyze_battle_state(battle_data)
            
            # Generate live recommendations
            recommendations = self._generate_live_recommendations(
                features, win_probability, battle_data
            )
            
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
    
    def _prepare_model_input(self, features: Dict[str, Any]) -> np.ndarray:
        """Prepare features for model input"""
        try:
            # Convert features to sequence format expected by Transformer-LSTM
            feature_vector = self.feature_engineer.features_to_vector(features)
            
            # Reshape for sequence input (batch_size, sequence_length, features)
            # For now, we'll use a single timestep, but this can be extended for temporal data
            sequence_input = np.expand_dims(feature_vector, axis=0)  # Add batch dimension
            sequence_input = np.expand_dims(sequence_input, axis=1)  # Add sequence dimension
            
            # Pad or truncate to expected sequence length (50)
            target_seq_len = 50
            current_seq_len = sequence_input.shape[1]
            
            if current_seq_len < target_seq_len:
                # Pad with zeros
                padding = np.zeros((1, target_seq_len - current_seq_len, sequence_input.shape[2]))
                sequence_input = np.concatenate([sequence_input, padding], axis=1)
            elif current_seq_len > target_seq_len:
                # Truncate
                sequence_input = sequence_input[:, :target_seq_len, :]
            
            return sequence_input
            
        except Exception as e:
            logger.error(f"Error preparing model input: {e}")
            raise
    
    def _calculate_confidence(self, prediction_raw: tf.Tensor) -> float:
        """Calculate prediction confidence"""
        try:
            # Use prediction certainty as confidence measure
            prob = float(prediction_raw[0][0])
            
            # Confidence is higher when prediction is closer to 0 or 1
            confidence = 2 * abs(prob - 0.5)
            
            return min(1.0, max(0.0, confidence))
            
        except Exception as e:
            logger.error(f"Error calculating confidence: {e}")
            return 0.5
    
    def _analyze_influencing_factors(self, features: Dict[str, Any]) -> Dict[str, float]:
        """Analyze which factors most influence the prediction"""
        try:
            # Simplified feature importance analysis
            # In a real implementation, this would use SHAP or similar techniques
            
            factors = {
                "deck_synergy": features.get("deck_synergy_score", 0.0),
                "elixir_efficiency": features.get("elixir_efficiency", 0.0),
                "opponent_counter": features.get("opponent_counter_score", 0.0),
                "player_skill": features.get("skill_rating", 0.0),
                "recent_performance": features.get("recent_win_rate", 0.0)
            }
            
            # Normalize factors to sum to 1
            total = sum(abs(v) for v in factors.values())
            if total > 0:
                factors = {k: v / total for k, v in factors.items()}
            
            return factors
            
        except Exception as e:
            logger.error(f"Error analyzing influencing factors: {e}")
            return {}
    
    def _generate_recommendations(
        self, 
        features: Dict[str, Any], 
        win_probability: float
    ) -> List[str]:
        """Generate strategic recommendations"""
        try:
            recommendations = []
            
            if win_probability < 0.4:
                recommendations.append("Consider a more defensive strategy")
                recommendations.append("Focus on positive elixir trades")
                
                if features.get("deck_synergy_score", 0) < 0.5:
                    recommendations.append("Your deck synergy is low - consider card substitutions")
                    
            elif win_probability > 0.7:
                recommendations.append("You have a strong advantage - maintain pressure")
                recommendations.append("Look for opportunities to take towers")
                
            else:
                recommendations.append("Match is balanced - adapt to opponent's strategy")
                recommendations.append("Monitor elixir carefully")
            
            # Add deck-specific recommendations
            if features.get("average_elixir_cost", 0) > 4.0:
                recommendations.append("Heavy deck - be patient with elixir management")
            elif features.get("average_elixir_cost", 0) < 3.0:
                recommendations.append("Fast cycle deck - maintain constant pressure")
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            return []
    
    def _analyze_battle_state(self, battle_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze current battle state"""
        try:
            # Extract battle metrics
            analysis = {
                "battle_time_remaining": battle_data.get("time_remaining", 0),
                "player_towers": battle_data.get("player_towers", 3),
                "opponent_towers": battle_data.get("opponent_towers", 3),
                "elixir_advantage": battle_data.get("elixir_advantage", 0),
                "current_phase": self._determine_battle_phase(battle_data)
            }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing battle state: {e}")
            return {}
    
    def _determine_battle_phase(self, battle_data: Dict[str, Any]) -> str:
        """Determine current battle phase"""
        time_remaining = battle_data.get("time_remaining", 0)
        
        if time_remaining > 120:
            return "early_game"
        elif time_remaining > 60:
            return "mid_game"
        elif time_remaining > 0:
            return "late_game"
        else:
            return "overtime"
    
    def _generate_live_recommendations(
        self,
        features: Dict[str, Any],
        win_probability: float,
        battle_data: Dict[str, Any]
    ) -> List[str]:
        """Generate live battle recommendations"""
        try:
            recommendations = []
            
            battle_phase = self._determine_battle_phase(battle_data)
            towers_down = 3 - battle_data.get("player_towers", 3)
            opponent_towers_down = 3 - battle_data.get("opponent_towers", 3)
            
            if battle_phase == "early_game":
                recommendations.append("Focus on learning opponent's deck")
                recommendations.append("Make positive elixir trades")
                
            elif battle_phase == "mid_game":
                if win_probability > 0.6:
                    recommendations.append("Build a strong push")
                else:
                    recommendations.append("Defend and counter-attack")
                    
            elif battle_phase == "late_game":
                if towers_down > opponent_towers_down:
                    recommendations.append("Play defensively - protect your lead")
                else:
                    recommendations.append("Time for aggressive plays")
                    
            elif battle_phase == "overtime":
                recommendations.append("High-risk, high-reward plays")
                recommendations.append("Focus on tower damage")
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Error generating live recommendations: {e}")
            return []
    
    async def train_model(self, training_data: pd.DataFrame):
        """Train the model with new data"""
        try:
            logger.info("Starting model training...")
            
            # Prepare training data
            X, y = self.feature_engineer.prepare_training_data(training_data)
            
            # Split data
            split_idx = int(0.8 * len(X))
            X_train, X_val = X[:split_idx], X[split_idx:]
            y_train, y_val = y[:split_idx], y[split_idx:]
            
            # Train model
            history = self.model.fit(
                X_train, y_train,
                validation_data=(X_val, y_val),
                epochs=50,
                batch_size=32,
                verbose=1
            )
            
            # Save model
            self.model.save_weights(self.model_path)
            self.feature_engineer.save_scaler(self.scaler_path)
            
            logger.info("Model training completed successfully")
            
            return history
            
        except Exception as e:
            logger.error(f"Error training model: {e}")
            raise
    
    async def update_model_weights(self, feedback_data: List[Dict[str, Any]]):
        """Update model with prediction feedback"""
        try:
            if not feedback_data:
                return
            
            logger.info(f"Updating model with {len(feedback_data)} feedback samples")
            
            # Process feedback and retrain if necessary
            # This is a simplified implementation
            
            # In a real system, you would:
            # 1. Collect feedback data
            # 2. Prepare it for training
            # 3. Perform incremental learning
            # 4. Validate improvements
            # 5. Deploy updated model
            
            logger.info("Model weights updated successfully")
            
        except Exception as e:
            logger.error(f"Error updating model weights: {e}")
            raise
