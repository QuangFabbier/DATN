import { useMemo, useState } from "react";
import AvatarUploader from "../../components/account/AvatarUploader";
import SettingsInput from "../../components/account/SettingsInput";
import SettingsSection from "../../components/account/SettingsSection";
import { Skeleton } from "../../components/Skeleton";
import { ButtonSpinner } from "../../components/Spinner";
import { useAuth } from "../../hooks/useAuth";
import { useInitialRender } from "../../hooks/useInitialRender";
import { useToast } from "../../hooks/useToast";
import {
  getAddresses,
  getProfile,
  saveProfile,
} from "../../services/accountStorage";
import { wait } from "../../utils/timing";

const vietnamesePhoneRegex = /^(0|\+84)(3|5|7|8|9)\d{8}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function AccountProfile() {
  const { user } = useAuth();
  const isInitialRenderReady = useInitialRender();
  const { showToast } = useToast();
  const [profile, setProfile] = useState(() => getProfile(user));
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const addresses = useMemo(() => getAddresses(), []);

  const defaultAddressOptions = useMemo(() => {
    return addresses.map((address) => ({
      value: address.id,
      label: `${address.fullName} - ${address.detail}, ${address.ward}, ${address.district}`,
    }));
  }, [addresses]);

  function handleChange(event) {
    const { name, value } = event.target;

    setProfile((currentState) => ({
      ...currentState,
      [name]: value,
    }));

    setErrors((currentErrors) => ({
      ...currentErrors,
      [name]: "",
    }));
  }

  function validateProfile() {
    const nextErrors = {};

    if (!profile.fullName.trim()) {
      nextErrors.fullName = "Vui lòng nhập họ tên.";
    }

    if (!profile.displayName.trim()) {
      nextErrors.displayName = "Vui lòng nhập tên hiển thị.";
    }

    if (profile.email.trim() && !emailRegex.test(profile.email.trim())) {
      nextErrors.email = "Email chưa đúng định dạng.";
    }

    if (
      profile.phone.trim() &&
      !vietnamesePhoneRegex.test(profile.phone.trim())
    ) {
      nextErrors.phone = "Số điện thoại chưa đúng định dạng Việt Nam.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSaveProfile(event) {
    event.preventDefault();

    if (!validateProfile() || isSaving) {
      showToast({
        type: "warning",
        title: "Chưa thể lưu hồ sơ",
        message:
          "Vui lòng kiểm tra lại thông tin bắt buộc hoặc định dạng dữ liệu.",
      });
      return;
    }

    setIsSaving(true);
    await wait(640);

    saveProfile(profile);
    setIsSaving(false);

    showToast({
      type: "success",
      title: "Đã cập nhật hồ sơ",
      message: "Thông tin cá nhân đã được lưu trong localStorage.",
    });
  }

  if (!isInitialRenderReady) {
    return (
      <div className="account-settings-section">
        <Skeleton style={{ width: "42%", height: 22 }} />
        <Skeleton style={{ width: "100%", height: 260, borderRadius: 20 }} />
      </div>
    );
  }

  return (
    <SettingsSection
      eyebrow="Tài khoản"
      title="Hồ sơ cá nhân"
      description="Cập nhật thông tin hiển thị và địa chỉ mặc định để checkout nhanh hơn ở các bước sau."
      actions={
        <button
          type="submit"
          className="button"
          form="account-profile-form"
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <ButtonSpinner size="sm" />
              <span>Đang lưu...</span>
            </>
          ) : (
            <>
              <i className="fa-solid fa-floppy-disk" aria-hidden="true" />
              <span>Lưu thay đổi</span>
            </>
          )}
        </button>
      }
    >
      <form
        id="account-profile-form"
        className="account-settings-card"
        onSubmit={handleSaveProfile}
      >
        <AvatarUploader
          value={profile.avatar}
          onChange={(avatarData) => {
            setProfile((currentState) => ({
              ...currentState,
              avatar: avatarData,
            }));
          }}
          name={profile.displayName || profile.fullName || "Nexora"}
        />

        <div className="account-grid">
          <SettingsInput
            label="Họ và tên"
            name="fullName"
            value={profile.fullName}
            onChange={handleChange}
            placeholder="Nguyễn Văn A"
            error={errors.fullName}
          />

          <SettingsInput
            label="Tên hiển thị"
            name="displayName"
            value={profile.displayName}
            onChange={handleChange}
            placeholder="nexora_fan"
            error={errors.displayName}
          />

          <SettingsInput
            type="email"
            label="Email"
            name="email"
            value={profile.email}
            onChange={handleChange}
            placeholder="you@example.com"
            error={errors.email}
          />

          <SettingsInput
            type="tel"
            label="Số điện thoại"
            name="phone"
            value={profile.phone}
            onChange={handleChange}
            placeholder="098xxxxxxx"
            error={errors.phone}
          />

          <SettingsInput
            as="select"
            label="Giới tính"
            name="gender"
            value={profile.gender}
            onChange={handleChange}
          >
            <option value="">Chọn giới tính</option>
            <option value="male">Nam</option>
            <option value="female">Nữ</option>
            <option value="other">Khác</option>
            <option value="preferNot">Không muốn chia sẻ</option>
          </SettingsInput>

          <SettingsInput
            type="date"
            label="Ngày sinh"
            name="birthday"
            value={profile.birthday}
            onChange={handleChange}
          />

          <SettingsInput
            as="select"
            label="Địa chỉ mặc định"
            name="defaultAddress"
            value={profile.defaultAddress}
            onChange={handleChange}
            fieldClassName="account-full-width"
            hint={
              defaultAddressOptions.length > 0
                ? "Địa chỉ này sẽ ưu tiên khi checkout."
                : "Bạn chưa có địa chỉ lưu sẵn, hãy thêm ở tab Địa chỉ giao hàng."
            }
          >
            <option value="">Chưa chọn địa chỉ mặc định</option>
            {defaultAddressOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SettingsInput>
        </div>
      </form>
    </SettingsSection>
  );
}

export default AccountProfile;
