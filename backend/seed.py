"""Seed the database with models, prompts, and pre-computed responses."""
import asyncio
import aiosqlite
from config import DATABASE_PATH
from database import init_db

MODELS = [
    ("claude-opus", "Claude Opus 4.6", "Anthropic", "prop", "#8b5cf6"),
    ("gpt-5", "GPT-5", "OpenAI", "prop", "#10b981"),
    ("gemini-pro", "Gemini 3 Pro", "Google", "prop", "#3b82f6"),
    ("gemini-flash", "Gemini 3 Flash", "Google", "prop", "#06b6d4"),
    ("claude-sonnet", "Claude Sonnet 4.6", "Anthropic", "prop", "#a78bfa"),
    ("grok-4", "Grok 4", "xAI", "prop", "#f97316"),
    ("deepseek", "DeepSeek V3.2", "DeepSeek", "open", "#14b8a6"),
    ("llama-4", "Llama 4 Maverick", "Meta", "open", "#6366f1"),
    ("qwen-35", "Qwen 3.5", "Alibaba", "open", "#ec4899"),
    ("glm-5", "GLM-5", "Zhipu AI", "open", "#ef4444"),
    ("kimi-k25", "Kimi K2.5", "Moonshot AI", "open", "#f59e0b"),
    ("mistral-l2", "Mistral Large 2", "Mistral AI", "open", "#78716c"),
]

PROMPTS = [
    ("Giải thích blockchain cho học sinh lớp 10", "knowledge"),
    ("Viết bài thơ lục bát về mùa xuân Hà Nội", "creative"),
    ("Tại sao kinh tế Việt Nam tăng trưởng nhanh hơn dự kiến?", "reasoning"),
    ("Viết hàm Python sắp xếp tên tiếng Việt theo alphabet", "coding"),
    ("So sánh phở Hà Nội và phở Sài Gòn", "culture"),
    ("Viết email xin nghỉ phép gửi sếp bằng giọng lịch sự", "professional"),
    ("Tóm tắt hiệp định Geneva 1954 trong 5 câu", "knowledge"),
    ("Viết truyện ngắn kinh dị lấy bối cảnh Đà Lạt", "creative"),
    ("Phân tích điểm mạnh và yếu của VinFast trên thị trường quốc tế", "reasoning"),
]

# Pre-computed responses (2-4 model responses per prompt)
RESPONSES = {
    1: {  # blockchain
        "claude-opus": "Blockchain là một cơ sở dữ liệu phân tán, hoạt động như một cuốn sổ cái kỹ thuật số được chia sẻ giữa nhiều máy tính. Hãy tưởng tượng bạn có một cuốn sổ ghi chép mà cả lớp đều có bản sao giống hệt nhau — không ai có thể tự ý sửa mà mọi người không biết.\n\nMỗi \"khối\" (block) chứa thông tin giao dịch và được nối với khối trước đó bằng mã hóa, tạo thành một \"chuỗi\" (chain). Điều này khiến việc giả mạo dữ liệu gần như không thể.\n\n**Ứng dụng thực tế:** Bitcoin, hợp đồng thông minh, quản lý chuỗi cung ứng.",
        "gpt-5": "Blockchain giống như một cuốn nhật ký mà ai cũng đọc được nhưng không ai xóa hay sửa được.\n\nVề cơ bản, đây là công nghệ lưu trữ thông tin theo chuỗi các khối dữ liệu. Mỗi khối được bảo mật bằng mật mã và liên kết với khối trước — tạo thành chuỗi không thể phá vỡ.\n\n**3 đặc điểm nổi bật:**\n1. Phi tập trung: không cần ngân hàng hay bên trung gian\n2. Minh bạch: mọi giao dịch đều công khai\n3. Bất biến: dữ liệu đã ghi không thể thay đổi\n\nVí dụ đời thường: Bitcoin dùng blockchain để chuyển tiền trực tiếp giữa hai người.",
        "gemini-pro": "Hãy hình dung blockchain như một cuốn sổ kế toán khổng lồ mà hàng triệu người cùng giữ bản sao. Mỗi khi có giao dịch mới, tất cả bản sao đều được cập nhật đồng thời.\n\n**Cách hoạt động đơn giản:**\n- Bước 1: Ai đó yêu cầu giao dịch (ví dụ: chuyển tiền)\n- Bước 2: Giao dịch được gửi đến mạng lưới máy tính\n- Bước 3: Các máy tính xác nhận giao dịch hợp lệ\n- Bước 4: Giao dịch được đóng vào \"khối\" mới\n- Bước 5: Khối được nối vào chuỗi — không ai sửa được nữa\n\nĐiểm hay nhất: không cần tin tưởng ai cả, vì toán học đảm bảo mọi thứ minh bạch.",
        "deepseek": "Blockchain = sổ cái phân tán + mã hóa + đồng thuận.\n\nEm có thể hiểu đơn giản thế này:\n\n1. **Sổ cái phân tán:** Thay vì 1 ngân hàng giữ sổ, hàng nghìn máy tính cùng giữ bản sao giống nhau\n2. **Mã hóa:** Mỗi trang sổ (block) có dấu vân tay số (hash) liên kết với trang trước\n3. **Đồng thuận:** Muốn thêm trang mới, đa số máy phải đồng ý\n\nKết quả: dữ liệu minh bạch, không ai giả mạo được.\n\nỨng dụng: Bitcoin, NFT, smart contract, truy xuất nguồn gốc thực phẩm.",
    },
    2: {  # thơ lục bát
        "claude-opus": "Xuân về phố cổ Hà thành,\nHoa đào nở rộ, long lanh nắng vàng.\nHồ Gươm sóng gợn nhẹ nhàng,\nBước chân du khách lang thang phố phường.\n\nMùi hoa sữa thoảng con đường,\nBán hàng rong gánh, phố vương khói trầm.\nChuông chùa ngân vọng xa xăm,\nMùa xuân Hà Nội trăm năm vẫn đầy.",
        "gpt-5": "Hà Nội mùa xuân dịu dàng,\nMưa phùn giăng mắc, phố hàng bình yên.\nHồ Tây gió thổi triền miên,\nĐào phai nở rộ, đất trời nồng nàn.\n\nBà già bán bánh đa tràn,\nGánh hàng hoa sớm, muộn màng tiếng rao.\nCốm xanh gói lá chuối nào,\nHương xuân Hà Nội ngọt ngào bốn mùa.",
        "gemini-pro": "Xuân sang phố cổ Thăng Long,\nĐường hoa Nhật Tân, đào hồng rực trời.\nHồ Gươm lặng sóng xa vời,\nTháp Rùa in bóng giữa nơi phố phường.\n\nChợ hoa Hàng Lược đêm trường,\nNgười đi lễ hội, phố vương mùi trầm.\nBanh chưng xanh gói tình thâm,\nXuân Hà Nội mãi trong tâm người về.",
    },
    3: {  # kinh tế VN
        "claude-opus": "Kinh tế Việt Nam tăng trưởng nhanh hơn dự kiến nhờ ba yếu tố chính:\n\n**1. Dịch chuyển chuỗi cung ứng toàn cầu (China+1)**\nCăng thẳng thương mại Mỹ-Trung đẩy hàng trăm nhà máy từ Trung Quốc sang Việt Nam. Samsung, Intel, Apple đều mở rộng sản xuất tại VN — biến VN thành hub sản xuất điện tử lớn nhất Đông Nam Á.\n\n**2. FDI kỷ lục + hạ tầng cải thiện**\nVốn FDI liên tục đạt kỷ lục. Đường cao tốc Bắc-Nam, sân bay Long Thành, metro TP.HCM — tất cả giảm chi phí logistics và nâng năng suất.\n\n**3. Dân số vàng + chuyển đổi số nhanh**\n70% dân số dưới 40 tuổi, thành thạo công nghệ. Thương mại điện tử tăng 25%/năm. Thanh toán số phổ biến nhanh nhất ASEAN.\n\n**Rủi ro:** phụ thuộc FDI, thiếu lao động chất lượng cao, biến đổi khí hậu.",
        "gpt-5": "Có 4 động lực chính khiến kinh tế VN vượt dự báo:\n\n1. **Chiến lược China+1:** Nhiều tập đoàn đa quốc gia dời sản xuất từ Trung Quốc sang VN để đa dạng hóa rủi ro. VN hưởng lợi lớn nhất trong ASEAN.\n\n2. **Hiệp định thương mại tự do:** CPTPP, EVFTA, RCEP mở ra thị trường xuất khẩu khổng lồ. Thuế giảm → xuất khẩu tăng → GDP tăng.\n\n3. **Kinh tế số bùng nổ:** Doanh thu kinh tế số đạt $30B+ (2025), tăng 20% YoY. Shopee, TikTok Shop, VNPay đang thay đổi cách tiêu dùng.\n\n4. **Ổn định chính trị + vĩ mô:** Lạm phát kiểm soát tốt, tỷ giá ổn định, chính sách tiền tệ linh hoạt.\n\nCâu hỏi lớn: VN có thoát được bẫy thu nhập trung bình hay không phụ thuộc vào đầu tư giáo dục và R&D.",
        "deepseek": "Tóm gọn 3 chữ: FDI + Trẻ + Mở.\n\n**FDI:** VN là lựa chọn số 1 thay thế Trung Quốc. Chi phí nhân công thấp, vị trí chiến lược, chính phủ ưu đãi mạnh.\n\n**Trẻ:** 70% dân dưới 35 tuổi. Tiêu dùng mạnh, thích ứng công nghệ nhanh. TikTok Shop VN là thị trường lớn thứ 2 thế giới.\n\n**Mở:** 16 FTA đã ký. VN xuất khẩu dễ dàng sang EU, Mỹ, Nhật, Úc. Tổng kim ngạch XNK gấp 2 lần GDP — rất ít nước đạt được.\n\nNhưng cần cẩn trọng: phụ thuộc Samsung (25% xuất khẩu), hạ tầng chưa theo kịp, thiếu kỹ sư cao cấp.",
    },
    4: {  # Python sort Vietnamese
        "claude-opus": "```python\nimport unicodedata\nimport functools\n\n# Thứ tự bảng chữ cái tiếng Việt\nVIET_ORDER = 'aăâbcdđeêghiklmnoôơpqrstuưvxy'\nTONE_ORDER = {'' : 0, '\\u0300': 1, '\\u0309': 2, '\\u0303': 3, '\\u0301': 4, '\\u0323': 5}\n\ndef viet_sort_key(name: str) -> list:\n    name = unicodedata.normalize('NFD', name.lower())\n    key = []\n    for ch in name:\n        if ch in VIET_ORDER:\n            key.append(VIET_ORDER.index(ch))\n        elif unicodedata.category(ch) == 'Mn':  # dấu thanh\n            key.append(TONE_ORDER.get(ch, 99))\n    return key\n\ndef sort_vietnamese_names(names: list[str]) -> list[str]:\n    return sorted(names, key=viet_sort_key)\n\n# Ví dụ\nnames = ['Nguyễn Văn An', 'Trần Thị Bình', 'Đỗ Minh Châu', \n         'Lê Hoàng Ân', 'Phạm Đức Anh']\nprint(sort_vietnamese_names(names))\n```",
        "gpt-5": "```python\nfrom functools import cmp_to_key\nimport re\n\nVIET_ALPHA = [\n    'a', 'à', 'á', 'ả', 'ã', 'ạ',\n    'ă', 'ằ', 'ắ', 'ẳ', 'ẵ', 'ặ',\n    'â', 'ầ', 'ấ', 'ẩ', 'ẫ', 'ậ',\n    'b', 'c', 'd', 'đ', 'e', 'è', 'é', 'ẻ', 'ẽ', 'ẹ',\n    'ê', 'ề', 'ế', 'ể', 'ễ', 'ệ',\n    'g', 'h', 'i', 'ì', 'í', 'ỉ', 'ĩ', 'ị',\n    'k', 'l', 'm', 'n', 'o', 'ò', 'ó', 'ỏ', 'õ', 'ọ',\n    'ô', 'ồ', 'ố', 'ổ', 'ỗ', 'ộ',\n    'ơ', 'ờ', 'ớ', 'ở', 'ỡ', 'ợ',\n    'p', 'q', 'r', 's', 't',\n    'u', 'ù', 'ú', 'ủ', 'ũ', 'ụ',\n    'ư', 'ừ', 'ứ', 'ử', 'ữ', 'ự',\n    'v', 'x', 'y'\n]\n\ndef char_order(c):\n    c = c.lower()\n    return VIET_ALPHA.index(c) if c in VIET_ALPHA else ord(c) + 1000\n\ndef compare_names(a, b):\n    for ca, cb in zip(a.lower(), b.lower()):\n        oa, ob = char_order(ca), char_order(cb)\n        if oa != ob:\n            return -1 if oa < ob else 1\n    return len(a) - len(b)\n\ndef sort_vietnamese(names):\n    return sorted(names, key=cmp_to_key(compare_names))\n\n# Test\nnames = ['Nguyễn Văn An', 'Đỗ Minh Châu', 'Trần Bình', 'Lê Ân']\nprint(sort_vietnamese(names))\n```",
    },
    5: {  # phở
        "claude-opus": "Phở Hà Nội mang vẻ đẹp của sự tinh tế, thanh đạm. Nước dùng trong vắt, ngọt từ xương bò ninh lâu, gia vị vừa phải. Bánh phở mỏng, mềm. Ăn kèm chỉ với hành lá, rau mùi, quẩy. Người Hà Nội xem phở như nghệ thuật — ít mà tinh.\n\nPhở Sài Gòn phóng khoáng hơn. Nước ngọt đậm, béo ngậy. Bàn ăn bày đầy rau sống: giá, húng quế, ngò gai, tương đen, tương ớt. Khẩu phần lớn, thêm thịt bò viên, gân, nạm.\n\n**Khác biệt cốt lõi:** Hà Nội tối giản — \"ít mà tinh\"; Sài Gòn phong phú — \"nhiều mà vui\".",
        "gpt-5": "Phở — linh hồn ẩm thực Việt Nam — có hai trường phái rõ rệt:\n\n**Phở Hà Nội** (phong cách Bắc):\n- Nước dùng thanh, trong, vị tinh tế\n- Gia vị ít, chú trọng xương bò\n- Không rau sống, chỉ hành lá và mùi\n- Quẩy chiên giòn là bạn đồng hành\n\n**Phở Sài Gòn** (phong cách Nam):\n- Nước ngọt đậm đà, có vị hồi\n- \"Vườn rau\" trên bàn: giá, húng, ngò\n- Tương đen, tương ớt tự do pha\n- Phần lớn, nhiều topping\n\nCả hai đều ngon — chỉ là bạn thích tối giản hay phong phú thôi!",
        "gemini-pro": "Phở Hà Nội và phở Sài Gòn như hai bản nhạc cùng giai điệu nhưng khác phong cách biểu diễn.\n\n| | Phở Hà Nội | Phở Sài Gòn |\n|---|---|---|\n| Nước dùng | Trong, thanh, tinh khiết | Ngọt đậm, béo, phức tạp |\n| Bánh phở | Mỏng, nhỏ sợi | To bản, dai hơn |\n| Rau ăn kèm | Hành + mùi (thế thôi!) | Giá, húng, ngò, rau om... |\n| Gia vị | Không tương đen | Tương đen + tương ớt |\n| Tinh thần | Tối giản, cầu kỳ | Phóng khoáng, hào phóng |\n\nĐiều thú vị: phở gốc Nam Định, nhưng Hà Nội và Sài Gòn đã phát triển thành hai phiên bản riêng biệt!",
    },
    6: {  # email nghỉ phép
        "claude-opus": "Kính gửi Anh/Chị [Tên sếp],\n\nEm xin phép được nghỉ phép [số ngày] ngày, từ ngày [ngày bắt đầu] đến ngày [ngày kết thúc], vì lý do [cá nhân/gia đình/sức khỏe].\n\nTrong thời gian em vắng mặt, [tên đồng nghiệp] sẽ hỗ trợ xử lý các công việc đang triển khai. Em đã bàn giao và cập nhật đầy đủ tiến độ các task hiện tại.\n\nEm sẽ đảm bảo hoàn thành các deadline quan trọng trước khi nghỉ và sẵn sàng hỗ trợ qua email/điện thoại nếu có việc gấp.\n\nKính mong Anh/Chị xem xét và phê duyệt.\n\nTrân trọng,\n[Họ tên]\n[Phòng ban]",
        "gpt-5": "Chủ đề: Xin phép nghỉ phép [ngày] - [Họ tên]\n\nKính gửi Anh/Chị,\n\nEm viết email này để xin phép được nghỉ phép từ [ngày] đến [ngày] (tổng [X] ngày làm việc).\n\nLý do: [Việc cá nhân/gia đình cần giải quyết]\n\nĐể đảm bảo công việc không bị gián đoạn, em đã:\n✅ Bàn giao task A cho [đồng nghiệp 1]\n✅ Cập nhật tiến độ dự án B trong [tool quản lý]\n✅ Hoàn thành deadline C trước ngày nghỉ\n\nEm có thể liên lạc qua điện thoại trong trường hợp khẩn cấp.\n\nRất mong Anh/Chị đồng ý. Em xin cảm ơn!\n\nTrân trọng,\n[Họ tên]",
    },
    7: {  # Geneva
        "claude-opus": "**Hiệp định Geneva 1954 tóm tắt trong 5 câu:**\n\n1. Hiệp định được ký ngày 21/7/1954 tại Geneva, Thụy Sĩ, kết thúc cuộc chiến tranh Đông Dương giữa Pháp và Việt Minh sau chiến thắng Điện Biên Phủ.\n\n2. Việt Nam tạm thời bị chia cắt tại vĩ tuyến 17 — miền Bắc do Việt Nam Dân chủ Cộng hòa quản lý, miền Nam do Quốc gia Việt Nam kiểm soát.\n\n3. Cả hai bên ngừng bắn, trao đổi tù binh, và đồng ý tổ chức tổng tuyển cử thống nhất đất nước vào tháng 7/1956.\n\n4. Cuộc tổng tuyển cử không bao giờ diễn ra — chính quyền miền Nam (được Mỹ hậu thuẫn) từ chối tham gia, dẫn đến chia cắt kéo dài.\n\n5. Hiệp định cũng công nhận độc lập và chủ quyền của Lào và Campuchia, đánh dấu chấm hết cho chế độ thuộc địa Pháp tại Đông Dương.",
        "gemini-pro": "5 câu tóm tắt Hiệp định Geneva 1954:\n\n1. **Bối cảnh:** Sau 9 năm kháng chiến chống Pháp, đặc biệt chiến thắng Điện Biên Phủ (7/5/1954), hội nghị quốc tế tại Geneva đã đàm phán hòa bình cho Đông Dương.\n\n2. **Nội dung chính:** Pháp rút quân, Việt Nam tạm chia hai tại vĩ tuyến 17 — Bắc theo VNDCCH, Nam theo Quốc gia Việt Nam.\n\n3. **Cam kết quan trọng:** Tổng tuyển cử thống nhất sẽ tổ chức vào tháng 7/1956, dưới giám sát quốc tế.\n\n4. **Thực tế:** Cuộc bầu cử không bao giờ diễn ra vì Ngô Đình Diệm (với sự ủng hộ của Mỹ) từ chối, dẫn đến Chiến tranh Việt Nam.\n\n5. **Di sản:** Hiệp định đánh dấu sự sụp đổ của chủ nghĩa thực dân Pháp ở Đông Dương nhưng lại gieo mầm cho cuộc xung đột mới kéo dài 20 năm.",
    },
    8: {  # truyện kinh dị Đà Lạt
        "claude-opus": "**Sương Mù Biệt Thự Cũ**\n\nChiều hôm đó, Minh đến Đà Lạt một mình.\n\nAnh đặt phòng qua app — một biệt thự Pháp cổ giá rẻ bất ngờ trên đường Trần Hưng Đạo. Chủ nhà không ra đón. Chỉ có tin nhắn: \"Chìa khóa dưới chậu cúc. Đừng lên tầng 3.\"\n\nĐêm đầu tiên, Minh nghe tiếng piano. Giai điệu nhẹ, buồn, vọng từ tầng trên. Anh tự nhủ: gió thổi qua cửa sổ cũ.\n\nĐêm thứ hai, tiếng piano rõ hơn. Lần này có tiếng hát — giọng phụ nữ, tiếng Pháp, như ru con. Minh bật đèn flash điện thoại, đi lên cầu thang. Tầng 2 trống. Cầu thang lên tầng 3 bị chặn bằng một tấm gỗ đóng đinh.\n\nĐêm thứ ba, Minh tỉnh giấc lúc 3 giờ sáng. Không có tiếng piano. Im lặng tuyệt đối. Nhưng trên trần phòng ngủ, có một vết nước đang lan ra. Vết nước có màu đỏ sẫm.\n\nMinh chạy ra ngoài. Sương mù Đà Lạt dày đặc như bức tường trắng. Anh quay đầu nhìn lại biệt thự — tầng 3 sáng đèn.\n\nNhưng biệt thự này chỉ có 2 tầng.",
        "gpt-5": "**Đồi Thông Không Tên**\n\nNhóm bạn 4 người đến Đà Lạt vào dịp Tết. Họ thuê chiếc xe máy, chạy lên một con đồi thông không có trên Google Maps.\n\n\"Chỗ này đẹp quá!\" — Linh reo lên, chạy vào rừng thông chụp ảnh. Sương mù bắt đầu dày.\n\nMười phút sau, Linh quay lại. Nhưng nhóm còn 4 người đang đứng đó — không phải 3.\n\nNgười thứ 5 mặc áo dài trắng, đứng quay lưng. Không ai nhớ cô ấy đến từ lúc nào.\n\n\"Xin lỗi, bạn là ai?\" — Tuấn hỏi.\n\nCô gái quay lại. Khuôn mặt trắng bệch, không có mắt. Chỉ có hai hốc đen sâu thẳm.\n\n\"Các bạn đến đồi của tôi.\"\n\nSương mù nuốt chửng cả nhóm. Ba ngày sau, người dân tìm thấy chiếc xe máy bên đường — không có dấu vết của ai.\n\nChỉ có 5 bức ảnh trong máy Linh. Bức cuối cùng chụp từ phía sau — 4 người đang chạy, và một bóng trắng đuổi theo.",
    },
    9: {  # VinFast
        "claude-opus": "**Phân tích SWOT VinFast trên thị trường quốc tế:**\n\n**Điểm mạnh (Strengths):**\n- Hệ sinh thái Vingroup hậu thuẫn mạnh về tài chính và hạ tầng\n- Giá cạnh tranh so với xe điện cùng phân khúc (VF 5 từ $20K, VF 8 từ $40K)\n- Chiến lược IPO trên NASDAQ tạo nhận diện thương hiệu toàn cầu\n- Cam kết 100% xe điện — không có \"gánh nặng\" xe xăng kế thừa\n\n**Điểm yếu (Weaknesses):**\n- Thương hiệu chưa có uy tín quốc tế — người tiêu dùng Mỹ/EU chưa tin tưởng\n- Mạng lưới dịch vụ/sạc mỏng — phụ thuộc đối tác\n- Doanh số còn thấp: ~35,000 xe/năm (2025), so với Tesla 1.8M\n- Lỗ lũy kế lớn, đốt vốn nhanh\n\n**Cơ hội:**\n- Thị trường xe điện toàn cầu tăng 25%/năm\n- Trợ cấp chính phủ tại Mỹ và EU cho xe điện\n- Phân khúc xe điện giá rẻ ($20-35K) còn thiếu cạnh tranh\n\n**Thách thức:**\n- Tesla, BYD, Hyundai — đối thủ cực mạnh\n- Cuộc chiến giá xe điện Trung Quốc\n- Rào cản thuế quan và tiêu chuẩn an toàn khác nhau",
        "gpt-5": "**VinFast trên sân chơi quốc tế — Phân tích thẳng thắn:**\n\n**Mạnh:**\n1. **Tốc độ:** Từ 0 → IPO NASDAQ trong 5 năm, nhanh nhất lịch sử ngành ô tô\n2. **All-in EV:** Không có sản phẩm xăng kế thừa — thuận lợi cho chuyển đổi\n3. **Giá cạnh tranh:** VF 5 dưới $20K, nhắm đúng phân khúc thiếu vắng\n4. **Vingroup backing:** Tập đoàn lớn nhất VN, có đủ tiền \"đốt\" để giành thị phần\n\n**Yếu:**\n1. **Brand awareness = 0** tại Mỹ và EU. \"VinFast là gì?\" là câu hỏi phổ biến\n2. **Chất lượng chưa thuyết phục:** Đánh giá từ MotorTrend, Car & Driver còn trung bình\n3. **Lỗ nặng:** ~$2B/năm. Runway có hạn nếu doanh số không tăng nhanh\n4. **Hậu mãi:** Trạm sạc, trung tâm dịch vụ quá ít tại thị trường mục tiêu\n\n**Kết luận:** VinFast có tham vọng đúng nhưng thực thi chưa đủ. Cần tập trung vào 1-2 thị trường thay vì dàn trải 60+ quốc gia.",
    },
}


async def seed():
    await init_db()

    async with aiosqlite.connect(DATABASE_PATH) as db:
        # Check if already seeded
        cursor = await db.execute("SELECT COUNT(*) FROM models")
        count = (await cursor.fetchone())[0]
        if count > 0:
            print("Database already seeded.")
            return

        # Insert models
        for m in MODELS:
            await db.execute(
                "INSERT INTO models (id, name, org, license, color) VALUES (?, ?, ?, ?, ?)",
                (m[0], m[1], m[2], m[3], m[4]),
            )

        # Insert prompts
        for i, p in enumerate(PROMPTS):
            await db.execute(
                "INSERT INTO prompts (id, text, category) VALUES (?, ?, ?)",
                (i + 1, p[0], p[1]),
            )

        # Insert responses
        for prompt_id, model_responses in RESPONSES.items():
            for model_id, content in model_responses.items():
                await db.execute(
                    "INSERT INTO responses (prompt_id, model_id, content, turn_number) VALUES (?, ?, ?, 1)",
                    (prompt_id, model_id, content),
                )

        await db.commit()
        print(f"Seeded: {len(MODELS)} models, {len(PROMPTS)} prompts, {sum(len(v) for v in RESPONSES.values())} responses")


if __name__ == "__main__":
    asyncio.run(seed())
