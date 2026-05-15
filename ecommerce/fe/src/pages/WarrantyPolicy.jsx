import Breadcrumbs from '../components/Breadcrumbs'

function WarrantyPolicy() {
  return (
    <section className="page-section">
      <Breadcrumbs items={[{ label: 'Trang chủ', to: '/' }, { label: 'Quy định bảo hành' }]} />

      <div className="section-heading compact">
        <div>
          <p className="eyebrow">Nexora Policy</p>
          <h1>Quy Định Bảo Hành</h1>
          <p className="section-heading-meta">Cập nhật lần gần nhất: 14/05/2026</p>
        </div>
      </div>

      <article className="form-card privacy-policy-card">
        <h2>Chính sách bảo hành chung</h2>
        <p>
          Quy định bảo hành này áp dụng cho các sản phẩm được mua tại Nexora. Chính sách đổi/trả sản phẩm chỉ áp dụng
          với các sản phẩm bị lỗi do nhà sản xuất và còn đủ điều kiện bảo hành.
        </p>
        <p>
          Trong thời gian sử dụng, nếu gặp trục trặc hoặc lỗi sản phẩm, khách hàng có thể mang sản phẩm đến điểm tiếp
          nhận bảo hành của Nexora hoặc trung tâm bảo hành chính hãng theo hướng dẫn từ đội ngũ hỗ trợ.
        </p>

        <h2>Danh mục sản phẩm và phương án xử lý</h2>
        <div className="warranty-policy-table-wrap">
          <table className="warranty-policy-table">
            <thead>
              <tr>
                <th>DANH MỤC SẢN PHẨM</th>
                <th>PHƯƠNG ÁN XỬ LÝ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>CPU - SSD - RAM - NGUỒN</td>
                <td>
                  ĐỔI MỚI <span>100%</span> TRONG <span>3 NĂM</span> ĐẦU SỬ DỤNG
                </td>
              </tr>
              <tr>
                <td>MAINBOARD - HDD - VGA</td>
                <td>
                  ĐỔI MỚI <span>100%</span> TRONG <span>6 THÁNG</span> ĐẦU SỬ DỤNG
                </td>
              </tr>
              <tr>
                <td>MÀN HÌNH - THIẾT BỊ MẠNG - GEAR - PHỤ KIỆN</td>
                <td>
                  ĐỔI MỚI <span>100%</span> TRONG <span>1 THÁNG</span> ĐẦU SỬ DỤNG
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="warranty-policy-note">
          LƯU Ý: MÀN HÌNH - GEAR CẦN GIỮ VỎ HỘP ĐẦY ĐỦ PHỤ KIỆN. NGOẠI HÌNH KHÔNG BỊ VA ĐẬP, XƯỚC DĂM.
        </p>
        <p className="warranty-policy-note">
          &quot; Đổi trả sản phẩm chỉ áp dụng với những sản phẩm bị lỗi do hãng sản xuất và còn đủ điều kiện bảo
          hành. &quot;
        </p>

        <h2>1. Điều kiện bảo hành hợp lệ</h2>
        <ul>
          <li>Sản phẩm còn nguyên vẹn, không nứt vỡ, không biến dạng do tác động ngoại lực.</li>
          <li>Sản phẩm không có dấu hiệu ẩm, vào nước hoặc chạm mạch.</li>
          <li>Sản phẩm còn nguyên thông tin S/N và tem nhà phân phối/tem bảo hành.</li>
          <li>Sản phẩm còn trong thời hạn bảo hành theo quy định.</li>
        </ul>

        <h2>2. Điều kiện từ chối bảo hành</h2>
        <ul>
          <li>Sản phẩm hư hỏng do thiên tai, hỏa hoạn, lũ lụt, sét đánh, côn trùng hoặc động vật xâm nhập.</li>
          <li>Sản phẩm bị ẩm, bị vào nước hoặc đặt trong môi trường bụi bẩn/ẩm ướt kéo dài.</li>
          <li>Sản phẩm biến dạng do nhiệt độ cao hoặc do các tác động bên ngoài.</li>
          <li>Sản phẩm có dấu hiệu mốc, rỉ sét, ăn mòn hoặc oxy hóa do hóa chất.</li>
          <li>Sản phẩm hư hỏng do sử dụng sai điện thế hoặc dòng điện chỉ định.</li>
          <li>Khuyết tật ngoại quan do người dùng gây ra như nứt vỡ, trầy xước, cong vênh.</li>
          <li>Sản phẩm đã hết thời hạn bảo hành.</li>
        </ul>

        <h2>3. Thời gian xử lý bảo hành</h2>
        <p>
          Thời gian xử lý bảo hành trung bình là 7 ngày làm việc (không tính Chủ nhật và ngày lễ). Trường hợp hoàn tất
          sớm hơn, Nexora sẽ chủ động thông báo để khách hàng nhận lại sản phẩm.
        </p>
        <p>
          Nếu sản phẩm bảo hành không còn hàng để thay thế hoặc không thể sửa chữa, Nexora sẽ hỗ trợ đổi sản phẩm
          tương đương hoặc thu hồi theo mức giá thỏa thuận tại thời điểm xử lý.
        </p>
        <p>
          Trong thời gian bảo hành, nếu khách hàng có nhu cầu mượn sản phẩm sử dụng tạm thời, Nexora sẽ hỗ trợ trong
          phạm vi hàng sẵn có.
        </p>
        <p>
          Lưu ý: Nexora không chịu trách nhiệm đối với dữ liệu và phần mềm của khách hàng trong quá trình bảo hành.
        </p>

        <h2>4. Địa chỉ tiếp nhận bảo hành</h2>
        <ul>
          <li>Hà Nội: 52B ngõ 4 Hoàng Quốc Việt, Nghĩa Đô, Hà Nội</li>
          <li>Thanh Hóa: 55 Nghiêm Quý Ngãi, Hầm Rồng, tỉnh Thanh Hóa</li>
        </ul>
        <p>
          Hotline: 0982241317
          <br />
          Email: nguyenminhquang0325@gmail.com
        </p>
      </article>
    </section>
  )
}

export default WarrantyPolicy
