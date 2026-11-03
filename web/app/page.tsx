import Link from "next/link";

export default function Home() {
  return (
    <>
      <header className="topbar">
        <span className="brand">Quản lý bài thi</span>
        <Link className="btn primary" href="/start">Dùng thử demo</Link>
      </header>

      <main className="doc no-tabbar">
        <h1>Phụ huynh xem được từng bài thi của con, không chỉ điểm cuối kỳ</h1>
        <p className="lead">Giáo viên chụp ảnh bài thi giấy, gắn với học sinh, ghi điểm và nhận xét. Phụ huynh mở một đường link là xem được ảnh bài làm cùng nhận xét của giáo viên. Không cần tạo tài khoản.</p>
        <p style={{ marginTop: "var(--space-4)" }}><Link className="btn primary" href="/start">Dùng thử demo</Link></p>

        <nav className="toc" aria-label="Mục lục">
          <div className="chips">
            <a className="chip" href="#tinh-nang">Tính năng</a>
            <a className="chip" href="#giao-vien">Hướng dẫn cho giáo viên</a>
            <a className="chip" href="#phu-huynh">Hướng dẫn cho phụ huynh</a>
            <a className="chip" href="#cau-hoi">Câu hỏi thường gặp</a>
          </div>
        </nav>

        <h2 id="tinh-nang">Tính năng</h2>

        <h3>Cho giáo viên</h3>
        <ul>
          <li><b>Quản lý bài thi theo lớp.</b> Mỗi bài thi có lớp, môn, loại (15 phút, 45 phút, giữa kỳ, cuối kỳ), học kỳ, ngày thi và điểm tối đa. Lọc danh sách theo lớp, loại bài, học kỳ.</li>
          <li><b>Đăng ảnh bài thi giấy.</b> Chọn hoặc chụp nhiều ảnh cho một bài làm. Ảnh được nén tự động trước khi lưu để đỡ nặng.</li>
          <li><b>Gắn học sinh, điểm và nhận xét</b> cho từng bài làm. Hệ thống không cho một học sinh có hai bài làm trong cùng một bài thi.</li>
          <li><b>Lưu nháp hoặc đăng.</b> Bài nháp phụ huynh chưa thấy. Đăng cả lớp một lần bằng nút &quot;Đăng bài nháp&quot;.</li>
          <li><b>Quản lý lớp và học sinh.</b> Thêm nhiều học sinh cùng lúc bằng cách dán danh sách họ tên, mỗi dòng một em.</li>
          <li><b>Link riêng cho từng học sinh.</b> Chép link gửi phụ huynh. Biết phụ huynh đã mở link chưa. Link bị lộ thì đổi link, link cũ lập tức hết hiệu lực.</li>
        </ul>

        <h3>Cho phụ huynh</h3>
        <ul>
          <li><b>Không cần tài khoản.</b> Bấm link giáo viên gửi là xem được, trên điện thoại hay máy tính.</li>
          <li><b>Điểm trung bình và biểu đồ</b> điểm theo thời gian, quy về thang 10. Điểm trung bình tính theo hệ số loại bài: 15 phút ×1, 45 phút ×2, giữa kỳ ×2, cuối kỳ ×3.</li>
          <li><b>Từng bài thi</b> với điểm, nhận xét của giáo viên và ảnh bài làm phóng to được. Bài chưa xem có nhãn &quot;Mới&quot;.</li>
          <li><b>Lọc theo loại bài, học kỳ.</b></li>
          <li><b>Nhiều con.</b> Thêm link của con thứ hai để chuyển qua lại giữa các con ngay trên cùng trang.</li>
        </ul>

        <h2 id="giao-vien">Hướng dẫn cho giáo viên</h2>
        <ol>
          <li><b>Vào demo.</b> Bấm &quot;Dùng thử demo&quot;, chọn tài khoản giáo viên.</li>
          <li><b>Tạo lớp và học sinh.</b> Vào <b>Lớp học</b>, bấm &quot;Thêm lớp&quot;. Mở lớp vừa tạo (bấm vào tên lớp), bấm &quot;Thêm học sinh&quot;, dán danh sách họ tên, mỗi dòng một em.</li>
          <li><b>Tạo bài thi.</b> Vào <b>Bài thi</b>, bấm &quot;Tạo bài thi&quot;. Nhập tên bài thi, chọn lớp, loại bài, học kỳ, ngày thi và điểm tối đa.</li>
          <li><b>Thêm bài làm.</b> Mở bài thi vừa tạo, bấm &quot;Thêm bài làm&quot;. Chọn học sinh, nhập điểm, viết nhận xét, chọn các ảnh bài làm. Có thể xóa ảnh chọn nhầm trước khi lưu.</li>
          <li><b>Chọn lưu hay đăng.</b> &quot;Lưu nháp&quot; để làm tiếp sau, phụ huynh chưa thấy. &quot;Đăng cho phụ huynh&quot; để phụ huynh xem ngay (cần có điểm và ít nhất một ảnh). Bài nháp đã đủ điểm và ảnh có thể đăng cả loạt bằng nút &quot;Đăng N bài nháp&quot; ở đầu trang.</li>
          <li><b>Gửi link cho phụ huynh.</b> Vào <b>Lớp học</b>, mở lớp, bấm &quot;Chép link&quot; ở dòng học sinh rồi gửi qua Zalo hoặc tin nhắn. Nhãn &quot;Phụ huynh đã mở&quot; cho biết link đã được dùng.</li>
          <li><b>Sửa hoặc đổi link khi cần.</b> Bấm vào một bài làm để sửa điểm, nhận xét, ảnh hoặc xóa bài. Bấm &quot;Đổi link&quot; nếu link bị gửi nhầm hoặc lộ.</li>
        </ol>

        <h3>Nháp và đã đăng khác nhau thế nào</h3>
        <dl>
          <dt>Nháp</dt>
          <dd>Chỉ giáo viên thấy. Dùng khi mới chụp ảnh, chưa chấm xong. Có thể thiếu điểm hoặc ảnh.</dd>
          <dt>Đã đăng</dt>
          <dd>Phụ huynh xem được qua link. Sửa lại rồi bấm &quot;Đăng cho phụ huynh&quot; thì phụ huynh thấy bản mới. Bấm &quot;Lưu nháp&quot; trên bài đã đăng sẽ gỡ bài khỏi phụ huynh.</dd>
        </dl>

        <h2 id="phu-huynh">Hướng dẫn cho phụ huynh</h2>
        <ol>
          <li><b>Mở link</b> giáo viên gửi. Không cần đăng ký hay đăng nhập. Nên lưu lại link (tin nhắn, dấu trang) để lần sau vào nhanh.</li>
          <li><b>Xem tổng quan.</b> Đầu trang có điểm trung bình, số bài và số bài mới, bên dưới là biểu đồ điểm theo thời gian.</li>
          <li><b>Xem từng bài.</b> Bấm một bài trong danh sách. Trên máy tính, chi tiết hiện ngay bên phải danh sách. Trên điện thoại, chi tiết mở toàn màn hình, bấm &quot;Đóng&quot; để quay lại.</li>
          <li><b>Xem ảnh bài làm.</b> Bấm vào ảnh để xem toàn màn hình, bấm &quot;Phóng to&quot; để đọc chữ viết tay rõ hơn.</li>
          <li><b>Lọc bài.</b> Bấm &quot;Lọc&quot; để chọn loại bài hoặc học kỳ. Bấm &quot;Xóa lọc&quot; để xem lại tất cả.</li>
          <li><b>Có hai con trở lên.</b> Mỗi con có một link riêng. Bấm &quot;Thêm con&quot;, dán link của con còn lại. Máy sẽ nhớ và hiện nút chọn con ở đầu trang.</li>
        </ol>

        <h2 id="cau-hoi">Câu hỏi thường gặp</h2>
        <dl>
          <dt>Phụ huynh có cần tạo tài khoản không?</dt>
          <dd>Không. Chỉ cần link giáo viên gửi.</dd>
          <dt>Người khác có xem được bài của con tôi không?</dt>
          <dd>Chỉ khi họ có link. Mỗi học sinh một link riêng, link của em này không xem được bài của em khác. Đừng đăng link lên nhóm chung. Nếu lỡ lộ, nhờ giáo viên đổi link.</dd>
          <dt>Giáo viên chưa đăng bài thì phụ huynh thấy gì?</dt>
          <dd>Trang hiện &quot;Giáo viên chưa đăng bài nào của con&quot;. Bài nháp không hiện.</dd>
          <dt>Tôi mở link báo &quot;Link không đúng&quot;?</dt>
          <dd>Link bị thiếu ký tự khi chép hoặc giáo viên đã đổi link. Hãy nhờ giáo viên gửi lại.</dd>
          <dt>Giáo viên có thể thêm bao nhiêu ảnh cho một bài?</dt>
          <dd>Nhiều ảnh, thường mỗi trang giấy một ảnh. Ảnh được nén tối đa 1600 điểm ảnh ở cạnh dài.</dd>
          <dt>Có dùng được trên điện thoại không?</dt>
          <dd>Có. Giao diện thiết kế cho điện thoại trước, máy tính dùng bố cục rộng hơn.</dd>
          <dt>Dữ liệu demo lưu ở đâu?</dt>
          <dd>Trong trình duyệt của chính máy đang dùng, không gửi đi đâu và không chia sẻ giữa các máy. Link chép từ máy này không mở được trên máy khác. Bản chính thức sẽ lưu trên máy chủ để giáo viên và phụ huynh dùng chung dữ liệu.</dd>
        </dl>

        <p style={{ marginTop: "var(--space-7)" }}><Link className="btn primary" href="/start">Dùng thử demo</Link></p>
      </main>
    </>
  );
}
