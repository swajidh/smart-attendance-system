class AppException(Exception):
    def __init__(
        self,
        *,
        status_code: int,
        message: str,
        code: str,
        detail: str | None = None,
    ) -> None:
        self.status_code = status_code
        self.message = message
        self.code = code
        self.detail = detail
        super().__init__(message)


class NotFoundError(AppException):
    def __init__(self, message: str = "Resource not found", code: str = "NOT_FOUND") -> None:
        super().__init__(status_code=404, message=message, code=code)


class UnauthorizedError(AppException):
    def __init__(self, message: str = "Unauthorized", code: str = "UNAUTHORIZED") -> None:
        super().__init__(status_code=401, message=message, code=code)


class ForbiddenError(AppException):
    def __init__(self, message: str = "Forbidden", code: str = "FORBIDDEN") -> None:
        super().__init__(status_code=403, message=message, code=code)


class ConflictError(AppException):
    def __init__(self, message: str = "Conflict", code: str = "CONFLICT") -> None:
        super().__init__(status_code=409, message=message, code=code)


class BadRequestError(AppException):
    def __init__(self, message: str = "Bad request", code: str = "BAD_REQUEST") -> None:
        super().__init__(status_code=400, message=message, code=code)
