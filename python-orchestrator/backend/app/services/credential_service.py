import base64
import hashlib
from cryptography.fernet import Fernet
from app.config import settings


class CredentialService:
    def __init__(self):
        # Derive a 32-byte key for Fernet from the SECRET_KEY or ENCRYPTION_KEY
        raw_key = settings.ENCRYPTION_KEY or settings.SECRET_KEY
        key_bytes = hashlib.sha256(raw_key.encode()).digest()
        self.fernet = Fernet(base64.urlsafe_b64encode(key_bytes))

    def encrypt(self, plain_text: str) -> str:
        if not plain_text:
            return ""
        return self.fernet.encrypt(plain_text.encode()).decode()

    def decrypt(self, cipher_text: str) -> str:
        if not cipher_text:
            return ""
        try:
            return self.fernet.decrypt(cipher_text.encode()).decode()
        except Exception:
            return "[Decryption Error: Invalid Key]"


credential_service = CredentialService()
