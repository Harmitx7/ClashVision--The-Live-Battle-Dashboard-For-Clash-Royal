from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from app.core.database import get_db
from app.services.clash_royale_service import ClashRoyaleService
from app.ml.predictor_simple import WinPredictor
from app.models.prediction import Prediction
from app.schemas.prediction import PredictionResponse, PredictionRequest

router = APIRouter()
logger = logging.getLogger(__name__)
clash_service = ClashRoyaleService()
win_predictor = WinPredictor()

@router.post("/{player_tag}/predict", response_model=PredictionResponse)
async def predict_win_probability(
    player_tag: str,
    prediction_request: PredictionRequest,
    db: Session = Depends(get_db)
):
    """Predict win probability for a player"""
    try:
        clean_tag = player_tag.replace("#", "").upper()
        
        # Get player data
        player_data = await clash_service.get_player(clean_tag)
        if not player_data:
            raise HTTPException(status_code=404, detail="Player not found")
        
        # Make prediction
        prediction = await win_predictor.predict(
            player_data=player_data,
            opponent_data=prediction_request.opponent_data,
            battle_context=prediction_request.battle_context
        )
        
        # Save prediction to database
        db_prediction = Prediction(
            player_tag=clean_tag,
            win_probability=prediction["win_probability"],
            confidence=prediction["confidence"],
            model_version=prediction["model_version"],
            input_features=prediction["input_features"],
            deck_synergy_impact=prediction["influencing_factors"]["deck_synergy"],
            elixir_efficiency_impact=prediction["influencing_factors"]["elixir_efficiency"],
            opponent_counter_impact=prediction["influencing_factors"]["opponent_counter"],
            player_skill_impact=prediction["influencing_factors"]["player_skill"],
            recent_performance_impact=prediction["influencing_factors"]["recent_performance"],
            prediction_type="api_request",
            battle_state=prediction_request.battle_context
        )
        
        db.add(db_prediction)
        db.commit()
        db.refresh(db_prediction)
        
        return PredictionResponse.from_orm(db_prediction)
        
    except Exception as e:
        logger.error(f"Error predicting for player {player_tag}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{player_tag}/predictions", response_model=List[PredictionResponse])
async def get_player_predictions(
    player_tag: str,
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get prediction history for a player"""
    try:
        clean_tag = player_tag.replace("#", "").upper()
        
        predictions = db.query(Prediction)\
            .filter(Prediction.player_tag == clean_tag)\
            .order_by(Prediction.created_at.desc())\
            .limit(limit)\
            .all()
        
        return [PredictionResponse.from_orm(pred) for pred in predictions]
        
    except Exception as e:
        logger.error(f"Error getting predictions for player {player_tag}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/{player_tag}/live-prediction")
async def get_live_prediction(
    player_tag: str,
    db: Session = Depends(get_db)
):
    """Get real-time prediction for ongoing battle"""
    try:
        clean_tag = player_tag.replace("#", "").upper()
        
        # Check if player is in an active battle
        battle_data = await clash_service.get_live_battle_data(clean_tag)
        if not battle_data:
            return {
                "message": "Player is not currently in a battle",
                "in_battle": False
            }
        
        # Make live prediction
        prediction = await win_predictor.predict_live(clean_tag, battle_data)
        
        return {
            "player_tag": clean_tag,
            "in_battle": True,
            "prediction": prediction,
            "battle_state": battle_data
        }
        
    except Exception as e:
        logger.error(f"Error getting live prediction for player {player_tag}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/{prediction_id}/feedback")
async def submit_prediction_feedback(
    prediction_id: int,
    rating: int = Query(..., ge=1, le=5),
    comment: Optional[str] = None,
    helpful: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """Submit feedback for a prediction"""
    try:
        prediction = db.query(Prediction).filter(Prediction.id == prediction_id).first()
        if not prediction:
            raise HTTPException(status_code=404, detail="Prediction not found")
        
        # Create feedback record
        from app.models.prediction import PredictionFeedback
        
        feedback = PredictionFeedback(
            prediction_id=prediction_id,
            user_rating=rating,
            user_comment=comment,
            was_helpful=helpful
        )
        
        db.add(feedback)
        db.commit()
        
        return {
            "message": "Feedback submitted successfully",
            "prediction_id": prediction_id
        }
        
    except Exception as e:
        logger.error(f"Error submitting feedback for prediction {prediction_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/model/metrics")
async def get_model_metrics(db: Session = Depends(get_db)):
    """Get current model performance metrics"""
    try:
        from app.models.prediction import ModelMetrics
        
        latest_metrics = db.query(ModelMetrics)\
            .order_by(ModelMetrics.created_at.desc())\
            .first()
        
        if not latest_metrics:
            return {"message": "No model metrics available"}
        
        return {
            "model_version": latest_metrics.model_version,
            "accuracy": latest_metrics.accuracy,
            "precision": latest_metrics.precision,
            "recall": latest_metrics.recall,
            "f1_score": latest_metrics.f1_score,
            "auc_roc": latest_metrics.auc_roc,
            "total_predictions": latest_metrics.total_predictions,
            "correct_predictions": latest_metrics.correct_predictions,
            "feature_importance": latest_metrics.feature_importance,
            "last_updated": latest_metrics.created_at.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting model metrics: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
