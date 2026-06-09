import re
from datetime import datetime, timedelta, timezone
from config import AZURE_BLOB_CONNECTION_STRING, AZURE_BLOB_CONTAINER


def _is_configured() -> bool:
    return bool(AZURE_BLOB_CONNECTION_STRING)


def _content_type(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return {
        "pdf":  "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "doc":  "application/msword",
        "txt":  "text/plain",
    }.get(ext, "application/octet-stream")


async def upload_resume(candidate_id: str, filename: str, file_bytes: bytes) -> tuple[str | None, str | None]:
    """
    Upload resume bytes to Azure Blob Storage.
    Returns (blob_name, sas_url) or (None, None) if blob storage is not configured.
    blob_name is stored in DB so the URL can be regenerated later.
    sas_url is valid for 1 year.
    """
    if not _is_configured():
        return None, None

    from azure.storage.blob.aio import BlobServiceClient
    from azure.storage.blob import generate_blob_sas, BlobSasPermissions, ContentSettings

    blob_name = f"{candidate_id}/{filename}"

    async with BlobServiceClient.from_connection_string(AZURE_BLOB_CONNECTION_STRING) as client:
        container = client.get_container_client(AZURE_BLOB_CONTAINER)
        try:
            await container.create_container()
        except Exception:
            pass  # already exists

        blob = container.get_blob_client(blob_name)
        await blob.upload_blob(
            file_bytes,
            overwrite=True,
            content_settings=ContentSettings(content_type=_content_type(filename)),
        )

        sas_url = _make_sas_url(client, blob_name)
        return blob_name, sas_url


def get_sas_url(blob_name: str) -> str | None:
    """Generate a fresh SAS URL for an existing blob (call when stored URL may have expired)."""
    if not _is_configured() or not blob_name:
        return None

    from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions

    client = BlobServiceClient.from_connection_string(AZURE_BLOB_CONNECTION_STRING)
    return _make_sas_url(client, blob_name)


def _make_sas_url(client, blob_name: str) -> str:
    from azure.storage.blob import generate_blob_sas, BlobSasPermissions

    account_name = client.account_name
    account_key  = client.credential.account_key

    sas = generate_blob_sas(
        account_name=account_name,
        container_name=AZURE_BLOB_CONTAINER,
        blob_name=blob_name,
        account_key=account_key,
        permission=BlobSasPermissions(read=True),
        expiry=datetime.now(timezone.utc) + timedelta(days=365),
    )
    return f"https://{account_name}.blob.core.windows.net/{AZURE_BLOB_CONTAINER}/{blob_name}?{sas}"
