from fastapi import APIRouter, HTTPException
from app.models.recipe import Recipe
from app.services import code_generator

router = APIRouter()

@router.post("/generate-code")
def generate_code(recipe: Recipe):
    """
    Converts the Recipe into a production-ready Python script.
    """
    try:
        # 1. Generate the massive "God-Mode" Script
        script_content = code_generator.generate_pipeline_code(recipe)
        
        # 2. Get the list of libraries (xgboost, lightgbm, etc.)
        requirements = code_generator.get_requirements()
        
        # 3. Return everything needed for the Frontend Code Editor
        return {
            "status": "success",
            "filename": "pipeline.py",
            "code": script_content,
            "requirements": requirements,
            "install_command": f"pip install {' '.join(requirements)}"
        }
    
    except Exception as e:
        # If the generator crashes, tell us why
        print(f"Error generating code: {e}")
        raise HTTPException(status_code=500, detail=str(e))