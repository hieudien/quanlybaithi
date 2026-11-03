"""Server tĩnh cho demo, tắt cache để sửa file là thấy ngay. Chạy: python serve.py"""
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


ThreadingHTTPServer(("", 5173), functools.partial(NoCache, directory="demo")).serve_forever()
