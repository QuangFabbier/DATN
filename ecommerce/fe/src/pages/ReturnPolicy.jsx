import Breadcrumbs from "../components/Breadcrumbs";

function ReturnPolicy() {
  return (
    <section className="page-section">
      <Breadcrumbs
        items={[
          { label: "Trang chủ", to: "/" },
          { label: "Chính sách đổi trả" },
        ]}
      />

      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Nexora Policy</p>
          <h1>Chính Sách Kiểm Hàng - Đổi Trả</h1>
          <p className="section-heading-meta">
            Cập nhật lần gần nhất: 14/05/2026
          </p>
        </div>
      </div>

      <article className="form-card privacy-policy-card">
        <h2>1.1 Chính sách kiểm hàng</h2>
        <p>
          Khi nhận hàng, khách hàng vui lòng kiểm tra kỹ sản phẩm trước khi xác
          nhận với đơn vị vận chuyển. Nexora khuyến nghị khách hàng quay video
          quá trình mở hộp để thuận tiện cho việc đối soát khi phát sinh sự cố.
        </p>
        <p>
          Nếu kiện hàng móp méo, sản phẩm biến dạng hoặc có dấu hiệu bất thường,
          khách hàng vui lòng tạm dừng nhận hàng và liên hệ ngay bộ phận chăm
          sóc khách hàng để được hỗ trợ xử lý kịp thời.
        </p>

        <h2>1.2 Chính sách đổi trả</h2>
        <h2>a) Trường hợp được đổi trả sản phẩm</h2>
        <p>
          Nexora thực hiện đổi trả với sản phẩm bị lỗi kỹ thuật từ nhà sản xuất
          và đáp ứng đủ điều kiện:
        </p>
        <ul>
          <li>Sản phẩm bị lỗi/trục trặc do nhà sản xuất.</li>
          <li>
            Sản phẩm còn nguyên vẹn, không nứt vỡ, không biến dạng do tác động
            ngoại lực.
          </li>
          <li>Sản phẩm không có dấu hiệu ẩm, vào nước hoặc chạm mạch.</li>
          <li>
            Sản phẩm còn nguyên S/N, tem nhà phân phối/tem bảo hành, còn thời
            hạn bảo hành.
          </li>
          <li>
            Sản phẩm đổi trả cần kèm đủ hộp và phụ kiện. Trường hợp thiếu
            hộp/phụ kiện, Nexora sẽ xử lý theo điều kiện tương ứng sau khi kiểm
            tra lỗi thực tế.
          </li>
        </ul>

        <p>Điều kiện hỗ trợ đổi trả theo đơn hàng:</p>
        <ul>
          <li>
            Sản phẩm được mua tại các kênh bán hàng chính thức của Nexora.
          </li>
          <li>Sản phẩm còn trong thời hạn bảo hành của nhà sản xuất.</li>
          <li>
            Phiếu bảo hành, tài liệu kỹ thuật, quà tặng kèm theo (nếu có) còn
            đầy đủ.
          </li>
          <li>
            Hàng đổi sang sản phẩm tương đương hoặc cao hơn và bù phần chênh
            lệch (nếu có).
          </li>
          <li>Mỗi đơn hàng được hỗ trợ đổi trả tối đa 01 lần.</li>
          <li>
            Khách hàng cần cung cấp đầy đủ hóa đơn/chứng từ mua hàng khi yêu cầu
            đổi trả.
          </li>
        </ul>

        <h2>b) Điều khoản đổi trả sản phẩm</h2>
        <p>
          Nexora ưu tiên đổi sản phẩm mới cùng mẫu mã (cùng mã sản phẩm, phiên
          bản và màu sắc khi còn hàng). Trường hợp hết hàng cùng mã, Nexora sẽ
          hỗ trợ đổi sang sản phẩm khác có giá trị tương đương theo thỏa thuận
          với khách hàng.
        </p>

        <h2>c) Hướng dẫn quy trình đổi trả sản phẩm</h2>
        <ul>
          <li>
            Bước 1: Kiểm tra điều kiện đổi trả để đảm bảo sản phẩm đáp ứng đầy
            đủ các tiêu chí tiếp nhận.
          </li>
          <li>
            Bước 2: Gửi yêu cầu đổi trả qua các kênh liên hệ và cung cấp thông
            tin: họ tên, số điện thoại, mã đơn hàng, lý do đổi trả.
          </li>
          <li>
            Bước 3: Đóng gói sản phẩm cẩn thận bằng hộp ban đầu, kèm hóa đơn và
            đầy đủ phụ kiện liên quan.
          </li>
          <li>
            Bước 4: Gửi sản phẩm về điểm tiếp nhận bảo hành/đổi trả của Nexora
            theo hướng dẫn từ bộ phận CSKH.
          </li>
          <li>
            Bước 5: Nexora kiểm tra và phản hồi kết quả xử lý cùng phương án
            giải quyết trong vòng 07 ngày làm việc.
          </li>
        </ul>

        <h2>Lưu ý quan trọng</h2>
        <ul>
          <li>
            Nexora không chịu trách nhiệm đối với mất mát, thất lạc hoặc hư hỏng
            phát sinh trong quá trình vận chuyển từ phía khách hàng.
          </li>
          <li>
            Khách hàng chịu trách nhiệm bảo đảm tính toàn vẹn của sản phẩm khi
            gửi đổi trả; cần đóng gói kỹ để hạn chế rủi ro trong vận chuyển.
          </li>
          <li>
            Với trường hợp nhận hàng thiếu/sai sản phẩm, khách hàng vui lòng
            chụp ảnh hiện trạng và liên hệ ngay để được hướng dẫn xử lý.
          </li>
        </ul>

        <h2>Thông tin liên hệ hỗ trợ đổi trả</h2>
        <ul>
          <li>Email: nguyenminhquang0325@gmail.com</li>
          <li>Hotline: 0982241317</li>
          <li>Địa chỉ: 52B ngõ 4 Hoàng Quốc Việt, Nghĩa Đô, Hà Nội</li>
          <li>
            Địa chỉ liên hệ bổ sung: 55 Nghiêm Quý Ngãi, Hàm Rồng, tỉnh Thanh
            Hóa
          </li>
        </ul>
      </article>
    </section>
  );
}

export default ReturnPolicy;
