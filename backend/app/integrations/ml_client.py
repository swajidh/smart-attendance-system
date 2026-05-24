from typing import Any

from app.config import get_settings
from app.integrations.base import BaseIntegrationClient


class MLServiceClient(BaseIntegrationClient):
    def __init__(self) -> None:
        settings = get_settings()
        super().__init__(settings.ML_SERVICE_URL, settings.ML_SERVICE_TIMEOUT_SECONDS)

    def _service_code(self) -> str:
        return "ML"

    async def identify_face(self, *, image_path: str, top_k: int = 5) -> dict[str, Any]:
        """Call ML service identify endpoint (to be implemented on ML side)."""
        return await self._request(
            "POST",
            "/api/v1/identify",
            json={"image_path": image_path, "top_k": top_k},
        )
