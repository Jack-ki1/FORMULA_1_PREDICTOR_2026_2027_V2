"""
Explainability helper — SHAP if available, else feature-importance fallback.
Used by /analytics and prediction responses to explain why a driver is favoured.
"""
import logging
from typing import Dict, List, Any

logger = logging.getLogger(__name__)

def explain_prediction(feature_vector: Dict[str, float], feature_importance: Dict[str, float] = None) -> List[Dict[str, Any]]:
    """
    Rank features by contribution to this driver's score.
    If feature_importance is provided (from trained model), weight accordingly.
    Otherwise use heuristic: strength, grid_multiplier, team_avg_strength dominate.
    """
    if not feature_vector:
        return []
    # Heuristic importance if model not trained
    heuristic = {
        'strength': 0.22, 'grid_multiplier': 0.18, 'team_avg_strength': 0.12,
        'strength_vs_field': 0.10, 'reliability': 0.08, 'wet_skill': 0.06,
        'is_front_row': 0.05, 'grid_x_overtake': 0.05,
    }
    imp = feature_importance or heuristic
    # Normalize importance
    total = sum(abs(v) for v in imp.values()) or 1.0
    ranked = []
    for k, v in feature_vector.items():
        w = imp.get(k, 0.02)
        # Contribution = feature value * importance weight
        contrib = v * (w / total) * 100
        ranked.append({"feature": k, "value": round(float(v), 4), "contribution": round(float(contrib), 3)})
    ranked.sort(key=lambda x: abs(x["contribution"]), reverse=True)
    return ranked[:8]

def shap_explain(model, X) -> Dict[str, Any]:
    """Try SHAP, fall back to model.feature_importances_."""
    try:
        import shap
        explainer = shap.TreeExplainer(model)
        vals = explainer.shap_values(X)
        return {"method": "shap", "values": vals.tolist() if hasattr(vals, "tolist") else str(vals)[:500]}
    except Exception as e:
        logger.debug(f"SHAP not available: {e}")
        try:
            imp = getattr(model, "feature_importances_", None)
            if imp is not None:
                return {"method": "feature_importance", "importance": imp.tolist() if hasattr(imp, "tolist") else list(imp)}
        except Exception:
            pass
        return {"method": "none", "note": "Install shap for richer explanations: pip install shap"}
