import Breadcrumbs from '../components/Breadcrumbs'

function TermsOfUse() {
  return (
    <section className="page-section">
      <Breadcrumbs items={[{ label: 'Trang chủ', to: '/' }, { label: 'Điều khoản sử dụng' }]} />

      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Nexora Policy</p>
          <h1>Điều Khoản Sử Dụng</h1>
          <p className="section-heading-meta">Cập nhật lần gần nhất: 15/05/2026</p>
        </div>
      </div>

      <article className="form-card privacy-policy-card">
        <h2>CHÍNH SÁCH VÀ ĐIỀU KHOẢN CHUNG</h2>
        <p>
          Điều khoản và điều kiện này áp dụng cho các giao dịch mua bán trên website Nexora. Khi tiếp tục truy cập và
          đặt hàng, khách hàng được hiểu là đã đọc, hiểu và đồng ý bị ràng buộc bởi các điều khoản dưới đây.
        </p>

        <h2>1. Định nghĩa</h2>
        <ul>
          <li>
            <strong>Thông báo:</strong> thư điện tử do website gửi để thông báo đã tiếp nhận đơn đặt hàng của khách
            hàng.
          </li>
          <li>
            <strong>Khách hàng/Quý khách:</strong> người mua hàng trên website.
          </li>
          <li>
            <strong>Ngày làm việc:</strong> các ngày trong tuần, không bao gồm Chủ nhật và ngày lễ theo quy định tại
            Việt Nam.
          </li>
          <li>
            <strong>Xác nhận đơn đặt hàng:</strong> thư điện tử xác nhận đơn hàng đã được Nexora chấp nhận xử lý.
          </li>
          <li>
            <strong>Đơn hàng:</strong> yêu cầu mua sản phẩm do khách hàng gửi trên website.
          </li>
        </ul>

        <h2>2. Quy định về người sử dụng</h2>
        <p>
          Khi truy cập website, khách hàng đồng ý tuân thủ toàn bộ điều khoản hiện hành. Nexora có quyền thay đổi, bổ
          sung hoặc lược bỏ nội dung điều khoản bất kỳ lúc nào; các thay đổi có hiệu lực ngay khi được đăng tải.
        </p>
        <p>
          Khách hàng không được sử dụng bất kỳ phần nào của website cho mục đích thương mại hoặc nhân danh bên thứ ba
          nếu không có thỏa thuận bằng văn bản với Nexora. Trường hợp vi phạm, Nexora có quyền tạm ngưng hoặc chấm
          dứt quyền truy cập mà không cần thông báo trước.
        </p>
        <p>
          Khách hàng có trách nhiệm cung cấp thông tin chính xác, tự bảo mật tài khoản/mật khẩu và cập nhật thông tin
          khi có thay đổi. Mọi rủi ro phát sinh từ việc quản lý tài khoản không an toàn thuộc trách nhiệm của khách
          hàng.
        </p>
        <p>
          Trong quá trình sử dụng dịch vụ, khách hàng có thể nhận thông tin khuyến mại qua email và có quyền từ chối
          nhận bằng liên kết hủy đăng ký trong mỗi thư.
        </p>

        <h2>3. Điều khoản về đơn hàng và giá cả</h2>
        <p>
          Nexora có quyền từ chối hoặc hủy đơn hàng trong một số trường hợp cần thiết, bao gồm nhưng không giới hạn ở
          trường hợp nghi ngờ gian lận, thiếu thông tin xác minh, hoặc sự cố kỹ thuật liên quan giá/hiển thị sản
          phẩm.
        </p>
        <p>
          Chúng tôi luôn nỗ lực đảm bảo thông tin sản phẩm và giá bán chính xác. Tuy nhiên, nếu có sai sót, Nexora sẽ
          chủ động liên hệ để hướng dẫn xử lý hoặc thông báo hủy đơn hàng và hoàn tiền (nếu có thanh toán trước).
        </p>

        <h2>4. Cách hình thành hợp đồng</h2>
        <p>
          Khi gửi đơn hàng, khách hàng đồng ý với điều khoản tại thời điểm đặt mua. Hợp đồng mua bán chỉ được xem là
          hình thành khi Nexora gửi thư điện tử “Xác nhận đơn hàng”.
        </p>
        <p>
          Trước thời điểm xác nhận đơn hàng, Nexora có quyền từ chối xử lý đơn. Nếu đơn đã thanh toán trước nhưng bị
          hủy, khoản tiền tương ứng sẽ được hoàn trả theo phương thức thanh toán ban đầu.
        </p>
        <p>
          Nếu khách hàng muốn chỉnh sửa đơn sau khi đã gửi, vui lòng liên hệ ngay với bộ phận hỗ trợ. Nexora sẽ hỗ
          trợ trong phạm vi có thể nhưng không cam kết luôn chỉnh sửa được đơn hàng.
        </p>

        <h2>5. Giao hàng</h2>
        <p>
          Nexora giao hàng đến địa chỉ khách hàng cung cấp trong đơn đặt hàng. Thời gian giao hàng phụ thuộc địa điểm
          và phương thức vận chuyển, sẽ được thông báo tại thời điểm đặt mua hoặc trong thư xác nhận đơn hàng.
        </p>
        <p>
          Khi nhận hàng, khách hàng cần kiểm tra tình trạng sản phẩm trước khi ký nhận. Việc ký nhận được xem là xác
          nhận đã nhận đủ hàng và hàng hóa ở tình trạng phù hợp theo phạm vi kiểm tra thông thường.
        </p>
        <p>
          Trường hợp giao hàng chậm do yếu tố khách quan hoặc do phía khách hàng thay đổi/không thể nhận hàng đúng
          hẹn, Nexora sẽ phối hợp với đơn vị vận chuyển để xử lý và có thể phát sinh chi phí theo chính sách vận
          chuyển áp dụng tại thời điểm đó.
        </p>

        <h2>6. Điều khoản bất khả kháng</h2>
        <p>
          Nexora không chịu trách nhiệm đối với chậm trễ hoặc không thể thực hiện nghĩa vụ do các sự kiện ngoài khả
          năng kiểm soát hợp lý, bao gồm thiên tai, hỏa hoạn, dịch bệnh, chiến sự, sự cố hạ tầng viễn thông/Internet,
          yêu cầu từ cơ quan có thẩm quyền hoặc các sự cố tương tự.
        </p>
        <p>
          Khi sự kiện bất khả kháng kéo dài, các bên có thể thỏa thuận điều chỉnh thời gian thực hiện hoặc chấm dứt
          giao dịch theo quy định pháp luật hiện hành.
        </p>

        <h2>7. Thông tin liên hệ</h2>
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

export default TermsOfUse
