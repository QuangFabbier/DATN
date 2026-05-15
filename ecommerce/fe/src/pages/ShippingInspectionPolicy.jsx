import Breadcrumbs from '../components/Breadcrumbs'

function ShippingInspectionPolicy() {
  return (
    <section className="page-section">
      <Breadcrumbs items={[{ label: 'Trang chủ', to: '/' }, { label: 'Chính sách vận chuyển & kiểm hàng' }]} />

      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Nexora Policy</p>
          <h1>Chính Sách Vận Chuyển & Kiểm Hàng</h1>
          <p className="section-heading-meta">Cập nhật lần gần nhất: 15/05/2026</p>
        </div>
      </div>

      <article className="form-card privacy-policy-card">
        <h2>1. Phạm vi áp dụng</h2>
        <p>
          Chính sách này áp dụng cho mọi đơn hàng đặt qua các kênh bán hàng chính thức của Nexora. Nội dung bao gồm:
          phạm vi giao hàng, thời gian giao nhận, chi phí vận chuyển, trách nhiệm các bên và quy trình kiểm hàng khi
          nhận.
        </p>

        <h2>2. Khu vực và phương thức vận chuyển</h2>
        <p>
          Nexora hỗ trợ giao hàng trên toàn quốc thông qua đơn vị vận chuyển đối tác hoặc đội giao nhận phù hợp theo
          từng khu vực. Tùy địa điểm, khách hàng có thể được áp dụng các phương thức giao tiêu chuẩn hoặc giao nhanh.
        </p>

        <h2>3. Thời gian giao hàng dự kiến</h2>
        <ul>
          <li>Nội thành: từ 1 - 2 ngày làm việc.</li>
          <li>Ngoại thành/tỉnh lân cận: từ 2 - 4 ngày làm việc.</li>
          <li>Liên tỉnh/xa trung tâm: từ 3 - 7 ngày làm việc.</li>
        </ul>
        <p>
          Thời gian trên là thời gian dự kiến, có thể thay đổi do yếu tố khách quan như thời tiết, dịch vụ vận chuyển,
          dịp cao điểm hoặc các sự kiện bất khả kháng.
        </p>

        <h2>4. Phí vận chuyển</h2>
        <p>
          Phí vận chuyển được hiển thị trong quá trình đặt hàng hoặc xác nhận lại trước khi giao dịch hoàn tất. Một số
          chương trình khuyến mại có thể áp dụng ưu đãi miễn phí/giảm phí vận chuyển theo điều kiện cụ thể.
        </p>

        <h2>5. Trách nhiệm khi giao nhận</h2>
        <ul>
          <li>Nexora có trách nhiệm bàn giao đúng sản phẩm theo đơn hàng đã xác nhận.</li>
          <li>
            Khách hàng có trách nhiệm cung cấp đầy đủ và chính xác thông tin nhận hàng: họ tên, số điện thoại, địa chỉ
            và thời gian nhận dự kiến.
          </li>
          <li>
            Trường hợp giao không thành công do thông tin sai hoặc không liên hệ được người nhận, đơn hàng có thể bị
            dời lịch hoặc hủy theo quy trình vận hành.
          </li>
        </ul>

        <h2>6. Chính sách kiểm hàng khi nhận</h2>
        <p>
          Khách hàng được quyền kiểm tra ngoại quan kiện hàng và sản phẩm tại thời điểm nhận trước khi xác nhận bàn
          giao với đơn vị vận chuyển.
        </p>
        <p>Nexora khuyến nghị khách hàng thực hiện đầy đủ các bước sau:</p>
        <ul>
          <li>Kiểm tra tên sản phẩm, số lượng, phiên bản theo đơn hàng.</li>
          <li>Kiểm tra tình trạng bao bì, tem niêm phong, phụ kiện đi kèm.</li>
          <li>Quay video quá trình mở hộp để làm căn cứ đối soát khi cần thiết.</li>
          <li>
            Nếu phát hiện thiếu hàng, sai hàng hoặc hư hỏng do vận chuyển, vui lòng từ chối nhận (nếu cần) và liên hệ
            Nexora ngay để được hỗ trợ.
          </li>
        </ul>

        <h2>7. Lưu ý quan trọng</h2>
        <ul>
          <li>
            Sau khi khách hàng xác nhận đã nhận hàng, các khiếu nại liên quan ngoại quan có thể cần thêm thời gian và
            bằng chứng để đối soát.
          </li>
          <li>
            Đối với sản phẩm điện tử có seal/tem kích hoạt, khách hàng cần kiểm tra kỹ trước khi bóc seal để đảm bảo
            quyền lợi đổi trả theo chính sách hiện hành.
          </li>
        </ul>

        <h2>8. Thông tin liên hệ hỗ trợ</h2>
        <ul>
          <li>Hotline: 0982241317</li>
          <li>Email: nguyenminhquang0325@gmail.com</li>
          <li>Địa chỉ: 52B ngõ 4 Hoàng Quốc Việt, Nghĩa Đô, Hà Nội</li>
          <li>Địa chỉ liên hệ bổ sung: 55 Nghiêm Quý Ngãi, Hàm Rồng, tỉnh Thanh Hóa</li>
        </ul>
      </article>
    </section>
  )
}

export default ShippingInspectionPolicy
