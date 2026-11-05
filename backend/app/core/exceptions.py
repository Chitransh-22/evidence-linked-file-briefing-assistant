from fastapi import HTTPException, status


class DomainException(Exception):
    def __init__(self, message: str, code: str = "DOMAIN_ERROR"):
        self.message = message
        self.code = code
        super().__init__(message)


class DocumentProcessingError(DomainException):
    def __init__(self, message: str, stage: str = "unknown"):
        self.stage = stage
        super().__init__(message, code="PROCESSING_ERROR")


class ResourceNotFoundError(DomainException):
    def __init__(self, resource_type: str, resource_id: str):
        super().__init__(f"{resource_type} with ID '{resource_id}' was not found", code="NOT_FOUND")


class DuplicateDocumentError(DomainException):
    def __init__(self, sha256: str, existing_doc_id: str):
        self.sha256 = sha256
        self.existing_doc_id = existing_doc_id
        super().__init__(
            f"Document with identical SHA-256 checksum ({sha256[:12]}...) already exists (ID: {existing_doc_id})",
            code="DUPLICATE_DOCUMENT"
        )


class UnauthorizedAccessException(DomainException):
    def __init__(self, message: str = "Access to the requested resource is denied"):
        super().__init__(message, code="FORBIDDEN")
