"""In-memory unit test for StreetFoodHandler without requiring network sockets."""

import io
import json
import unittest
import database
from server import StreetFoodHandler

class MockSocket:
    def __init__(self, data=b""):
        self.rfile = io.BytesIO(data)
        self.output_buffer = io.BytesIO()

    def makefile(self, mode, *args, **kwargs):
        if "r" in mode:
            return self.rfile
        elif "w" in mode:
            return self.output_buffer
        raise ValueError(f"Unknown mode: {mode}")

    def sendall(self, b):
        self.output_buffer.write(b)

    def send(self, b):
        self.output_buffer.write(b)
        return len(b)

def make_request(method, path, body_dict=None):
    body_bytes = b""
    headers = f"{method} {path} HTTP/1.1\r\nHost: localhost\r\n"
    if body_dict is not None:
        body_bytes = json.dumps(body_dict).encode("utf-8")
        headers += f"Content-Type: application/json\r\nContent-Length: {len(body_bytes)}\r\n"
    headers += "\r\n"

    raw_input = headers.encode("utf-8") + body_bytes
    mock_sock = MockSocket(raw_input)

    # Invoke handler without starting socket server
    handler = StreetFoodHandler(mock_sock, ("127.0.0.1", 12345), None)
    
    # Parse written response
    mock_sock.output_buffer.seek(0)
    raw_response = mock_sock.output_buffer.read()
    
    # Split headers and body
    parts = raw_response.split(b"\r\n\r\n", 1)
    header_part = parts[0].decode("utf-8", errors="ignore")
    status_line = header_part.splitlines()[0]
    status_code = int(status_line.split()[1])
    
    body_content = parts[1] if len(parts) > 1 else b""
    try:
        json_data = json.loads(body_content.decode("utf-8"))
    except:
        json_data = None

    return status_code, json_data, body_content

class TestStreetFoodHandler(unittest.TestCase):
    def setUp(self):
        database.init_db()

    def test_get_vendors_api(self):
        status, data, _ = make_request("GET", "/api/vendors")
        self.assertEqual(status, 200)
        self.assertTrue(data["success"])
        self.assertGreaterEqual(len(data["vendors"]), 12)

    def test_get_vendors_filtered(self):
        status, data, _ = make_request("GET", "/api/vendors?district=Qu%E1%BA%ADn%201")
        self.assertEqual(status, 200)
        self.assertTrue(data["success"])
        self.assertTrue(all(v["district"] == "Quận 1" for v in data["vendors"]))

    def test_create_and_delete_vendor(self):
        # 1. Create
        payload = {
            "name": "Bánh Mì Chả Cá Chú Út",
            "category": "Bánh mì",
            "district": "Quận 10",
            "address": "402 Nguyễn Tri Phương, Quận 10",
            "latitude": 10.7650,
            "longitude": 106.6670,
            "open_time": "06:00",
            "close_time": "10:30",
            "price_min": 15000,
            "price_max": 25000,
            "story": "Chú Út chiên chả cá nóng hổi giòn rụm kẹp bánh mì giòn tan.",
            "dishes": "Bánh mì chả cá sợi (20k), Bánh mì chả cá trứng ốp la (25k)",
            "phone": "0918 111 222",
            "image_url": "https://images.unsplash.com/photo-1626804475297-41608ea09aeb?w=600"
        }
        status, data, _ = make_request("POST", "/api/vendors", payload)
        self.assertEqual(status, 201)
        self.assertTrue(data["success"])
        vendor_id = data["vendor"]["id"]
        self.assertEqual(data["vendor"]["name"], payload["name"])

        # 2. Add review
        rev_payload = {
            "author": "Trần Thắng",
            "rating": 5,
            "comment": "Chả cá thơm lừng hạt tiêu, rất ngon!",
            "tags": "Ngon bổ rẻ"
        }
        status, data, _ = make_request("POST", f"/api/vendors/{vendor_id}/reviews", rev_payload)
        self.assertEqual(status, 201)
        self.assertTrue(data["success"])
        self.assertEqual(len(data["vendor"]["reviews"]), 1)

        # 3. Update
        payload["name"] = "Bánh Mì Chả Cá Nóng Giòn Chú Út"
        status, data, _ = make_request("PUT", f"/api/vendors/{vendor_id}", payload)
        self.assertEqual(status, 200)
        self.assertEqual(data["vendor"]["name"], "Bánh Mì Chả Cá Nóng Giòn Chú Út")

        # 4. Delete
        status, data, _ = make_request("DELETE", f"/api/vendors/{vendor_id}")
        self.assertEqual(status, 200)
        self.assertTrue(data["success"])

    def test_stats(self):
        status, data, _ = make_request("GET", "/api/stats")
        self.assertEqual(status, 200)
        self.assertIn("total_vendors", data["stats"])

    def test_static_html(self):
        status, _, raw = make_request("GET", "/")
        self.assertEqual(status, 200)
        html = raw.decode("utf-8")
        self.assertIn("Ấm Lòng Sài Gòn", html)
        self.assertIn("Quận 1", html)
        self.assertIn("Quận 3", html)
        self.assertIn("Quận 10", html)

if __name__ == "__main__":
    unittest.main()
