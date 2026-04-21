from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.ml_service import ml_service
import json

router = APIRouter()

@router.websocket("/ws/detect")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Receive frame from frontend
            data = await websocket.receive_text()
            
            # Process the frame
            faces = ml_service.process_frame(data)
            
            # Send back the results
            await websocket.send_text(json.dumps({
                "status": "success",
                "faces": faces
            }))
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.close()
