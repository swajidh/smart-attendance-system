from abc import ABC, abstractmethod
from typing import Any

import httpx

from app.utils.exceptions import AppException


class BaseIntegrationClient(ABC):
    def __init__(self, base_url: str, timeout: float) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    @abstractmethod
    def _service_code(self) -> str:
        raise NotImplementedError

    async def _request(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        url = f"{self.base_url}{path}"
        code = self._service_code()
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.request(method, url, **kwargs)
                response.raise_for_status()
                data = response.json()
                if isinstance(data, dict):
                    return data
                return {"result": data}
        except httpx.TimeoutException as exc:
            raise AppException(
                status_code=503,
                message="ML service is not responding",
                code=f"{code}_TIMEOUT",
            ) from exc
        except httpx.HTTPStatusError as exc:
            raise AppException(
                status_code=502,
                message="ML service request failed",
                code=f"{code}_ERROR",
                detail=str(exc.response.status_code),
            ) from exc
