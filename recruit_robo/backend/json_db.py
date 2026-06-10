"""
Lightweight JSON file-backed database that mirrors Motor's async API.
Used automatically when no MongoDB / Cosmos DB connection is available.
Data is stored in backend/data/<collection>.json files.
"""
import json
from pathlib import Path
from datetime import datetime

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)


def _serial(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Type {type(obj)} not serializable")


class JsonCollection:
    def __init__(self, name: str):
        self._file = DATA_DIR / f"{name}.json"
        if not self._file.exists():
            self._file.write_text("[]")

    def _load(self) -> list:
        try:
            return json.loads(self._file.read_text(encoding="utf-8"))
        except Exception:
            return []

    def _save(self, docs: list):
        self._file.write_text(
            json.dumps(docs, default=_serial, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    def _matches(self, doc: dict, f: dict) -> bool:
        for k, v in f.items():
            if doc.get(k) != v:
                return False
        return True

    def _apply_projection(self, doc: dict, proj: dict | None) -> dict:
        if not proj:
            return doc
        out = {}
        for k, v in doc.items():
            if k == "_id" and proj.get("_id") == 0:
                continue
            if proj.get(k, 1) != 0:
                out[k] = v
        return out

    # ── write ops ────────────────────────────────────────────────────────────

    async def insert_one(self, doc: dict):
        docs = self._load()
        clean = {k: v for k, v in doc.items() if k != "_id"}
        docs.append(clean)
        self._save(docs)

    async def update_one(self, filter: dict, update: dict, upsert: bool = False):
        docs = self._load()
        for i, doc in enumerate(docs):
            if self._matches(doc, filter):
                if "$set" in update:
                    docs[i].update({k: v for k, v in update["$set"].items() if k != "_id"})
                if "$push" in update:
                    for k, v in update["$push"].items():
                        docs[i].setdefault(k, []).append(v)
                self._save(docs)
                return type("R", (), {"matched_count": 1, "modified_count": 1})()
        if upsert:
            new_doc = dict(filter)
            if "$set" in update:
                new_doc.update(update["$set"])
            if "$push" in update:
                for k, v in update["$push"].items():
                    new_doc.setdefault(k, []).append(v)
            docs.append(new_doc)
            self._save(docs)
        return type("R", (), {"matched_count": 0, "modified_count": 0})()

    async def delete_one(self, filter: dict):
        docs = self._load()
        for i, doc in enumerate(docs):
            if self._matches(doc, filter):
                docs.pop(i)
                self._save(docs)
                return type("R", (), {"deleted_count": 1})()
        return type("R", (), {"deleted_count": 0})()

    # ── read ops ─────────────────────────────────────────────────────────────

    async def find_one(self, filter: dict, projection: dict | None = None):
        for doc in self._load():
            if self._matches(doc, filter):
                return self._apply_projection(doc, projection)
        return None

    def find(self, filter: dict | None = None, projection: dict | None = None):
        return _JsonCursor(self, filter or {}, projection)

    async def count_documents(self, filter: dict | None = None) -> int:
        docs = self._load()
        if not filter:
            return len(docs)
        return sum(1 for d in docs if self._matches(d, filter))

    async def create_index(self, *args, **kwargs):
        pass  # no-op


class _JsonCursor:
    def __init__(self, col: JsonCollection, filter: dict, projection: dict | None):
        self._col = col
        self._filter = filter
        self._proj = projection
        self._sort_key: str | None = None
        self._sort_dir: int = 1
        self._limit_n: int | None = None

    def sort(self, key, direction: int = 1):
        if isinstance(key, list):            # Motor accepts [(field, dir), ...]
            self._sort_key = key[0][0]
            self._sort_dir = key[0][1]
        else:
            self._sort_key = key
            self._sort_dir = direction
        return self

    def limit(self, n: int):
        self._limit_n = n
        return self

    async def to_list(self, length: int | None = None) -> list:
        docs = [
            self._col._apply_projection(d, self._proj)
            for d in self._col._load()
            if self._col._matches(d, self._filter)
        ]
        if self._sort_key:
            docs.sort(
                key=lambda x: (x.get(self._sort_key) is None, x.get(self._sort_key, 0)),
                reverse=(self._sort_dir == -1),
            )
        cap = self._limit_n or length
        return docs[:cap] if cap else docs

    def __aiter__(self):
        self._buf: list | None = None
        self._idx = 0
        return self

    async def __anext__(self):
        if self._buf is None:
            self._buf = await self.to_list()
        if self._idx >= len(self._buf):
            raise StopAsyncIteration
        item = self._buf[self._idx]
        self._idx += 1
        return item


class JsonDB:
    """Drop-in replacement for a Motor database object."""

    def __init__(self):
        self._cols: dict[str, JsonCollection] = {}

    def _col(self, name: str) -> JsonCollection:
        if name not in self._cols:
            self._cols[name] = JsonCollection(name)
        return self._cols[name]

    def __getattr__(self, name: str) -> JsonCollection:
        if name.startswith("_"):
            raise AttributeError(name)
        return self._col(name)

    def __getitem__(self, name: str) -> JsonCollection:
        return self._col(name)
