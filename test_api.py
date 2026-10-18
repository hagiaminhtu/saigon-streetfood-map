"""Automated tests for Saigon Street Food REST API and Database."""

import unittest
import database


class TestStreetFoodDB(unittest.TestCase):
    def setUp(self):
        database.init_db()

    def test_01_initial_seed(self):
        vendors = database.get_vendors()
        self.assertGreaterEqual(len(vendors), 12, "Should have at least 12 initial street vendors")
        
        # Verify required districts exist
        districts = {v["district"] for v in vendors}
        self.assertIn("Quận 1", districts)
        self.assertIn("Quận 3", districts)
        self.assertIn("Quận 10", districts)

    def test_02_filtering(self):
        q1_vendors = database.get_vendors(district="Quận 1")
        self.assertTrue(all(v["district"] == "Quận 1" for v in q1_vendors))
        self.assertGreaterEqual(len(q1_vendors), 1)

        bm_vendors = database.get_vendors(category="Bánh mì")
        self.assertTrue(all(v["category"] == "Bánh mì" for v in bm_vendors))
        self.assertGreaterEqual(len(bm_vendors), 1)

        search_res = database.get_vendors(search="Cô Giang")
        self.assertGreaterEqual(len(search_res), 1)
        self.assertIn("Cô Giang", search_res[0]["address"] + search_res[0]["name"])

    def test_03_crud_vendor(self):
        new_data = {
            "name": "Quán Bún Bò Vỉa Hè Mẹ Lan",
            "category": "Hủ tiếu / Bún",
            "district": "Quận 3",
            "address": "Hẻm 300 Cách Mạng Tháng 8, Quận 3",
            "latitude": 10.7812,
            "longitude": 106.6791,
            "open_time": "06:00",
            "close_time": "11:00",
            "price_min": 30000,
            "price_max": 40000,
            "story": "Quán bún bò lâu năm bán buổi sáng nước lèo thơm mùi sả.",
            "dishes": "Bún bò tái nạm gân (35k), Bún bắp bò giò heo (40k)",
            "phone": "0909 999 888",
            "image_url": "https://images.unsplash.com/photo-1594998893017-36147cbcae05"
        }
        created = database.create_vendor(new_data)
        self.assertIsNotNone(created)
        self.assertEqual(created["name"], new_data["name"])
        vendor_id = created["id"]

        # Update
        new_data["name"] = "Quán Bún Bò Huế Mẹ Lan Đậm Đà"
        updated = database.update_vendor(vendor_id, new_data)
        self.assertEqual(updated["name"], "Quán Bún Bò Huế Mẹ Lan Đậm Đà")

        # Add review
        rev_id = database.add_review(vendor_id, {
            "author": "Minh Khang",
            "rating": 5,
            "comment": "Ngon tuyệt vời!",
            "tags": "Đậm đà, Bổ rẻ"
        })
        self.assertIsNotNone(rev_id)

        # Check vendor has review
        fetched = database.get_vendor_by_id(vendor_id)
        self.assertGreaterEqual(fetched["review_count"], 1)
        self.assertEqual(len(fetched["reviews"]), 1)
        self.assertEqual(fetched["reviews"][0]["author"], "Minh Khang")

        # Delete
        deleted = database.delete_vendor(vendor_id)
        self.assertTrue(deleted)
        self.assertIsNone(database.get_vendor_by_id(vendor_id))

    def test_04_stats(self):
        stats = database.get_stats()
        self.assertIn("total_vendors", stats)
        self.assertIn("total_reviews", stats)
        self.assertIn("by_district", stats)
        self.assertIn("by_category", stats)
        self.assertGreaterEqual(stats["total_vendors"], 12)


if __name__ == "__main__":
    unittest.main()
