# New file: Supabase storage backend for Django
from django.core.files.storage import Storage
from django.core.files.base import ContentFile
from django.conf import settings
import os

try:
    # supabase-py client
    from supabase import create_client
except Exception:
    create_client = None


class SupabaseStorage(Storage):
    """
    Minimal Django Storage backend using Supabase Storage.

    Configuration (from environment / Django settings):
    - SUPABASE_URL
    - SUPABASE_KEY
    - SUPABASE_BUCKET

    NOTE: This implementation focuses on the common methods used by Django's
    file handling: _save, exists, delete, url, size and open. It's intentionally
    small and synchronous to match the rest of the project.
    """

    def __init__(self, bucket_name=None):
        if create_client is None:
            raise RuntimeError(
                "supabase package is not installed. Add 'supabase' to requirements.txt"
            )

        self.supabase_url = os.getenv('SUPABASE_URL', getattr(settings, 'SUPABASE_URL', None))
        self.supabase_key = os.getenv('SUPABASE_KEY', getattr(settings, 'SUPABASE_KEY', None))
        self.bucket = bucket_name or os.getenv('SUPABASE_BUCKET', getattr(settings, 'SUPABASE_BUCKET', None))

        if not (self.supabase_url and self.supabase_key and self.bucket):
            raise RuntimeError('SUPABASE_URL, SUPABASE_KEY and SUPABASE_BUCKET must be set to use SupabaseStorage')

        # Create the client
        self.client = create_client(self.supabase_url, self.supabase_key)

    def _save(self, name, content):
        """Save file content to Supabase Storage at path `name`.

        `content` is a Django File-like object. We read bytes and upload.
        """
        # Ensure we start at beginning
        try:
            content.seek(0)
        except Exception:
            pass

        data = content.read()
        if hasattr(data, 'decode') and isinstance(data, str):
            # In case reading returned string (shouldn't), encode
            data = data.encode('utf-8')

        # Upload. The python client accepts file-like/bytes for upload.
        bucket = self.client.storage.from_(self.bucket)
        # Remove leading slash if present
        name = name.lstrip('/')

        # The upload API may raise; surface the exception to caller
        # If content has a content_type attribute set it via metadata header
        options = None
        try:
            # Some clients accept file-like objects; bytes works for most versions
            bucket.upload(name, data)
        except Exception as exc:
            # Attempt fallback: when the SDK expects a file path, try using upload of bytes via 'upload' fallback
            raise

        return name

    def exists(self, name):
        name = name.lstrip('/')
        bucket = self.client.storage.from_(self.bucket)
        try:
            items = bucket.list(path=os.path.dirname(name) or '', limit=1000)
            # list returns a list of dicts with 'name' keys; check for exact match
            for item in items or []:
                if item.get('name') == name:
                    return True
            return False
        except Exception:
            # On error, conservatively return False
            return False

    def url(self, name):
        """Return a public or signed URL for `name`.

        If SUPABASE_BUCKET_PUBLIC is set to 'True' (env or settings) we'll return
        the public URL. Otherwise create a signed URL with default expiry 1 hour.
        """
        name = name.lstrip('/')
        bucket = self.client.storage.from_(self.bucket)

        is_public = os.getenv('SUPABASE_BUCKET_PUBLIC', getattr(settings, 'SUPABASE_BUCKET_PUBLIC', 'False')) == 'True'
        try:
            if is_public:
                # get_public_url returns a dict like {'publicURL': 'https://...'}
                res = bucket.get_public_url(name)
                # Some client versions return the URL string directly
                if isinstance(res, dict):
                    return res.get('publicURL')
                return res
            else:
                # Create signed URL (expiry seconds configurable)
                expiry = int(os.getenv('SUPABASE_URL_EXPIRY_SECONDS', '3600'))
                res = bucket.create_signed_url(name, expiry)
                if isinstance(res, dict):
                    return res.get('signedURL') or res.get('signed_url') or res.get('signedURL')
                return res
        except Exception:
            return None

    def delete(self, name):
        name = name.lstrip('/')
        bucket = self.client.storage.from_(self.bucket)
        try:
            # remove expects list of paths
            bucket.remove([name])
            return True
        except Exception:
            return False

    def size(self, name):
        name = name.lstrip('/')
        bucket = self.client.storage.from_(self.bucket)
        try:
            meta = bucket.get_metadata(name)
            # metadata may have 'size' or 'Size'
            return int(meta.get('size') or meta.get('Size') or 0)
        except Exception:
            return 0

    def open(self, name, mode='rb'):
        name = name.lstrip('/')
        bucket = self.client.storage.from_(self.bucket)
        try:
            data = bucket.download(name)
            # bucket.download may return bytes or an object; normalize
            if hasattr(data, 'read'):
                content = data.read()
            else:
                content = data
            return ContentFile(content)
        except Exception:
            raise FileNotFoundError(name)

    def get_available_name(self, name, max_length=None):
        # Always use provided name; callers create unique names earlier
        return name

