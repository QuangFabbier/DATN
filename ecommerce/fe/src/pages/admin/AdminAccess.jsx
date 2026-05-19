import { useEffect, useMemo, useState } from "react";
import EmptyState from "../../components/EmptyState";
import { ButtonSpinner } from "../../components/Spinner";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";
import {
  getAdminAccessList,
  grantSubAdminAccess,
  revokeSubAdminAccess,
} from "../../services/authService";
import { withMinimumDelay } from "../../utils/timing";

function formatDate(dateValue) {
  if (!dateValue) {
    return "N/A";
  }

  return new Date(dateValue).toLocaleString("vi-VN");
}

function AdminAccess() {
  const { token, user } = useAuth();
  const { showToast } = useToast();
  const [admins, setAdmins] = useState([]);
  const [emailInput, setEmailInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [revokingEmail, setRevokingEmail] = useState("");

  const canManageAdmins = Boolean(user?.canManageAdmins);

  useEffect(() => {
    async function fetchAdmins() {
      if (!canManageAdmins) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const response = await withMinimumDelay(getAdminAccessList(token), 220);
        setAdmins(Array.isArray(response?.admins) ? response.admins : []);
      } catch (requestError) {
        setError(
          requestError?.response?.data?.message ||
            requestError.message ||
            "Không thể tải danh sách admin",
        );
      } finally {
        setLoading(false);
      }
    }

    fetchAdmins();
  }, [canManageAdmins, token]);

  const sortedAdmins = useMemo(() => {
    return [...admins].sort((firstAdmin, secondAdmin) => {
      if (firstAdmin.isSuperAdmin && !secondAdmin.isSuperAdmin) {
        return -1;
      }

      if (!firstAdmin.isSuperAdmin && secondAdmin.isSuperAdmin) {
        return 1;
      }

      return String(firstAdmin.email || "").localeCompare(
        String(secondAdmin.email || ""),
      );
    });
  }, [admins]);

  async function handleGrantAdmin(event) {
    event.preventDefault();

    const normalizedEmail = emailInput.trim().toLowerCase();
    if (!normalizedEmail || submitting) {
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      await grantSubAdminAccess(token, normalizedEmail);
      const response = await getAdminAccessList(token);
      setAdmins(Array.isArray(response?.admins) ? response.admins : []);
      setEmailInput("");
      showToast({
        type: "success",
        title: "Đã cấp quyền admin phụ",
        message: `Email ${normalizedEmail} đã có quyền quản trị sản phẩm.`,
      });
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        requestError.message ||
        "Không thể cấp quyền admin";
      setError(message);
      showToast({
        type: "error",
        title: "Cấp quyền thất bại",
        message,
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRevokeAdmin(email) {
    const normalizedEmail = String(email || "")
      .trim()
      .toLowerCase();

    if (!normalizedEmail || revokingEmail) {
      return;
    }

    const shouldRevoke = window.confirm(
      `Thu hồi quyền admin của ${normalizedEmail}?`,
    );
    if (!shouldRevoke) {
      return;
    }

    try {
      setRevokingEmail(normalizedEmail);
      setError("");
      await revokeSubAdminAccess(token, normalizedEmail);
      const response = await getAdminAccessList(token);
      setAdmins(Array.isArray(response?.admins) ? response.admins : []);
      showToast({
        type: "success",
        title: "Đã thu hồi quyền admin phụ",
        message: `Email ${normalizedEmail} đã bị thu hồi quyền quản trị.`,
      });
    } catch (requestError) {
      const message =
        requestError?.response?.data?.message ||
        requestError.message ||
        "Không thể thu hồi quyền admin";
      setError(message);
      showToast({
        type: "error",
        title: "Thu hồi quyền thất bại",
        message,
      });
    } finally {
      setRevokingEmail("");
    }
  }

  if (!canManageAdmins) {
    return (
      <EmptyState
        title="Chỉ super admin mới quản lý được admin phụ"
        description="Bạn đang đăng nhập bằng tài khoản admin phụ, nên không có quyền cấp hoặc thu hồi admin khác."
        icon="fa-user-shield"
      />
    );
  }

  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-page-header">
          <div>
            <p className="eyebrow">Phân quyền</p>
            <h2>Admin Access</h2>
          </div>
        </div>
        <p>Đang tải danh sách admin...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <p className="eyebrow">Phân quyền</p>
          <h2>Quản lý admin phụ</h2>
        </div>
      </div>

      {error ? <p className="auth-error">{error}</p> : null}

      <form
        className="admin-form-card admin-access-form"
        onSubmit={handleGrantAdmin}
      >
        <div className="admin-form-header">
          <div>
            <h3>Cấp quyền admin phụ</h3>
            <p>Email phải là tài khoản đã đăng ký trong hệ thống.</p>
          </div>
        </div>

        <div className="admin-form-grid">
          <label className="admin-form-full">
            Email tài khoản cần cấp quyền
            <input
              type="email"
              value={emailInput}
              onChange={(event) => setEmailInput(event.target.value)}
              placeholder="user@example.com"
            />
          </label>
        </div>

        <div className="admin-form-actions">
          <button type="submit" className="button" disabled={submitting}>
            {submitting ? (
              <>
                <ButtonSpinner size="sm" />
                <span>Đang cấp quyền...</span>
              </>
            ) : (
              "Cấp quyền admin phụ"
            )}
          </button>
        </div>
      </form>

      <div className="admin-table-card">
        <div className="admin-table-meta">
          <span>{sortedAdmins.length} tài khoản admin</span>
        </div>

        {sortedAdmins.length === 0 ? (
          <EmptyState
            title="Chưa có admin nào"
            description="Hệ thống chưa có tài khoản admin phụ nào được cấp từ giao diện."
            icon="fa-user-plus"
          />
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Email</th>
                  <th>Phân loại</th>
                  <th>Ngày tạo</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {sortedAdmins.map((admin) => {
                  const normalizedEmail = String(admin.email || "")
                    .trim()
                    .toLowerCase();
                  const isRevoking = revokingEmail === normalizedEmail;

                  return (
                    <tr key={String(admin.id || normalizedEmail)}>
                      <td>{admin.name || "N/A"}</td>
                      <td>{normalizedEmail}</td>
                      <td>
                        {admin.isSuperAdmin ? "Super Admin" : "Admin phụ"}
                      </td>
                      <td>{formatDate(admin.createdAt)}</td>
                      <td>
                        {admin.isSuperAdmin ? (
                          <span className="section-heading-meta">
                            Không thể thu hồi quyền hạn
                          </span>
                        ) : (
                          <button
                            type="button"
                            className="button admin-danger-button"
                            onClick={() => handleRevokeAdmin(normalizedEmail)}
                            disabled={isRevoking}
                          >
                            {isRevoking ? (
                              <>
                                <ButtonSpinner size="sm" />
                                <span>Đang thu hồi...</span>
                              </>
                            ) : (
                              "Thu hồi"
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminAccess;
