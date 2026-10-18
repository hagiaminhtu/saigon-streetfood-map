"""HTTP and REST API Server for Saigon Street Food Finder.
Zero-dependency Python 3 server supporting static assets & CRUD API.
"""

import sys
import os
import json
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler
import database

PORT = 8080
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")


class StreetFoodHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def _send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            if content_length <= 0:
                return {}
            raw = self.rfile.read(content_length).decode("utf-8")
            return json.loads(raw)
        except Exception as e:
            print("Error reading JSON body:", e)
            return {}

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # API Routes
        if path == "/api/vendors":
            district = query.get("district", [None])[0]
            category = query.get("category", [None])[0]
            search = query.get("search", [None])[0]
            vendors = database.get_vendors(district=district, category=category, search=search)
            return self._send_json({"success": True, "vendors": vendors})

        elif path.startswith("/api/vendors/"):
            parts = path.strip("/").split("/")
            if len(parts) == 3 and parts[2].isdigit():
                vendor_id = int(parts[2])
                vendor = database.get_vendor_by_id(vendor_id)
                if vendor:
                    return self._send_json({"success": True, "vendor": vendor})
                return self._send_json({"error": "Vendor not found"}, status=404)

        elif path == "/api/stats":
            stats = database.get_stats()
            return self._send_json({"success": True, "stats": stats})

        # Static file fallback for root
        if path == "/" or path == "":
            self.path = "/index.html"

        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/vendors":
            body = self._read_json_body()
            if not body.get("name") or not body.get("address"):
                return self._send_json({"error": "Tên và địa chỉ không được để trống"}, status=400)
            created = database.create_vendor(body)
            return self._send_json({"success": True, "vendor": created}, status=201)

        elif path.startswith("/api/vendors/") and path.endswith("/reviews"):
            # /api/vendors/<id>/reviews
            parts = path.strip("/").split("/")
            if len(parts) == 4 and parts[2].isdigit():
                vendor_id = int(parts[2])
                body = self._read_json_body()
                if not body.get("comment"):
                    return self._send_json({"error": "Nội dung nhận xét không được để trống"}, status=400)
                review_id = database.add_review(vendor_id, body)
                updated = database.get_vendor_by_id(vendor_id)
                return self._send_json({"success": True, "review_id": review_id, "vendor": updated}, status=201)

        elif path == "/api/reset":
            # Reset database to initial seed
            conn = database.get_db()
            cursor = conn.cursor()
            cursor.execute("DROP TABLE IF EXISTS reviews")
            cursor.execute("DROP TABLE IF EXISTS vendors")
            conn.commit()
            conn.close()
            database.init_db()
            return self._send_json({"success": True, "message": "Đã khôi phục dữ liệu ban đầu"})

        return self._send_json({"error": "Not Found"}, status=404)

    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/vendors/"):
            parts = path.strip("/").split("/")
            if len(parts) == 3 and parts[2].isdigit():
                vendor_id = int(parts[2])
                body = self._read_json_body()
                updated = database.update_vendor(vendor_id, body)
                if updated:
                    return self._send_json({"success": True, "vendor": updated})
                return self._send_json({"error": "Vendor not found"}, status=404)

        return self._send_json({"error": "Not Found"}, status=404)

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/vendors/"):
            parts = path.strip("/").split("/")
            if len(parts) == 3 and parts[2].isdigit():
                vendor_id = int(parts[2])
                deleted = database.delete_vendor(vendor_id)
                if deleted:
                    return self._send_json({"success": True, "message": "Đã xóa địa điểm"})
                return self._send_json({"error": "Vendor not found"}, status=404)

        return self._send_json({"error": "Not Found"}, status=404)


def run_server(port=PORT):
    database.init_db()
    server_address = ("", port)
    httpd = HTTPServer(server_address, StreetFoodHandler)
    print(f"=====================================================")
    print(f" Sài Gòn Street Food Map Server is running!")
    print(f" URL: http://localhost:{port}")
    print(f" Districts covered: Quận 1, Quận 3, Quận 10 (TP.HCM)")
    print(f" Press Ctrl+C to stop.")
    print(f"=====================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else PORT
    run_server(port)
