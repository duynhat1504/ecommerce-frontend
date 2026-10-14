import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { getAdminDashboardSummary } from "../api/adminDashboardApi";
import { formatCurrency } from "../utils/formatCurrency";
import "./AdminHomePage.css";

const ORDER_STATUS_SUMMARY = [
  { key: "pendingOrders", label: "Chờ xác nhận" },
  { key: "confirmedOrders", label: "Đã xác nhận" },
  { key: "shippingOrders", label: "Đang giao" },
  { key: "completedOrders", label: "Hoàn thành" },
  { key: "cancelledOrders", label: "Đã hủy" },
  { key: "expiredOrders", label: "Hết hạn" },
];

function getOrderStatusLabel(status) {
  const labels = {
    PENDING: "Chờ xác nhận",
    CONFIRMED: "Đã xác nhận",
    SHIPPING: "Đang giao",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Đã hủy",
    EXPIRED: "Hết hạn",
  };

  return labels[status] || "Không khả dụng";
}

function getDateTimeLabel(value) {
  if (!value) {
    return "Không rõ thời gian";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Không rõ thời gian";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatNumber(value) {
  if (!Number.isFinite(Number(value))) {
    return "Không có dữ liệu";
  }

  return new Intl.NumberFormat("vi-VN").format(Number(value));
}

function getDashboardErrorMessage(error) {
  if (error?.status === 401 || error?.status === 403) {
    return "Phiên đăng nhập không còn quyền truy cập trang quản trị.";
  }

  if (error?.status >= 500) {
    return "Dữ liệu tổng quan tạm thời không khả dụng.";
  }

  if (!error?.status) {
    return "Không thể kết nối đến máy chủ.";
  }

  return "Không thể tải dữ liệu tổng quan.";
}

function DashboardSkeleton() {
  return (
    <div className="admin-home__skeleton" aria-hidden="true">
      <div className="admin-home__kpi-grid">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="admin-home__kpi admin-home__kpi--skeleton" key={index}>
            <span className="admin-home__skeleton-line admin-home__skeleton-line--label" />
            <span className="admin-home__skeleton-line admin-home__skeleton-line--value" />
            <span className="admin-home__skeleton-line admin-home__skeleton-line--note" />
          </div>
        ))}
      </div>

      <div className="admin-home__content-grid">
        <section className="admin-home__section admin-home__section--wide">
          <span className="admin-home__skeleton-line admin-home__skeleton-line--heading" />
          <div className="admin-home__skeleton-rows">
            {Array.from({ length: 4 }, (_, index) => (
              <span className="admin-home__skeleton-line" key={index} />
            ))}
          </div>
        </section>
        <section className="admin-home__section">
          <span className="admin-home__skeleton-line admin-home__skeleton-line--heading" />
          <div className="admin-home__skeleton-rows">
            {Array.from({ length: 3 }, (_, index) => (
              <span className="admin-home__skeleton-line" key={index} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function DashboardContent({ summary }) {
  const kpis = [
    {
      label: "Đơn hàng hôm nay",
      value: formatNumber(summary.todayOrders),
      note: "Đơn được tạo trong ngày",
    },
    {
      label: "Doanh thu hôm nay",
      value: formatCurrency(summary.todayRevenue) || "Không có dữ liệu",
      note: "Từ đơn hàng đã hoàn thành",
    },
    {
      label: "Chờ xử lý",
      value: formatNumber(summary.pendingOrders),
      note: "Đơn đang chờ xác nhận",
    },
    {
      label: "Sản phẩm sắp hết",
      value: formatNumber(summary.lowStockProducts),
      note: "Tồn kho từ 5 sản phẩm trở xuống",
    },
  ];

  const storeStats = [
    {
      title: "Sản phẩm",
      items: [
        ["Tổng sản phẩm", summary.totalProducts],
        ["Đang bán", summary.activeProducts],
      ],
    },
    {
      title: "Người dùng",
      items: [
        ["Tổng người dùng", summary.totalUsers],
        ["Đang hoạt động", summary.activeUsers],
      ],
    },
    {
      title: "Đơn hàng",
      items: [
        ["Tổng đơn hàng", summary.totalOrders],
        ["Hoàn thành", summary.completedOrders],
      ],
    },
  ];

  const recentOrders = Array.isArray(summary.recentOrders)
    ? summary.recentOrders
    : [];
  const lowStockItems = Array.isArray(summary.lowStockItems)
    ? summary.lowStockItems
    : [];

  return (
    <>
      <dl className="admin-home__kpi-grid">
        {kpis.map((kpi) => (
          <div className="admin-home__kpi" key={kpi.label}>
            <dt>{kpi.label}</dt>
            <dd>{kpi.value}</dd>
            <p>{kpi.note}</p>
          </div>
        ))}
      </dl>

      <section className="admin-home__section" aria-labelledby="store-summary-title">
        <div className="admin-home__section-header">
          <h2 id="store-summary-title">Tổng quan cửa hàng</h2>
        </div>
        <div className="admin-home__store-stats">
          {storeStats.map((group) => (
            <section className="admin-home__store-stat" aria-label={group.title} key={group.title}>
              <h3>{group.title}</h3>
              <dl>
                {group.items.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{formatNumber(value)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </section>

      <section className="admin-home__section" aria-labelledby="order-status-title">
        <div className="admin-home__section-header">
          <h2 id="order-status-title">Trạng thái đơn hàng</h2>
        </div>
        <dl className="admin-home__order-statuses">
          {ORDER_STATUS_SUMMARY.map(({ key, label }) => (
            <div key={key}>
              <dt>{label}</dt>
              <dd>{formatNumber(summary[key])}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="admin-home__content-grid">
        <section
          className="admin-home__section admin-home__section--wide"
          aria-labelledby="recent-orders-title"
        >
          <div className="admin-home__section-header admin-home__section-header--split">
            <h2 id="recent-orders-title">Đơn hàng gần đây</h2>
            <Link to="/admin/orders">Xem tất cả đơn hàng</Link>
          </div>
          {recentOrders.length ? (
            <table className="admin-home__orders-table">
              <thead>
                <tr>
                  <th scope="col">Mã đơn</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Tổng tiền</th>
                  <th scope="col">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => {
                  const orderReference = order.orderCode || order.id || "Đơn hàng";
                  const orderPath = order.id
                    ? `/admin/orders/${encodeURIComponent(order.id)}`
                    : "/admin/orders";

                  return (
                    <tr key={order.id || orderReference}>
                      <th scope="row" data-label="Mã đơn">
                        <Link to={orderPath} title={orderReference}>
                          {orderReference}
                        </Link>
                      </th>
                      <td data-label="Trạng thái">
                        <span className="admin-home__status">
                          {getOrderStatusLabel(order.status)}
                        </span>
                      </td>
                      <td data-label="Tổng tiền">
                        {formatCurrency(order.totalAmount) || "Không có dữ liệu"}
                      </td>
                      <td data-label="Thời gian">{getDateTimeLabel(order.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="admin-home__empty">Chưa có đơn hàng gần đây.</p>
          )}
        </section>

        <section className="admin-home__section" aria-labelledby="low-stock-title">
          <div className="admin-home__section-header admin-home__section-header--split">
            <h2 id="low-stock-title">Sản phẩm sắp hết</h2>
            <Link to="/admin/inventory">Xem kho hàng</Link>
          </div>
          {lowStockItems.length ? (
            <ul className="admin-home__low-stock-list">
              {lowStockItems.map((item) => (
                <li key={item.id || item.name}>
                  <span>{item.name || "Sản phẩm"}</span>
                  <strong>Còn {formatNumber(item.stock)} sản phẩm</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-home__empty">Không có sản phẩm nào sắp hết hàng.</p>
          )}
        </section>
      </div>
    </>
  );
}

export default function AdminHomePage() {
  const [dashboardState, setDashboardState] = useState({
    status: "loading",
    data: null,
    message: "",
  });
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      setDashboardState({ status: "loading", data: null, message: "" });

      try {
        const summary = await getAdminDashboardSummary({ signal: controller.signal });

        setDashboardState({ status: "success", data: summary, message: "" });
      } catch (error) {
        if (error.name === "AbortError") {
          return;
        }

        setDashboardState({
          status: "error",
          data: null,
          message: getDashboardErrorMessage(error),
        });
      }
    }

    loadDashboard();

    return () => {
      controller.abort();
    };
  }, [retryKey]);

  return (
    <section className="admin-home" aria-labelledby="admin-home-title">
      <header className="admin-home__header">
        <p className="admin-home__kicker">Quản trị</p>
        <h1 id="admin-home-title">Tổng quan vận hành</h1>
        <p className="admin-home__description">
          Theo dõi nhanh tình hình đơn hàng, doanh thu, kho hàng và người dùng.
        </p>
      </header>

      {dashboardState.status === "loading" ? (
        <div aria-live="polite">
          <p className="sr-only">Đang tải dữ liệu tổng quan.</p>
          <DashboardSkeleton />
        </div>
      ) : null}

      {dashboardState.status === "error" ? (
        <section className="admin-home__error" role="alert" aria-live="assertive">
          <h2>Không thể tải dữ liệu tổng quan.</h2>
          <p>{dashboardState.message}</p>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => setRetryKey((key) => key + 1)}
          >
            Thử lại
          </button>
        </section>
      ) : null}

      {dashboardState.status === "success" ? (
        <DashboardContent summary={dashboardState.data} />
      ) : null}
    </section>
  );
}
