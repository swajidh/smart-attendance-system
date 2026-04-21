from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.attendance import router as attendance_router

app = FastAPI(
    title="Smart Attendance System API",
    description="API for real-time face recognition and attendance tracking",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(attendance_router, prefix="/api/v1/attendance", tags=["Attendance"])

@app.get("/")
async def root():
    return {"message": "Welcome to Smart Attendance API"}
