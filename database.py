"""Database access and initialization for Saigon Street Food Finder.
Zero-dependency SQLite storage for vendors, food info, schedules, and reviews.
"""

import sqlite3
import os
import json
from datetime import datetime

DB_FILE = os.path.join(os.path.dirname(__file__), "streetfood.db")


def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS vendors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        district TEXT NOT NULL,
        address TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        open_time TEXT NOT NULL,
        close_time TEXT NOT NULL,
        open_time_2 TEXT DEFAULT '',
        close_time_2 TEXT DEFAULT '',
        price_min INTEGER DEFAULT 15000,
        price_max INTEGER DEFAULT 35000,
        story TEXT,
        dishes TEXT,
        phone TEXT DEFAULT '',
        image_url TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor_id INTEGER NOT NULL,
        author TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        comment TEXT NOT NULL,
        tags TEXT DEFAULT '',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vendor_id) REFERENCES vendors (id) ON DELETE CASCADE
    )
    """)

    conn.commit()

    # Check if empty, then seed initial street vendors
    cursor.execute("SELECT COUNT(*) FROM vendors")
    count = cursor.fetchone()[0]
    if count == 0:
        seed_initial_data(conn)

    conn.close()


def seed_initial_data(conn):
    cursor = conn.cursor()
    vendors_data = [
        # --- DISTRICT 1 ---
        {
            "name": "Bánh Mì Cụ Bà 82 Tuổi Cô Giang",
            "category": "Bánh mì",
            "district": "Quận 1",
            "address": "Góc hẻm 84 Cô Giang, Phường Cầu Ông Lãnh, Quận 1",
            "latitude": 10.7618,
            "longitude": 106.6942,
            "open_time": "05:30",
            "close_time": "10:30",
            "open_time_2": "15:30",
            "close_time_2": "20:00",
            "price_min": 18000,
            "price_max": 25000,
            "story": "Cụ bà 82 tuổi bán bánh mì vỉa hè hơn 35 năm nay. Đôi tay run run nhưng luôn tỉ mỉ xẻ từng ổ bánh mì giòn tan, phết pate béo ngậy tự nấu mỗi sớm để mưu sinh và nuôi cháu ăn học.",
            "dishes": "Bánh mì pate chả lụa đặc biệt (22k), Bánh mì xíu mại trứng cút (20k), Bánh mì chà bông bơ béo (18k)",
            "phone": "0934 812 791",
            "image_url": "https://images.unsplash.com/photo-1626804475297-41608ea09aeb?w=600&auto=format&fit=crop&q=80"
        },
        {
            "name": "Gánh Xôi Mặn Nếp Dẻo Chú Hùng",
            "category": "Cơm / Bột chiên",
            "district": "Quận 1",
            "address": "Trước cổng trường tiểu học Lương Định Của, Nguyễn Du, Quận 1",
            "latitude": 10.7735,
            "longitude": 106.6972,
            "open_time": "06:00",
            "close_time": "10:00",
            "open_time_2": "",
            "close_time_2": "",
            "price_min": 15000,
            "price_max": 25000,
            "story": "Xe đẩy nhỏ của chú Hùng có mặt từ lúc 6 giờ sáng. Nếp dẻo thơm lừng hành phi, ruốc tôm và lạp xưởng chiên béo ngậy. Giá bình dân cho học sinh sinh viên và người lao động.",
            "dishes": "Xôi mặn thập cẩm lạp xưởng (20k), Xôi gà xé da giòn (25k), Xôi bắp nếp mỡ hành (15k)",
            "phone": "0912 345 882",
            "image_url": "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=600&auto=format&fit=crop&q=80"
        },
        {
            "name": "Hủ Tiếu Gõ Vỉa Hè Đặng Dung Dì Năm",
            "category": "Hủ tiếu / Bún",
            "district": "Quận 1",
            "address": "42 Đặng Dung, Phường Tân Định, Quận 1",
            "latitude": 10.7915,
            "longitude": 106.6888,
            "open_time": "16:30",
            "close_time": "23:30",
            "open_time_2": "",
            "close_time_2": "",
            "price_min": 25000,
            "price_max": 35000,
            "story": "Dì Năm một mình đẩy xe hủ tiếu gõ từ chiều tối đến khuya. Nồi nước lèo hầm xương ngọt thanh tự nhiên, tóp mỡ giòn rụm thơm lừng cả một góc ngã tư.",
            "dishes": "Hủ tiếu mì thịt nạc xá xíu (25k), Hủ tiếu khô sườn non tóp mỡ (35k), Hoành thánh nước súp ngọt (30k)",
            "phone": "0903 891 004",
            "image_url": "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80"
        },
        {
            "name": "Bánh Tráng Trộn & Nướng Chị Thảo Hè Phố",
            "category": "Bánh tráng / Ăn vặt",
            "district": "Quận 1",
            "address": "Vỉa hè góc Pasteur & Hàn Thuyên, Quận 1",
            "latitude": 10.7788,
            "longitude": 106.6985,
            "open_time": "14:00",
            "close_time": "22:00",
            "open_time_2": "",
            "close_time_2": "",
            "price_min": 20000,
            "price_max": 30000,
            "story": "Chị Thảo quê Tây Ninh vào Sài Gòn bán bánh tráng mưu sinh lo cho mẹ già. Bánh tráng cuốn bơ sốt me chua ngọt đậm đà, trứng cút lòng đào dẻo quánh.",
            "dishes": "Bánh tráng trộn bò đen khô mực (25k), Bánh tráng nướng trứng phô mai (25k), Bánh tráng cuốn sốt me cay béo (20k)",
            "phone": "0987 654 311",
            "image_url": "https://images.unsplash.com/photo-1555126634-323283e090fa?w=600&auto=format&fit=crop&q=80"
        },

        # --- DISTRICT 3 ---
        {
            "name": "Chuối Nếp Nướng Nước Cốt Dừa Cô Ba",
            "category": "Chè / Tráng miệng",
            "district": "Quận 3",
            "address": "115 Nguyễn Thượng Hiền, Phường 5, Quận 3",
            "latitude": 10.7765,
            "longitude": 106.6853,
            "open_time": "13:00",
            "close_time": "19:30",
            "open_time_2": "",
            "close_time_2": "",
            "price_min": 15000,
            "price_max": 20000,
            "story": "Cô Ba gắn bó với lò than nướng chuối thơm nức mũi cả góc đường hơn 20 năm. Chuối sứ ngọt lịm bọc nếp than dẻo cháy sém, chan đẫm nước cốt dừa béo ngậy rắc mè rang thơm phức.",
            "dishes": "Chuối nếp nướng nước cốt dừa bột báng (18k), Chuối nướng mỡ hành (15k), Bánh chuối hấp nước cốt dừa (15k)",
            "phone": "0918 223 901",
            "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80"
        },
        {
            "name": "Bột Chiên Trứng Hẻm Chợ Bàn Cờ Cụ Tư",
            "category": "Cơm / Bột chiên",
            "district": "Quận 3",
            "address": "Đầu hẻm 212 Nguyễn Thiện Thuật (Khu chợ Bàn Cờ), Phường 3, Quận 3",
            "latitude": 10.7685,
            "longitude": 106.6795,
            "open_time": "15:00",
            "close_time": "22:00",
            "open_time_2": "",
            "close_time_2": "",
            "price_min": 25000,
            "price_max": 35000,
            "story": "Cụ Tư lưng đã còng vẫn đứng chảo gang chiên từng mẻ bột chiên giòn rụm bên ngoài mềm dẻo bên trong. Nước tương pha giấm đỏ chua ngọt cùng đu đủ bào sợi dòn sần sật.",
            "dishes": "Bột chiên 2 trứng ốp la (30k), Bột chiên khoai môn giòn rụm (35k), Há cảo chiên giòn (25k)",
            "phone": "0932 771 450",
            "image_url": "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80"
        },
        {
            "name": "Bún Riêu Cua Đồng Vỉa Hè Chợ Vườn Chuối",
            "category": "Hủ tiếu / Bún",
            "district": "Quận 3",
            "address": "48 Vườn Chuối, Phường 4, Quận 3",
            "latitude": 10.7735,
            "longitude": 106.6828,
            "open_time": "06:30",
            "close_time": "12:00",
            "open_time_2": "",
            "close_time_2": "",
            "price_min": 30000,
            "price_max": 40000,
            "story": "Quầy bún riêu vỉa hè của bà Mười đơn sơ với 4 chiếc bàn nhựa. Nồi nước dùng đỏ au màu cà chua tươi, riêu cua đồng xốp mềm thơm phức mùi mắm tôm nguyên chất.",
            "dishes": "Tô bún riêu cua đậu hũ chả lụa (30k), Bún riêu giò nạc huyết mềm (38k), Bún ốc riêu cua chua thanh (35k)",
            "phone": "0909 512 876",
            "image_url": "https://images.unsplash.com/photo-1594998893017-36147cbcae05?w=600&auto=format&fit=crop&q=80"
        },
        {
            "name": "Chè Mè Đen & Sủi Dìn Ông Ba Lộ",
            "category": "Chè / Tráng miệng",
            "district": "Quận 3",
            "address": "Hẻm 453 Lê Văn Sỹ, Phường 12, Quận 3",
            "latitude": 10.7872,
            "longitude": 106.6775,
            "open_time": "16:00",
            "close_time": "22:00",
            "open_time_2": "",
            "close_time_2": "",
            "price_min": 15000,
            "price_max": 25000,
            "story": "Chiếc xe chè nhỏ của ông Ba Lộ người Hoa truyền thống. Món chè mè đen (chí mà phù) sánh mịn ấm bụng và sủi dìn nhân đậu phộng gừng cay ấm giải cảm rất tốt.",
            "dishes": "Chè mè đen nóng thơm bùi (15k), Sủi dìn nước gừng ấm nồng (20k), Chè hạt sen nhãn nhục thanh mát (25k)",
            "phone": "0971 228 119",
            "image_url": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80"
        },

        # --- DISTRICT 10 ---
        {
            "name": "Hủ Tiếu Gõ Đêm Hai Vợ Chồng Khiếm Thị Chú Bảy",
            "category": "Hủ tiếu / Bún",
            "district": "Quận 10",
            "address": "Trước số 382 Sư Vạn Hạnh, Phường 2, Quận 10",
            "latitude": 10.7681,
            "longitude": 106.6698,
            "open_time": "17:00",
            "close_time": "01:30",
            "open_time_2": "",
            "close_time_2": "",
            "price_min": 22000,
            "price_max": 30000,
            "story": "Hai vợ chồng chú Bảy khiếm thị nhưng cực kỳ cần mẫn và hiền lành. Tiếng gõ lóc cóc quen thuộc của hai vợ chồng suốt 18 năm nuôi con gái lớn học đại học. Hủ tiếu thịt xắt mỏng, tóp mỡ thơm béo.",
            "dishes": "Hủ tiếu gõ thịt xá xíu tóp mỡ (22k), Hủ tiếu mì khô sốt tương đen (25k), Bò viên gân chấm tương ớt (30k)",
            "phone": "0902 441 933",
            "image_url": "https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=600&auto=format&fit=crop&q=80"
        },
        {
            "name": "Bánh Tằm Bì Nước Cốt Dừa Chợ Hoa Hồ Thị Kỷ",
            "category": "Bánh tráng / Ăn vặt",
            "district": "Quận 10",
            "address": "Khu ẩm thực Chợ Hoa Hồ Thị Kỷ (Ngõ vào từ Lý Thái Tổ), Phường 1, Quận 10",
            "latitude": 10.7665,
            "longitude": 106.6748,
            "open_time": "14:30",
            "close_time": "21:30",
            "open_time_2": "",
            "close_time_2": "",
            "price_min": 25000,
            "price_max": 35000,
            "story": "Cô Sáu quê miền Tây mang gánh bánh tằm bì lên Sài Gòn. Sợi bánh tằm to mềm dẻo, bì heo thính thơm ngào ngạt, rau thơm dưa leo và nước cốt dừa sánh mịn chan nước mắm chua ngọt độc đáo.",
            "dishes": "Dĩa bánh tằm bì xíu mại đầy đủ (30k), Bánh tằm bì chả giò giòn (35k), Nem nướng lụi than hồng (25k)",
            "phone": "0915 889 231",
            "image_url": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80"
        },
        {
            "name": "Súp Cua Trứng Bắc Thảo Chị Liên Chợ Thiếc",
            "category": "Ăn vặt / Khác",
            "district": "Quận 10",
            "address": "Góc Bà Hạt & Vĩnh Viễn, Phường 8, Quận 10",
            "latitude": 10.7621,
            "longitude": 106.6642,
            "open_time": "14:00",
            "close_time": "20:30",
            "open_time_2": "",
            "close_time_2": "",
            "price_min": 20000,
            "price_max": 35000,
            "story": "Nồi súp cua bốc khói nghi ngút đặc quánh thịt cua xé, nấm tuyết giòn sần sật và trứng cút. Chị Liên luôn tươi cười niềm nở dù cuộc sống còn nhiều khó khăn, bán rẻ cho các bạn học sinh quanh vùng.",
            "dishes": "Tô súp cua trứng bắc thảo béo ngậy (30k), Súp cua óc heo bổ dưỡng (35k), Súp cua truyền thống nấm đông cô (20k)",
            "phone": "0983 456 128",
            "image_url": "https://images.unsplash.com/photo-1547496502-affa22d38842?w=600&auto=format&fit=crop&q=80"
        },
        {
            "name": "Bánh Xèo Vỉa Hè Miền Trung Má Bảy Ngô Gia Tự",
            "category": "Cơm / Bột chiên",
            "district": "Quận 10",
            "address": "Hẻm 357 Ngô Gia Tự, Phường 3, Quận 10",
            "latitude": 10.7638,
            "longitude": 106.6675,
            "open_time": "15:30",
            "close_time": "21:00",
            "open_time_2": "",
            "close_time_2": "",
            "price_min": 10000,
            "price_max": 25000,
            "story": "Bốn chiếc khuôn đất nung đượm lửa than của Má Bảy đổ bánh xèo miền Trung vỏ giòn rụm, nhân tôm tươi nhảy tanh tách và giá đỗ ngọt lành. Rổ rau rừng xanh tươi chấm mắm nêm đậm đà.",
            "dishes": "Bánh xèo tôm thịt giòn rụm (12k/cái), Bánh khọt nước cốt dừa (25k/đĩa 8 cái), Chả ram tôm đất giòn tan (20k)",
            "phone": "0944 123 990",
            "image_url": "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600&auto=format&fit=crop&q=80"
        }
    ]

    for v in vendors_data:
        cursor.execute("""
            INSERT INTO vendors (name, category, district, address, latitude, longitude,
                                open_time, close_time, open_time_2, close_time_2,
                                price_min, price_max, story, dishes, phone, image_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            v["name"], v["category"], v["district"], v["address"], v["latitude"], v["longitude"],
            v["open_time"], v["close_time"], v["open_time_2"], v["close_time_2"],
            v["price_min"], v["price_max"], v["story"], v["dishes"], v["phone"], v["image_url"]
        ))
        vendor_id = cursor.lastrowid

        # Insert some warm community reviews
        sample_reviews = [
            ("Hương Giang", 5, "Món ăn ngon và sạch sẽ lắm ạ! Cụ bà rất hiền hậu, lần nào ghé cũng cho thêm bánh mì giòn.", "Ngon bổ rẻ, Cụ bà dễ thương"),
            ("Tuấn Kiệt", 5, "Ủng hộ cô chú hết mình. Hương vị đường phố đích thực của Sài Gòn, giá cả quá hạt dẻ.", "Ủng hộ hết mình, Hương vị tuổi thơ"),
            ("Ngọc Mai", 4, "Đồ ăn nêm nếm rất vừa vị. Mọi người ở gần ghé ủng hộ để cô chú bớt vất vả nhé!", "Ngon sạch, Đậm đà")
        ]
        for author, rating, comment, tags in sample_reviews:
            cursor.execute("""
                INSERT INTO reviews (vendor_id, author, rating, comment, tags)
                VALUES (?, ?, ?, ?, ?)
            """, (vendor_id, author, rating, comment, tags))

    conn.commit()


# --- CRUD Functions ---

def get_vendors(district=None, category=None, search=None):
    conn = get_db()
    cursor = conn.cursor()

    query = """
    SELECT v.*, 
           COUNT(r.id) as review_count, 
           COALESCE(AVG(r.rating), 5.0) as avg_rating
    FROM vendors v
    LEFT JOIN reviews r ON v.id = r.vendor_id
    WHERE 1=1
    """
    params = []

    if district and district != "Tất cả":
        query += " AND v.district = ?"
        params.append(district)

    if category and category != "Tất cả":
        query += " AND v.category = ?"
        params.append(category)

    if search:
        search_term = f"%{search}%"
        query += " AND (v.name LIKE ? OR v.dishes LIKE ? OR v.address LIKE ? OR v.story LIKE ?)"
        params.extend([search_term, search_term, search_term, search_term])

    query += " GROUP BY v.id ORDER BY v.id DESC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    vendors = [dict(row) for row in rows]
    conn.close()
    return vendors


def get_vendor_by_id(vendor_id):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
    SELECT v.*, 
           COUNT(r.id) as review_count, 
           COALESCE(AVG(r.rating), 5.0) as avg_rating
    FROM vendors v
    LEFT JOIN reviews r ON v.id = r.vendor_id
    WHERE v.id = ?
    GROUP BY v.id
    """, (vendor_id,))
    vendor_row = cursor.fetchone()

    if not vendor_row:
        conn.close()
        return None

    vendor = dict(vendor_row)

    cursor.execute("""
    SELECT id, author, rating, comment, tags, created_at 
    FROM reviews 
    WHERE vendor_id = ? 
    ORDER BY id DESC
    """, (vendor_id,))
    reviews = [dict(r) for r in cursor.fetchall()]
    vendor["reviews"] = reviews

    conn.close()
    return vendor


def create_vendor(data):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO vendors (name, category, district, address, latitude, longitude,
                            open_time, close_time, open_time_2, close_time_2,
                            price_min, price_max, story, dishes, phone, image_url)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get("name", "").strip(),
        data.get("category", "Khác"),
        data.get("district", "Quận 1"),
        data.get("address", "").strip(),
        float(data.get("latitude", 10.7765)),
        float(data.get("longitude", 106.6853)),
        data.get("open_time", "06:00"),
        data.get("close_time", "11:00"),
        data.get("open_time_2", ""),
        data.get("close_time_2", ""),
        int(data.get("price_min", 15000)),
        int(data.get("price_max", 35000)),
        data.get("story", "").strip(),
        data.get("dishes", "").strip(),
        data.get("phone", "").strip(),
        data.get("image_url", "").strip() or "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&auto=format&fit=crop&q=80"
    ))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return get_vendor_by_id(new_id)


def update_vendor(vendor_id, data):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE vendors 
        SET name = ?, category = ?, district = ?, address = ?, latitude = ?, longitude = ?,
            open_time = ?, close_time = ?, open_time_2 = ?, close_time_2 = ?,
            price_min = ?, price_max = ?, story = ?, dishes = ?, phone = ?, image_url = ?
        WHERE id = ?
    """, (
        data.get("name", "").strip(),
        data.get("category", "Khác"),
        data.get("district", "Quận 1"),
        data.get("address", "").strip(),
        float(data.get("latitude", 10.7765)),
        float(data.get("longitude", 106.6853)),
        data.get("open_time", "06:00"),
        data.get("close_time", "11:00"),
        data.get("open_time_2", ""),
        data.get("close_time_2", ""),
        int(data.get("price_min", 15000)),
        int(data.get("price_max", 35000)),
        data.get("story", "").strip(),
        data.get("dishes", "").strip(),
        data.get("phone", "").strip(),
        data.get("image_url", "").strip(),
        vendor_id
    ))
    conn.commit()
    conn.close()
    return get_vendor_by_id(vendor_id)


def delete_vendor(vendor_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM vendors WHERE id = ?", (vendor_id,))
    cursor.execute("DELETE FROM reviews WHERE vendor_id = ?", (vendor_id,))
    conn.commit()
    deleted = cursor.rowcount > 0
    conn.close()
    return deleted


def add_review(vendor_id, review_data):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO reviews (vendor_id, author, rating, comment, tags)
        VALUES (?, ?, ?, ?, ?)
    """, (
        vendor_id,
        review_data.get("author", "Thực khách ấm lòng").strip() or "Thực khách ấm lòng",
        int(review_data.get("rating", 5)),
        review_data.get("comment", "").strip(),
        review_data.get("tags", "").strip()
    ))
    review_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return review_id


def get_stats():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM vendors")
    total_vendors = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM reviews")
    total_reviews = cursor.fetchone()[0]

    cursor.execute("SELECT district, COUNT(*) FROM vendors GROUP BY district")
    by_district = dict(cursor.fetchall())

    cursor.execute("SELECT category, COUNT(*) FROM vendors GROUP BY category")
    by_category = dict(cursor.fetchall())

    conn.close()
    return {
        "total_vendors": total_vendors,
        "total_reviews": total_reviews,
        "by_district": by_district,
        "by_category": by_category
    }
