"""Load 30+ Vietnamese prompts into the database.

Usage:
    python seed_prompts.py

Requires a running MySQL instance with the arena database and prompts table.
"""

from __future__ import annotations

import asyncio
import sys

from sqlalchemy import text

from app.database import async_session_factory, engine

# ---------------------------------------------------------------------------
# Seed data: 36 Vietnamese prompts across 6 categories
# ---------------------------------------------------------------------------

PROMPTS = [
    # --- Knowledge (6) ---
    ("Giải thích lý thuyết tương đối cho học sinh lớp 10", "knowledge"),
    ("Tóm tắt lịch sử Việt Nam từ thời Hùng Vương đến thời Lý", "knowledge"),
    ("Mô tả cấu trúc tế bào thực vật và chức năng của từng bộ phận", "knowledge"),
    ("Giải thích nguyên lý hoạt động của máy phát điện", "knowledge"),
    ("Trình bày các giai đoạn chính của cuộc Cách mạng Công nghiệp lần thứ 4", "knowledge"),
    ("Phân biệt giữa kinh tế thị trường và kinh tế kế hoạch", "knowledge"),

    # --- Reasoning (6) ---
    ("Phân tích câu tục ngữ 'Một cây làm chẳng nên non, ba cây chụm lại nên hòn núi cao'", "reasoning"),
    ("Nếu tất cả mèo đều là động vật và một số động vật biết bơi, liệu có thể kết luận rằng một số mèo biết bơi không? Giải thích.", "reasoning"),
    ("So sánh ưu và nhược điểm của năng lượng mặt trời với năng lượng hạt nhân cho Việt Nam", "reasoning"),
    ("Một cửa hàng giảm giá 20%, sau đó tăng giá 20%. Giá cuối cùng có bằng giá ban đầu không? Giải thích.", "reasoning"),
    ("Phân tích nguyên nhân và hệ quả của hiện tượng chảy máu chất xám ở Việt Nam", "reasoning"),
    ("Đánh giá tác động của trí tuệ nhân tạo đến thị trường lao động Việt Nam trong 10 năm tới", "reasoning"),

    # --- Cultural (6) ---
    ("So sánh kiến trúc chùa Việt Nam và chùa Nhật Bản", "cultural"),
    ("Giải thích ý nghĩa của phong tục gói bánh chưng ngày Tết", "cultural"),
    ("Mô tả sự khác biệt giữa áo dài truyền thống và áo dài hiện đại", "cultural"),
    ("Phân tích vai trò của nước mắm trong ẩm thực Việt Nam", "cultural"),
    ("Giải thích tầm quan trọng của lễ hội Trung Thu trong văn hóa Việt Nam", "cultural"),
    ("So sánh nghệ thuật ca trù và nghệ thuật hát chèo", "cultural"),

    # --- Creative (6) ---
    ("Viết một bài thơ lục bát về mùa xuân ở Hà Nội", "creative"),
    ("Sáng tác một câu chuyện ngắn về một robot biết yêu thương", "creative"),
    ("Viết lời bài hát về tuổi trẻ Việt Nam trong thời đại số", "creative"),
    ("Tưởng tượng và mô tả Sài Gòn năm 2050", "creative"),
    ("Viết một đoạn hội thoại hài hước giữa Sơn Tinh và Thủy Tinh trong thời hiện đại", "creative"),
    ("Sáng tác một bài haiku bằng tiếng Việt về cà phê sáng ở Đà Lạt", "creative"),

    # --- Coding (6) ---
    ("Viết hàm Python sắp xếp danh sách bằng thuật toán quicksort, có giải thích từng bước", "coding"),
    ("Tạo một component React hiển thị bảng xếp hạng với sắp xếp và lọc", "coding"),
    ("Viết truy vấn SQL tìm 5 sản phẩm bán chạy nhất trong tháng, kèm giải thích", "coding"),
    ("Thiết kế API REST cho hệ thống quản lý thư viện bằng tiếng Việt", "coding"),
    ("Viết script Python để crawl giá vàng từ trang web và lưu vào CSV", "coding"),
    ("Giải thích thuật toán Dijkstra bằng tiếng Việt và viết code minh họa", "coding"),

    # --- Instruction Following (6) ---
    ("Hướng dẫn từng bước cách nấu phở bò Hà Nội đúng vị", "instruction"),
    ("Tạo kế hoạch du lịch Đà Nẵng 3 ngày 2 đêm cho gia đình 4 người, ngân sách 10 triệu VNĐ", "instruction"),
    ("Liệt kê 10 mẹo tiết kiệm điện cho hộ gia đình Việt Nam, sắp xếp theo hiệu quả", "instruction"),
    ("Viết email xin việc bằng tiếng Việt cho vị trí kỹ sư phần mềm, có sáng tạo nhưng chuyên nghiệp", "instruction"),
    ("Tạo checklist chuẩn bị hồ sơ du học Mỹ cho sinh viên Việt Nam", "instruction"),
    ("Hướng dẫn cách trồng và chăm sóc cây bonsai cho người mới bắt đầu", "instruction"),
]


async def seed():
    """Insert all prompts into the database (idempotent — skips existing)."""
    async with async_session_factory() as session:
        async with session.begin():
            for prompt_text, category in PROMPTS:
                # Check if prompt already exists
                result = await session.execute(
                    text("SELECT id FROM prompts WHERE text = :text"),
                    {"text": prompt_text},
                )
                if result.fetchone():
                    continue

                await session.execute(
                    text("""
                        INSERT INTO prompts (text, category, created_at)
                        VALUES (:text, :category, NOW())
                    """),
                    {"text": prompt_text, "category": category},
                )

    print(f"Seeded {len(PROMPTS)} prompts across 6 categories")


async def main():
    try:
        await seed()
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
