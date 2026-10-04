import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import Chart from "chart.js/auto";

const money = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
});
const number = new Intl.NumberFormat("id-ID");
const compactMoney = (value) => `Rp${number.format(Number(value) || 0)}`;
const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
function downloadCsv(filename, lines) {
    const blob = new Blob(["\uFEFF" + lines.join("\n")], {
            type: "text/csv;charset=utf-8",
        }),
        url = URL.createObjectURL(blob),
        link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}
function printDocument(target, paper = "80mm") {
    const root = document.documentElement;
    root.dataset.printTarget = target;
    root.dataset.paper = paper;
    document.getElementById("pc-dynamic-print")?.remove();
    const style = document.createElement("style");
    style.id = "pc-dynamic-print";
    const exact = {
        label30: "30mm 20mm",
        label40: "40mm 30mm",
        label50: "50mm 30mm",
        label50x40: "50mm 40mm",
    }[paper];
    style.textContent = `@media print{@page{size:${exact || "auto"};margin:0}}`;
    document.head.appendChild(style);
    const clear = () => {
        delete root.dataset.printTarget;
        delete root.dataset.paper;
        style.remove();
        window.removeEventListener("afterprint", clear);
    };
    window.addEventListener("afterprint", clear);
    setTimeout(() => window.print(), 60);
}
const iconPaths = {
    dashboard:
        '<path d="M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z"/>',
    cashier: '<path d="M4 4h16v5H4V4Zm1 8h14v8H5v-8Zm3 2v4m4-4v4m4-4v4"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6M9 12h6M9 16h4"/>',
    box: '<path d="m4 7 8-4 8 4-8 4-8-4Zm0 0v10l8 4 8-4V7M12 11v10"/>',
    layers: '<path d="m12 2 9 5-9 5-9-5 9-5Zm-9 10 9 5 9-5M3 17l9 5 9-5"/>',
    truck: '<path d="M3 5h11v11H3V5Zm11 4h4l3 4v3h-7V9ZM7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    supplier:
        '<path d="M3 21V7l9-4 9 4v14M7 10h2m6 0h2M7 14h2m6 0h2m-6 7v-5h2v5"/>',
    wallet: '<path d="M3 6h16a2 2 0 0 1 2 2v10H5a2 2 0 0 1-2-2V6Zm0 0a2 2 0 0 1 2-2h12v2m0 5h4v4h-4a2 2 0 0 1 0-4Z"/>',
    chart: '<path d="M4 20V10m5 10V4m5 16v-7m5 7V7"/>',
    team: '<path d="M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8 1a3 3 0 1 0 0-6m-1 15v-2a5 5 0 0 0-5-5H6a5 5 0 0 0-5 5v2m16-7a5 5 0 0 1 5 5v2"/>',
    settings:
        '<circle cx="12" cy="12" r="3"/><path d="M19 15a2 2 0 0 0 .4 2l-2.4 2.4a2 2 0 0 0-2-.4 2 2 0 0 0-1 2h-4a2 2 0 0 0-1-2 2 2 0 0 0-2 .4L4.6 17A2 2 0 0 0 5 15a2 2 0 0 0-2-1v-4a2 2 0 0 0 2-1 2 2 0 0 0-.4-2L7 4.6A2 2 0 0 0 9 5a2 2 0 0 0 1-2h4a2 2 0 0 0 1 2 2 2 0 0 0 2-.4L19.4 7A2 2 0 0 0 19 9a2 2 0 0 0 2 1v4a2 2 0 0 0-2 1Z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
    chevron: '<path d="m9 18 6-6-6-6"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    logout: '<path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5M14 8l4 4-4 4m4-4H8"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2m-9 0 1 15h8l1-15M10 11v6m4-6v6"/>',
    edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4L16.5 3.5Z"/>',
    download: '<path d="M12 3v12m0 0 5-5m-5 5-5-5M5 21h14"/>',
    scan: '<path d="M3 8V4h4m10 0h4v4M3 16v4h4m10 0h4v-4M7 9v6m3-6v6m4-6v6m3-6v6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    arrowUp: '<path d="m18 15-6-6-6 6"/>',
};
function Icon({ name, size = 20 }) {
    return (
        <svg
            className="icon"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            dangerouslySetInnerHTML={{
                __html: iconPaths[name] || iconPaths.box,
            }}
        />
    );
}
const navGroups = [
    {
        label: "Penjualan",
        items: [
            ["dashboard", "Dashboard", "dashboard"],
            ["cashier", "Transaksi Kasir", "cashier"],
            ["suspended", "Transaksi Tunda", "receipt"],
            ["sales", "Rekap Transaksi", "chart"],
        ],
    },
    {
        label: "Koleksi & Stok",
        items: [
            ["products", "Produk Pakaian", "box"],
            ["inventory", "Daftar Stok", "layers"],
            ["stock-opname", "Stok Opname", "scan"],
            ["activity", "Mutasi Stok", "scan"],
            ["purchases", "Pembelian", "truck"],
        ],
    },
    {
        label: "Relasi",
        items: [
            ["customers", "Pelanggan", "users"],
            ["suppliers", "Pemasok", "supplier"],
            ["promotions", "Promo & Diskon", "receipt"],
        ],
    },
    {
        label: "Administrasi",
        items: [
            ["expenses", "Pengeluaran", "wallet"],
            ["finance", "Hutang Piutang", "wallet"],
            ["reports", "Laporan Keuangan", "chart"],
            ["employees", "Akun Kasir", "team"],
        ],
    },
];
const pageTitles = {
    dashboard: [
        "Dashboard Putri Collection",
        "Ringkasan butik dan penjualan hari ini.",
    ],
    cashier: [
        "Transaksi Kasir",
        "Pilih barang dan warna yang tersedia.",
    ],
    suspended: ["Transaksi Tunda", "Lanjutkan pesanan yang belum dibayar."],
    sales: ["Rekap Transaksi", "Filter, lihat detail, dan cetak ulang struk."],
    products: [
        "Produk Pakaian",
        "Kelola foto, kategori, warna, harga, dan stok.",
    ],
    inventory: ["Daftar Stok", "Pantau stok setiap warna secara real-time."],
    "stock-opname": [
        "Stok Opname",
        "Cocokkan stok sistem dengan hasil hitung fisik.",
    ],
    activity: ["Aktivitas Stok", "Audit setiap pergerakan stok koleksi."],
    purchases: ["Pembelian", "Kelola penerimaan koleksi dari pemasok."],
    customers: ["Pelanggan", "Kelola data pelanggan Putri Collection."],
    suppliers: ["Manajemen Pemasok", "Kelola mitra dan rantai pasok butik."],
    promotions: ["Promo & Diskon", "Buat diskon untuk koleksi pilihan."],
    expenses: ["Pengeluaran", "Catat biaya operasional butik."],
    finance: ["Hutang & Piutang", "Pantau kewajiban dan tagihan."],
    reports: [
        "Laporan Keuangan",
        "Analisis penjualan, modal, diskon, dan laba.",
    ],
    employees: ["Akun Kasir", "Kelola akun dan hak akses kasir."],
    settings: [
        "Pengaturan Toko",
        "Sesuaikan profil dan preferensi Putri Collection.",
    ],
};
async function api(path, options = {}) {
    const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
    const response = await fetch(`/api/pos${path}`, {
        credentials: "same-origin",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(csrf ? { "X-CSRF-TOKEN": csrf } : {}),
            ...options.headers,
        },
        ...options,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(
            payload.errors
                ? Object.values(payload.errors).flat()[0]
                : payload.message || `Permintaan gagal (${response.status})`,
        );
    }
    return payload;
}
async function upload(path, file) {
    const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
    const body = new FormData();
    body.append("image", file);
    const response = await fetch(`/api/pos${path}`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
            Accept: "application/json",
            ...(csrf ? { "X-CSRF-TOKEN": csrf } : {}),
        },
        body,
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok)
        throw new Error(
            payload.errors
                ? Object.values(payload.errors).flat()[0]
                : payload.message || "Upload gagal.",
        );
    return payload;
}

function App({ appName = "Putri Collection" }) {
    const initial =
        location.pathname.split("/pos/")[1]?.split("/")[0] || "dashboard";
    const [page, setPage] = useState(
            pageTitles[initial] ? initial : "dashboard",
        ),
        [boot, setBoot] = useState(null),
        [dashboard, setDashboard] = useState(null),
        [products, setProducts] = useState([]),
        [sales, setSales] = useState([]),
        [suspended, setSuspended] = useState([]),
        [opname, setOpname] = useState(null),
        [purchases, setPurchases] = useState([]),
        [expenses, setExpenses] = useState([]),
        [report, setReport] = useState(null),
        [operations, setOperations] = useState(null),
        [userRows, setUserRows] = useState([]),
        [loading, setLoading] = useState(true),
        [sidebar, setSidebar] = useState(false),
        [modal, setModal] = useState(null),
        [toast, setToast] = useState(null),
        [cart, setCart] = useState([]),
        [customerId, setCustomerId] = useState(""),
        [resumedSuspended, setResumedSuspended] = useState(null);
    const showToast = (message, type = "success") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };
    const loadCore = async () => {
        setLoading(true);
        try {
            const [b, d, p] = await Promise.all([
                api("/bootstrap"),
                api("/dashboard"),
                api("/products?active_only=1&per_page=200"),
            ]);
            setBoot(b);
            setDashboard(d);
            setProducts(p.data);
        } catch (e) {
            showToast(e.message, "error");
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadCore();
    }, []);
    useEffect(() => {
        if (page === "sales")
            api("/sales")
                .then((r) => setSales(r.data))
                .catch((e) => showToast(e.message, "error"));
        if (page === "suspended")
            api("/suspended-transactions")
                .then((r) => setSuspended(r.data))
                .catch((e) => showToast(e.message, "error"));
        if (page === "stock-opname")
            api("/stock-opnames")
                .then(setOpname)
                .catch((e) => showToast(e.message, "error"));
        if (page === "purchases")
            api("/purchases").then((r) => setPurchases(r.data));
        if (page === "expenses")
            api("/expenses").then((r) => setExpenses(r.data));
        if (page === "reports") api("/reports").then(setReport);
        if (["activity", "promotions", "finance"].includes(page))
            api("/operations")
                .then(setOperations)
                .catch((e) => showToast(e.message, "error"));
        if (page === "employees" && boot?.permissions?.manage_users)
            api("/users")
                .then(setUserRows)
                .catch((e) => showToast(e.message, "error"));
    }, [page, boot?.permissions?.manage_users]);
    const role = boot?.user?.role || "cashier";
    const accessiblePages =
        role === "admin"
            ? Object.keys(pageTitles)
            : ["dashboard", "cashier", "suspended", "sales"];
    const navigate = (next) => {
        if (!accessiblePages.includes(next)) {
            showToast("Fitur ini dikunci untuk akun Kasir.", "error");
            return;
        }
        setPage(next);
        setSidebar(false);
        history.pushState(
            {},
            "",
            next === "dashboard" ? "/pos" : `/pos/${next}`,
        );
    };
    const refresh = async (message) => {
        await loadCore();
        if (message) showToast(message);
    };
    useEffect(() => {
        if (boot && !accessiblePages.includes(page)) {
            setPage("dashboard");
            history.replaceState({}, "", "/pos");
        }
    }, [boot, page, role]);
    const logout = async () => {
        const csrf = document.querySelector('meta[name="csrf-token"]')?.content;
        const response = await fetch("/logout", {
            method: "POST",
            headers: { "X-CSRF-TOKEN": csrf, Accept: "application/json" },
        });
        if (!response.ok)
            throw new Error("Sesi gagal diakhiri. Silakan coba lagi.");
        location.assign("/login");
    };
    if (loading && !boot) return <LoadingScreen appName={appName} />;
    return (
        <div className="app-shell">
            <aside className={`sidebar ${sidebar ? "is-open" : ""}`}>
                <div className="brand-wrap">
                    <button
                        className="brand"
                        onClick={() => navigate("dashboard")}
                    >
                        <span className="brand-mark putri-mark">
                            <img
                                src="/images/putri-collection-logo.svg"
                                alt="Putri Collection"
                            />
                        </span>
                        <span className="brand-copy">
                            <strong>PUTRI COLLECTION</strong>
                            <small>Muslim Fashion Boutique</small>
                        </span>
                    </button>
                    <button
                        className="icon-button mobile-close"
                        onClick={() => setSidebar(false)}
                    >
                        <Icon name="close" />
                    </button>
                </div>
                <div className="outlet-card">
                    <span className="outlet-icon">P</span>
                    <span>
                        <small>Toko aktif</small>
                        <strong>
                            {boot?.outlet?.name || "Putri Collection"}
                        </strong>
                    </span>
                    <Icon name="chevron" size={15} />
                </div>
                <nav>
                    {navGroups
                        .map((g) => ({
                            ...g,
                            items: g.items.filter(([id]) =>
                                accessiblePages.includes(id),
                            ),
                        }))
                        .filter((g) => g.items.length)
                        .map((g) => (
                            <div className="nav-group" key={g.label}>
                                <span className="nav-label">{g.label}</span>
                                {g.items.map(([id, label, icon]) => (
                                    <button
                                        key={id}
                                        className={`nav-item ${page === id ? "active" : ""}`}
                                        onClick={() => navigate(id)}
                                    >
                                        <Icon name={icon} size={19} />
                                        <span>{label}</span>
                                        {id === "inventory" &&
                                            dashboard?.metrics
                                                ?.low_stock_count > 0 && (
                                                <em>
                                                    {
                                                        dashboard.metrics
                                                            .low_stock_count
                                                    }
                                                </em>
                                            )}
                                        {id === "suspended" &&
                                            dashboard?.metrics
                                                ?.suspended_count > 0 && (
                                                <em>
                                                    {
                                                        dashboard.metrics
                                                            .suspended_count
                                                    }
                                                </em>
                                            )}
                                    </button>
                                ))}
                            </div>
                        ))}
                </nav>
                <div className="sidebar-bottom">
                    {boot?.permissions?.manage_settings && (
                        <button
                            className={`nav-item ${page === "settings" ? "active" : ""}`}
                            onClick={() => navigate("settings")}
                        >
                            <Icon name="settings" size={19} />
                            <span>Pengaturan</span>
                        </button>
                    )}
                    <div className="account-card">
                        <div className="avatar">
                            {initials(boot?.user?.name)}
                        </div>
                        <span>
                            <strong>{boot?.user?.name}</strong>
                            <small>{roleLabel(boot?.user?.role)}</small>
                        </span>
                        <button
                            className="logout-button"
                            title="Keluar dari aplikasi"
                            aria-label="Keluar dari aplikasi"
                            onClick={() => setModal("logout")}
                        >
                            <Icon name="logout" size={17} />
                        </button>
                    </div>
                </div>
            </aside>
            {sidebar && (
                <button
                    className="sidebar-scrim"
                    onClick={() => setSidebar(false)}
                />
            )}
            <main
                className={`main ${page === "cashier" ? "cashier-main" : ""}`}
            >
                <header className="topbar">
                    <div className="page-heading">
                        <button
                            className="icon-button menu-button"
                            onClick={() => setSidebar(true)}
                        >
                            <Icon name="menu" />
                        </button>
                        <div>
                            <h1>{pageTitles[page][0]}</h1>
                            <p>{pageTitles[page][1]}</p>
                        </div>
                    </div>
                    <div className="top-actions">
                        <span className={`role-badge role-${role}`}>
                            {roleLabel(role)}
                        </span>
                        <span className="live-badge">
                            <i /> Sinkron
                        </span>
                        <button className="icon-button notification">
                            <Icon name="bell" size={19} />
                            <b />
                        </button>
                        <button
                            className="user-chip"
                            onClick={() => setModal("logout")}
                        >
                            <span className="avatar small">
                                {initials(boot?.user?.name)}
                            </span>
                            <span>
                                <strong>
                                    {boot?.user?.name?.split(" ")[0]}
                                </strong>
                                <small>{roleLabel(boot?.user?.role)}</small>
                            </span>
                            <Icon name="logout" size={16} />
                        </button>
                    </div>
                </header>
                {page === "dashboard" &&
                    (role === "cashier" ? (
                        <CashierDashboard
                            data={dashboard}
                            onNavigate={navigate}
                        />
                    ) : (
                        <Dashboard data={dashboard} onNavigate={navigate} />
                    ))}{" "}
                {page === "cashier" && (
                    <Cashier
                        products={products}
                        categories={boot?.categories || []}
                        customers={boot?.customers || []}
                        cart={cart}
                        setCart={setCart}
                        customerId={customerId}
                        setCustomerId={setCustomerId}
                        onPay={() => cart.length && setModal("payment")}
                        onSuspend={() => cart.length && setModal("suspend")}
                        showToast={showToast}
                    />
                )}{" "}
                {page === "suspended" && (
                    <SuspendedPage
                        rows={suspended}
                        onContinue={(row) => {
                            setCart(
                                row.details.map((x) => ({
                                    id: x.product_id,
                                    product_variant_id: x.product_variant_id,
                                    name: x.product_name,
                                    sku: x.sku,
                                    color: x.color,
                                    selling_price: x.unit_price,
                                    quantity: Number(x.quantity),
                                    discount_amount: Number(x.discount_amount),
                                    stock:
                                        products
                                            .find((p) => p.id === x.product_id)
                                            ?.variants?.find(
                                                (v) =>
                                                    v.id ===
                                                    x.product_variant_id,
                                            )?.stock || 0,
                                    image: products.find(
                                        (p) => p.id === x.product_id,
                                    )?.image,
                                })),
                            );
                            setCustomerId(row.customer_id || "");
                            setResumedSuspended(row.id);
                            navigate("cashier");
                            showToast("Pesanan tunda dimuat ke keranjang.");
                        }}
                        onDelete={async (row) => {
                            if (!confirm(`Hapus ${row.name}?`)) return;
                            await api(`/suspended-transactions/${row.id}`, {
                                method: "DELETE",
                            });
                            setSuspended(
                                (await api("/suspended-transactions")).data,
                            );
                            showToast("Transaksi tunda dihapus.");
                        }}
                    />
                )}{" "}
                {page === "sales" && (
                    <SalesPage
                        sales={sales}
                        canVoid={boot?.permissions?.void_sales}
                        onVoid={async (sale) => {
                            const reason = prompt(
                                "Alasan pembatalan transaksi:",
                            );
                            if (!reason) return;
                            try {
                                await api(`/sales/${sale.id}/void`, {
                                    method: "POST",
                                    body: JSON.stringify({ reason }),
                                });
                                setSales((await api("/sales")).data);
                                refresh(
                                    "Transaksi dibatalkan dan stok dikembalikan.",
                                );
                            } catch (e) {
                                showToast(e.message, "error");
                            }
                        }}
                    />
                )}{" "}
                {page === "products" && (
                    <ProductsPage
                        products={products}
                        categories={boot?.categories || []}
                        canManage={boot?.permissions?.manage_products}
                        onCategories={() => setModal("categories")}
                        onAdd={() => setModal("product")}
                        onEdit={(product) =>
                            setModal({ type: "product", product })
                        }
                        onDelete={async (product) => {
                            if (!confirm(`Arsipkan produk ${product.name}?`))
                                return;
                            try {
                                await api(`/products/${product.id}`, {
                                    method: "DELETE",
                                });
                                await refresh("Produk berhasil diarsipkan.");
                            } catch (error) {
                                showToast(error.message, "error");
                            }
                        }}
                        onBarcode={(product) =>
                            setModal({ type: "barcode", product })
                        }
                    />
                )}{" "}
                {page === "inventory" && (
                    <InventoryPage
                        products={products}
                        onAdjust={(product) =>
                            setModal({ type: "stock", product })
                        }
                    />
                )}{" "}
                {page === "stock-opname" && (
                    <StockOpnamePage
                        data={opname}
                        onSaved={async () => {
                            setOpname(await api("/stock-opnames"));
                            await refresh(
                                "Stok opname tersimpan dan stok sistem diperbarui.",
                            );
                        }}
                        showToast={showToast}
                    />
                )}{" "}
                {page === "activity" && (
                    <StockActivityPage
                        data={operations?.stock_movements || []}
                    />
                )}{" "}
                {page === "purchases" && (
                    <PurchasesPage
                        rows={purchases}
                        onAdd={() => setModal("purchase")}
                    />
                )}{" "}
                {page === "customers" && (
                    <PeoplePage
                        type="customer"
                        rows={boot?.customers || []}
                        onAdd={() => setModal("customer")}
                    />
                )}{" "}
                {page === "suppliers" && (
                    <PeoplePage
                        type="supplier"
                        rows={boot?.suppliers || []}
                        onAdd={() => setModal("supplier")}
                    />
                )}{" "}
                {page === "promotions" && (
                    <PromotionsPage
                        rows={operations?.promotions || []}
                        onAdd={() => setModal("promotion")}
                    />
                )}{" "}
                {page === "expenses" && (
                    <ExpensesPage
                        rows={expenses}
                        onAdd={() => setModal("expense")}
                    />
                )}{" "}
                {page === "finance" && (
                    <FinancePage
                        rows={operations?.debts || []}
                        onPay={async (debt) => {
                            const amount = prompt(
                                "Jumlah pembayaran:",
                                Number(debt.total_amount) -
                                    Number(debt.paid_amount),
                            );
                            if (!amount) return;
                            try {
                                await api(`/debts/${debt.id}/pay`, {
                                    method: "POST",
                                    body: JSON.stringify({ amount }),
                                });
                                setOperations(await api("/operations"));
                                showToast("Pembayaran berhasil dicatat.");
                            } catch (e) {
                                showToast(e.message, "error");
                            }
                        }}
                    />
                )}{" "}
                {page === "reports" && (
                    <ReportsPage
                        report={report}
                        setReport={setReport}
                        showToast={showToast}
                    />
                )}{" "}
                {page === "employees" && (
                    <EmployeesPage
                        boot={boot}
                        users={userRows}
                        onAdd={() => setModal("user")}
                        onToggle={async (user) => {
                            try {
                                await api(`/users/${user.id}`, {
                                    method: "PUT",
                                    body: JSON.stringify({
                                        is_active: !user.is_active,
                                    }),
                                });
                                setUserRows(await api("/users"));
                                showToast("Status akun diperbarui.");
                            } catch (e) {
                                showToast(e.message, "error");
                            }
                        }}
                    />
                )}{" "}
                {page === "settings" && (
                    <SettingsPage boot={boot} showToast={showToast} />
                )}
            </main>
            {modal === "logout" && (
                <LogoutModal
                    user={boot?.user}
                    onClose={() => setModal(null)}
                    onConfirm={logout}
                    showToast={showToast}
                />
            )}{" "}
            {modal === "payment" && (
                <PaymentModal
                    cart={cart}
                    customers={boot?.customers || []}
                    customerId={customerId}
                    setCustomerId={setCustomerId}
                    onClose={() => setModal(null)}
                    onSuccess={async (sale) => {
                        if (resumedSuspended) {
                            await api(
                                `/suspended-transactions/${resumedSuspended}`,
                                { method: "DELETE" },
                            );
                            setResumedSuspended(null);
                        }
                        setModal(null);
                        setCart([]);
                        setCustomerId("");
                        await refresh();
                        setModal({ type: "success", sale });
                    }}
                    showToast={showToast}
                />
            )}{" "}
            {modal === "suspend" && (
                <SuspendModal
                    cart={cart}
                    customerId={customerId}
                    onClose={() => setModal(null)}
                    onSuccess={async () => {
                        setModal(null);
                        setCart([]);
                        setCustomerId("");
                        await refresh(
                            "Transaksi berhasil ditunda tanpa mengurangi stok.",
                        );
                    }}
                    showToast={showToast}
                />
            )}{" "}
            {modal === "categories" && (
                <CategoryManager
                    categories={boot?.categories || []}
                    onClose={() => setModal(null)}
                    onChanged={() => loadCore()}
                    showToast={showToast}
                />
            )}{" "}
            {(modal === "product" || modal?.type === "product") && (
                <ProductModal
                    product={modal?.product}
                    categories={boot?.categories || []}
                    units={boot?.units || []}
                    onClose={() => setModal(null)}
                    onSuccess={() => {
                        setModal(null);
                        refresh("Produk dan gambar berhasil disimpan.");
                    }}
                    showToast={showToast}
                />
            )}{" "}
            {modal?.type === "barcode" && (
                <BarcodeModal
                    product={modal.product}
                    onClose={() => setModal(null)}
                />
            )}{" "}
            {modal?.type === "stock" && (
                <StockModal
                    product={modal.product}
                    onClose={() => setModal(null)}
                    onSuccess={() => {
                        setModal(null);
                        refresh("Stok berhasil diperbarui.");
                    }}
                    showToast={showToast}
                />
            )}{" "}
            {modal === "customer" && (
                <SimpleFormModal
                    title="Pelanggan Baru"
                    fields={[
                        ["name", "Nama lengkap"],
                        ["phone", "Nomor telepon"],
                        ["email", "Email"],
                        ["address", "Alamat"],
                    ]}
                    endpoint="/customers"
                    onClose={() => setModal(null)}
                    onSuccess={() => {
                        setModal(null);
                        refresh("Pelanggan baru ditambahkan.");
                    }}
                    showToast={showToast}
                />
            )}{" "}
            {modal === "supplier" && (
                <SimpleFormModal
                    title="Pemasok Baru"
                    fields={[
                        ["name", "Nama perusahaan"],
                        ["contact_person", "Kontak person"],
                        ["phone", "Nomor telepon"],
                        ["email", "Email"],
                        ["address", "Alamat"],
                    ]}
                    endpoint="/suppliers"
                    onClose={() => setModal(null)}
                    onSuccess={() => {
                        setModal(null);
                        refresh("Pemasok baru ditambahkan.");
                    }}
                    showToast={showToast}
                />
            )}{" "}
            {modal === "expense" && (
                <ExpenseModal
                    onClose={() => setModal(null)}
                    onSuccess={async () => {
                        setModal(null);
                        setExpenses((await api("/expenses")).data);
                        showToast("Pengeluaran berhasil dicatat.");
                    }}
                    showToast={showToast}
                />
            )}{" "}
            {modal === "purchase" && (
                <PurchaseModal
                    products={products}
                    suppliers={boot?.suppliers || []}
                    onClose={() => setModal(null)}
                    onSuccess={async () => {
                        setModal(null);
                        setPurchases((await api("/purchases")).data);
                        refresh("Pembelian diterima dan stok diperbarui.");
                    }}
                    showToast={showToast}
                />
            )}{" "}
            {modal === "promotion" && (
                <PromotionModal
                    onClose={() => setModal(null)}
                    onSuccess={async () => {
                        setModal(null);
                        setOperations(await api("/operations"));
                        showToast("Promo baru berhasil dibuat.");
                    }}
                    showToast={showToast}
                />
            )}{" "}
            {modal === "user" && (
                <UserModal
                    outlets={boot?.outlets || []}
                    onClose={() => setModal(null)}
                    onSuccess={async () => {
                        setModal(null);
                        setUserRows(await api("/users"));
                        showToast("Akun kasir berhasil dibuat.");
                    }}
                    showToast={showToast}
                />
            )}{" "}
            {modal?.type === "success" && (
                <SuccessModal
                    sale={modal.sale}
                    onClose={() => setModal(null)}
                />
            )}{" "}
            {toast && (
                <div className={`toast ${toast.type}`}>
                    <span>
                        {toast.type === "error" ? (
                            "!"
                        ) : (
                            <Icon name="check" size={16} />
                        )}
                    </span>
                    {toast.message}
                </div>
            )}
        </div>
    );
}

function CashierDashboard({ data, onNavigate }) {
    if (!data) return <PageSkeleton />;
    return (
        <Page extra="cashier-dashboard">
            <section className="welcome-banner cashier-welcome">
                <div>
                    <span className="eyebrow light">AREA KASIR</span>
                    <h2>Siap melayani pelanggan hari ini?</h2>
                    <p>
                        Mulai transaksi, lanjutkan pesanan tunda, atau lihat
                        riwayat penjualan Anda.
                    </p>
                    <button
                        className="button light"
                        onClick={() => onNavigate("cashier")}
                    >
                        <Icon name="cashier" size={18} /> Buka Kasir
                    </button>
                </div>
                <img src="/images/putri-collection-logo.svg" alt="Putri Collection" />
            </section>
            <div className="mini-metrics cashier-metrics">
                <MiniMetric
                    label="Penjualan saya hari ini"
                    value={money.format(data.metrics.today_revenue)}
                    detail="omzet hari ini"
                />
                <MiniMetric
                    label="Transaksi saya"
                    value={data.metrics.today_transactions}
                    detail="transaksi hari ini"
                />
                <MiniMetric
                    label="Transaksi tunda"
                    value={data.metrics.suspended_count}
                    detail="menunggu pembayaran"
                    danger={data.metrics.suspended_count > 0}
                />
            </div>
            <article className="panel table-panel">
                <PanelHeading
                    eyebrow="AKTIVITAS SAYA"
                    title="Riwayat Transaksi Terakhir"
                    action={
                        <button
                            className="text-button"
                            onClick={() => onNavigate("sales")}
                        >
                            Lihat riwayat <Icon name="chevron" size={14} />
                        </button>
                    }
                />
                <DataTable
                    headers={[
                        "Invoice",
                        "Pelanggan",
                        "Waktu",
                        "Total",
                        "Status",
                    ]}
                    rows={data.recent_sales.map((sale) => [
                        <strong>{sale.invoice_number}</strong>,
                        sale.customer?.name || "Umum",
                        formatDate(sale.sold_at, true),
                        <b>{money.format(sale.grand_total)}</b>,
                        <Status value={sale.status} />,
                    ])}
                />
            </article>
        </Page>
    );
}

function Dashboard({ data, onNavigate }) {
    if (!data) return <PageSkeleton />;
    const max = Math.max(...data.trend.map((x) => x.value), 1);
    const metrics = [
        [
            "Total Produk",
            number.format(data.metrics.total_products),
            "koleksi aktif",
            "products",
            "customer",
        ],
        [
            "Total Stok",
            number.format(data.metrics.total_stock),
            "seluruh barang",
            "inventory",
            "stock",
        ],
        [
            "Stok Menipis",
            number.format(data.metrics.low_stock_count),
            "perlu perhatian",
            "stock-opname",
            "stock",
        ],
        [
            "Penjualan Hari Ini",
            money.format(data.metrics.today_revenue),
            `${data.metrics.today_transactions} transaksi`,
            "cashier",
            "revenue",
        ],
        [
            "Laba Hari Ini",
            money.format(data.metrics.today_profit),
            "estimasi laba kotor",
            "reports",
            "profit",
        ],
        [
            "Transaksi Hari Ini",
            number.format(data.metrics.today_transactions),
            "transaksi selesai",
            "sales",
            "customer",
        ],
    ];
    return (
        <div className="page-content dashboard-page">
            <section className="welcome-banner">
                <div>
                    <span className="eyebrow light">
                        PUTRI COLLECTION COMMAND CENTER
                    </span>
                    <h2>Selamat datang kembali.</h2>
                    <p>
                        Pantau penjualan, stok koleksi, dan laba butik dalam
                        satu tampilan.
                    </p>
                    <button
                        className="button light"
                        onClick={() => onNavigate("cashier")}
                    >
                        <Icon name="cashier" size={18} /> Mulai Transaksi
                    </button>
                </div>
                <div className="banner-orbit">
                    <div className="orbit-ring">
                        <img src="/images/putri-collection-logo.svg" alt="" />
                    </div>
                    <div className="float-stat">
                        <small>Penjualan bulan ini</small>
                        <strong>
                            {money.format(data.metrics.month_revenue)}
                        </strong>
                        <em>
                            <Icon name="arrowUp" size={12} /> Data real-time
                        </em>
                    </div>
                </div>
            </section>
            <section className="metric-grid">
                {metrics.map(([label, value, detail, target, tone]) => (
                    <button
                        className="metric-card"
                        key={label}
                        onClick={() => onNavigate(target)}
                    >
                        <span className={`metric-icon ${tone}`}>
                            <Icon
                                name={
                                    tone === "revenue"
                                        ? "wallet"
                                        : tone === "profit"
                                          ? "chart"
                                          : tone === "stock"
                                            ? "box"
                                            : "users"
                                }
                            />
                        </span>
                        <span className="metric-copy">
                            <small>{label}</small>
                            <strong>{value}</strong>
                            <em>{detail}</em>
                        </span>
                        <Icon name="chevron" size={16} />
                    </button>
                ))}
            </section>
            <section className="dashboard-grid">
                <article className="panel chart-panel">
                    <PanelHeading
                        eyebrow="PERFORMA"
                        title="Tren Penjualan"
                        action={
                            <button
                                className="text-button"
                                onClick={() => onNavigate("reports")}
                            >
                                Lihat laporan <Icon name="chevron" size={14} />
                            </button>
                        }
                    />
                    <div className="chart-summary">
                        <strong>
                            {money.format(
                                data.trend.reduce((a, b) => a + b.value, 0),
                            )}
                        </strong>
                        <span>7 hari terakhir</span>
                    </div>
                    <div className="bar-chart">
                        {data.trend.map((x, i) => (
                            <div className="bar-column" key={x.date}>
                                <span className="bar-value">
                                    {x.value
                                        ? `${Math.round(x.value / 1000)}k`
                                        : "0"}
                                </span>
                                <div
                                    className={`bar ${i === data.trend.length - 1 ? "today" : ""}`}
                                    style={{
                                        height: `${Math.max(8, (x.value / max) * 100)}%`,
                                    }}
                                />
                                <small>{x.label}</small>
                            </div>
                        ))}
                    </div>
                </article>
                <article className="panel top-products">
                    <PanelHeading
                        eyebrow="PRODUK"
                        title="Paling Laris"
                        action={
                            <button
                                className="text-button"
                                onClick={() => onNavigate("products")}
                            >
                                Semua produk <Icon name="chevron" size={14} />
                            </button>
                        }
                    />
                    <div className="rank-list">
                        {data.top_products.map((x, i) => (
                            <div className="rank-item" key={x.product_name}>
                                <span className={`rank rank-${i + 1}`}>
                                    {i + 1}
                                </span>
                                <span className="product-avatar">
                                    {x.product_name.slice(0, 2).toUpperCase()}
                                </span>
                                <span>
                                    <strong>{x.product_name}</strong>
                                    <small>
                                        {Number(x.quantity)} item terjual
                                    </small>
                                </span>
                                <b>{money.format(x.revenue)}</b>
                            </div>
                        ))}
                    </div>
                </article>
            </section>
            <section className="dashboard-grid lower">
                <article className="panel recent-panel">
                    <PanelHeading
                        eyebrow="AKTIVITAS"
                        title="Transaksi Terbaru"
                        action={
                            <button
                                className="text-button"
                                onClick={() => onNavigate("sales")}
                            >
                                Lihat semua <Icon name="chevron" size={14} />
                            </button>
                        }
                    />
                    <DataTable
                        headers={[
                            "Invoice",
                            "Pelanggan",
                            "Kasir",
                            "Waktu",
                            "Total",
                            "Status",
                        ]}
                        rows={data.recent_sales.map((s) => [
                            <strong>{s.invoice_number}</strong>,
                            s.customer?.name || "Umum",
                            s.user?.name,
                            formatDate(s.sold_at, true),
                            <b>{money.format(s.grand_total)}</b>,
                            <Status value={s.status} />,
                        ])}
                    />
                </article>
                <article className="panel stock-alert">
                    <PanelHeading
                        eyebrow="PERLU PERHATIAN"
                        title="Stok Menipis"
                        action={
                            <span className="danger-count">
                                {data.metrics.low_stock_count}
                            </span>
                        }
                    />
                    <div className="stock-list">
                        {data.low_stock.length ? (
                            data.low_stock.map((x) => (
                                <div className="stock-row" key={x.id}>
                                    <span className="stock-product">
                                        <span>{x.name.slice(0, 2)}</span>
                                        <strong>
                                            {x.name}
                                            <small>{x.sku}</small>
                                        </strong>
                                    </span>
                                    <span className="stock-amount">
                                        <b>{Number(x.stock)}</b>
                                        <small>
                                            min. {Number(x.min_stock)}
                                        </small>
                                    </span>
                                </div>
                            ))
                        ) : (
                            <EmptyState compact title="Semua stok aman" />
                        )}
                    </div>
                    <button
                        className="button subtle full"
                        onClick={() => onNavigate("inventory")}
                    >
                        Kelola Inventori
                    </button>
                </article>
            </section>
        </div>
    );
}

function Cashier({
    products,
    categories,
    customers,
    cart,
    setCart,
    customerId,
    setCustomerId,
    onPay,
    onSuspend,
    showToast,
}) {
    const [search, setSearch] = useState(""),
        [category, setCategory] = useState("all"),
        [selected, setSelected] = useState(null);
    const filtered = products.filter(
        (p) =>
            (category === "all" ||
                String(p.category_id) === String(category)) &&
            [
                p.name,
                p.sku,
                p.category?.name,
                ...(p.variants || []).flatMap((v) => [v.color, v.sku]),
            ]
                .join(" ")
                .toLowerCase()
                .includes(search.toLowerCase()),
    );
    const subtotal = cart.reduce(
            (a, x) => a + Number(x.selling_price) * x.quantity,
            0,
        ),
        discount = cart.reduce((a, x) => a + Number(x.discount_amount || 0), 0),
        total = Math.max(0, subtotal - discount);
    const qty = (variantId, d) =>
        setCart((r) =>
            r
                .map((x) =>
                    x.product_variant_id === variantId
                        ? {
                              ...x,
                              quantity: Math.max(
                                  0,
                                  Math.min(Number(x.stock), x.quantity + d),
                              ),
                          }
                        : x,
                )
                .filter((x) => x.quantity > 0),
        );
    const add = (p, v) => {
        if (Number(v.stock) <= 0)
            return showToast("Barang ini sedang kehabisan stok.", "error");
        setCart((r) =>
            r.some((x) => x.product_variant_id === v.id)
                ? r.map((x) =>
                      x.product_variant_id === v.id
                          ? {
                                ...x,
                                quantity: Math.min(
                                    Number(v.stock),
                                    x.quantity + 1,
                                ),
                            }
                          : x,
                  )
                : [
                      ...r,
                      {
                          ...p,
                          product_variant_id: v.id,
                          color: v.color,
                          sku: v.sku,
                          stock: Number(v.stock),
                          selling_price: v.selling_price || p.selling_price,
                          quantity: 1,
                          discount_amount: 0,
                      },
                  ],
        );
        setSelected(null);
    };
    return (
        <div className="cashier-layout">
            <section className="catalog-pane">
                <div className="cashier-toolbar">
                    <Search
                        value={search}
                        onChange={setSearch}
                        placeholder="Cari nama, SKU, kategori, atau warna..."
                    />
                    <button className="button outline">
                        <Icon name="scan" size={18} /> Scan
                    </button>
                </div>
                <div className="category-tabs">
                    <button
                        className={category === "all" ? "active" : ""}
                        onClick={() => setCategory("all")}
                    >
                        Semua
                    </button>
                    {categories.map((c) => (
                        <button
                            className={
                                String(category) === String(c.id)
                                    ? "active"
                                    : ""
                            }
                            onClick={() => setCategory(c.id)}
                            key={c.id}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
                <div className="product-grid">
                    {filtered.map((p) => (
                        <button
                            className={`product-card ${Number(p.stock) <= 0 ? "sold-out" : ""}`}
                            onClick={() => {
                                if (Number(p.stock) <= 0) return;
                                const available = (p.variants || []).filter(
                                    (v) => Number(v.stock) > 0,
                                );
                                if (available.length === 1)
                                    add(p, available[0]);
                                else setSelected(p);
                            }}
                            key={p.id}
                        >
                            <span
                                className={`product-image ${p.image ? "has-image" : ""}`}
                                style={{
                                    "--accent": p.category?.color || "#45574f",
                                }}
                            >
                                {p.image ? (
                                    <img
                                        src={p.image}
                                        alt={p.name}
                                        loading="lazy"
                                    />
                                ) : (
                                    <b>{initials(p.name)}</b>
                                )}
                                {Number(p.stock) <= Number(p.min_stock) && (
                                    <em>
                                        {Number(p.stock) <= 0
                                            ? "Habis"
                                            : "Menipis"}
                                    </em>
                                )}
                            </span>
                            <span className="product-info">
                                <strong>{p.name}</strong>
                                <small>Stok {Number(p.stock)}</small>
                                <b>{money.format(p.selling_price)}</b>
                            </span>
                            <span className="quick-add">
                                <Icon name="plus" size={16} />
                            </span>
                        </button>
                    ))}
                </div>
            </section>
            <aside className="cart-pane">
                <div className="cart-head">
                    <div>
                        <span className="eyebrow">PESANAN SAAT INI</span>
                        <h2>
                            Keranjang{" "}
                            <span>
                                {cart.reduce((a, b) => a + b.quantity, 0)}
                            </span>
                        </h2>
                    </div>
                    {cart.length > 0 && (
                        <button
                            className="text-button danger"
                            onClick={() =>
                                confirm("Kosongkan seluruh keranjang?") &&
                                setCart([])
                            }
                        >
                            Kosongkan
                        </button>
                    )}
                </div>
                <label className="customer-select">
                    <Icon name="users" size={18} />
                    <select
                        value={customerId}
                        onChange={(e) => setCustomerId(e.target.value)}
                    >
                        <option value="">Pelanggan umum</option>
                        {customers.map((c) => (
                            <option value={c.id} key={c.id}>
                                {c.name}
                            </option>
                        ))}
                    </select>
                    <Icon name="chevron" size={14} />
                </label>
                <div className="cart-items">
                    {cart.length ? (
                        cart.map((x) => (
                            <div
                                className="cart-item"
                                key={x.product_variant_id}
                            >
                                <span className="cart-thumb">
                                    {x.image ? (
                                        <img src={x.image} alt="" />
                                    ) : (
                                        initials(x.name)
                                    )}
                                </span>
                                <span className="cart-product">
                                    <strong>{x.name}</strong>
                                    {x.color && x.color !== "Default" && (
                                        <small>{x.color}</small>
                                    )}
                                    <span className="qty-control">
                                        <button
                                            onClick={() =>
                                                qty(x.product_variant_id, -1)
                                            }
                                        >
                                            −
                                        </button>
                                        <b>{x.quantity}</b>
                                        <button
                                            onClick={() =>
                                                qty(x.product_variant_id, 1)
                                            }
                                        >
                                            +
                                        </button>
                                    </span>
                                    <label className="item-discount">
                                        Diskon Rp{" "}
                                        <input
                                            type="number"
                                            min="0"
                                            value={x.discount_amount || 0}
                                            onChange={(e) =>
                                                setCart((r) =>
                                                    r.map((i) =>
                                                        i.product_variant_id ===
                                                        x.product_variant_id
                                                            ? {
                                                                  ...i,
                                                                  discount_amount:
                                                                      Math.max(
                                                                          0,
                                                                          Number(
                                                                              e
                                                                                  .target
                                                                                  .value,
                                                                          ),
                                                                      ),
                                                              }
                                                            : i,
                                                    ),
                                                )
                                            }
                                        />
                                    </label>
                                </span>
                                <span className="cart-price">
                                    <button
                                        onClick={() =>
                                            setCart((r) =>
                                                r.filter(
                                                    (p) =>
                                                        p.product_variant_id !==
                                                        x.product_variant_id,
                                                ),
                                            )
                                        }
                                    >
                                        <Icon name="trash" size={15} />
                                    </button>
                                    <b>
                                        {money.format(
                                            Number(x.selling_price) *
                                                x.quantity -
                                                Number(x.discount_amount || 0),
                                        )}
                                    </b>
                                </span>
                            </div>
                        ))
                    ) : (
                        <EmptyState
                            title="Keranjang masih kosong"
                            detail="Pilih barang untuk memasukkannya ke keranjang."
                            icon="cashier"
                        />
                    )}
                </div>
                <div className="cart-summary">
                    <div>
                        <span>Subtotal</span>
                        <b>{money.format(subtotal)}</b>
                    </div>
                    <div>
                        <span>Diskon item</span>
                        <b>-{money.format(discount)}</b>
                    </div>
                    <div className="grand-total">
                        <span>Total</span>
                        <strong>{money.format(total)}</strong>
                    </div>
                    <div className="checkout-actions">
                        <button
                            className="button outline"
                            disabled={!cart.length}
                            onClick={onSuspend}
                        >
                            Tunda
                        </button>
                        <button
                            className="button primary pay-button"
                            disabled={!cart.length}
                            onClick={onPay}
                        >
                            <span>Bayar</span>
                            <strong>{money.format(total)}</strong>
                            <Icon name="chevron" />
                        </button>
                    </div>
                </div>
            </aside>
            {selected && (
                <VariationModal
                    product={selected}
                    onClose={() => setSelected(null)}
                    onAdd={(v) => add(selected, v)}
                />
            )}
        </div>
    );
}

function VariationModal({ product, onClose, onAdd }) {
    const [variantId, setVariantId] = useState("");
    const variant = product.variants?.find(
        (v) => String(v.id) === String(variantId),
    );
    return (
        <Modal title="Pilih Warna" subtitle={product.name} onClose={onClose}>
            <div className="variation-preview">
                <img src={product.image} alt={product.name} />
                <div>
                    <strong>{product.name}</strong>
                    <small>{product.category?.name}</small>
                </div>
            </div>
            <div className="variant-grid">
                {(product.variants || []).map((v) => (
                    <button
                        className={
                            String(variantId) === String(v.id) ? "active" : ""
                        }
                        disabled={Number(v.stock) <= 0}
                        onClick={() => setVariantId(v.id)}
                        key={v.id}
                    >
                        <strong>{v.color || "Default"}</strong>
                        <small>Stok {Number(v.stock)}</small>
                    </button>
                ))}
            </div>
            <div className="modal-actions">
                <button className="button outline" onClick={onClose}>
                    Batal
                </button>
                <button
                    className="button primary"
                    disabled={!variant}
                    onClick={() => onAdd(variant)}
                >
                    Tambah ke Keranjang
                </button>
            </div>
        </Modal>
    );
}

function SalesPage({ sales, onVoid, canVoid }) {
    const [filters, setFilters] = useState({
            search: "",
            from: "",
            to: "",
            payment: "",
        }),
        [rows, setRows] = useState(sales),
        [receipt, setReceipt] = useState(null),
        [loadingReceipt, setLoadingReceipt] = useState(null);
    useEffect(() => setRows(sales), [sales]);
    const apply = async () => {
        const params = new URLSearchParams(
            Object.entries(filters).filter(([, v]) => v),
        );
        setRows((await api(`/sales?${params}`)).data);
    };
    const reprint = async (sale) => {
        setLoadingReceipt(sale.id);
        try {
            setReceipt(await api(`/sales/${sale.id}/receipt`));
        } finally {
            setLoadingReceipt(null);
        }
    };
    const completed = rows.filter((x) => x.status === "completed"),
        items = completed.reduce(
            (a, s) =>
                a + (s.items || []).reduce((n, i) => n + Number(i.quantity), 0),
            0,
        ),
        revenue = completed.reduce((a, s) => a + Number(s.grand_total), 0),
        methodTotal = (id) =>
            completed
                .filter((s) => s.payments?.some((p) => p.method === id))
                .reduce((a, s) => a + Number(s.grand_total), 0);
    const exportCsv = () =>
        downloadCsv("rekap-transaksi.csv", [
            "Invoice,Tanggal,Kasir,Pelanggan,Item,Total,Metode,Status",
            ...rows.map((s) =>
                [
                    s.invoice_number,
                    s.sold_at,
                    s.user?.name,
                    s.customer?.name || "Umum",
                    (s.items || []).length,
                    s.grand_total,
                    s.payments?.map((p) => p.method).join("+"),
                    s.status,
                ]
                    .map(csvCell)
                    .join(","),
            ),
        ]);
    return (
        <Page>
            <div className="filter-panel">
                <Search
                    value={filters.search}
                    onChange={(v) => setFilters({ ...filters, search: v })}
                    placeholder="Invoice atau pelanggan..."
                />
                <Field
                    label="Dari"
                    type="date"
                    value={filters.from}
                    onChange={(v) => setFilters({ ...filters, from: v })}
                />
                <Field
                    label="Sampai"
                    type="date"
                    value={filters.to}
                    onChange={(v) => setFilters({ ...filters, to: v })}
                />
                <SelectField
                    label="Pembayaran"
                    value={filters.payment}
                    onChange={(v) => setFilters({ ...filters, payment: v })}
                    options={[
                        ["cash", "Tunai"],
                        ["qris", "QRIS"],
                        ["transfer", "Transfer"],
                    ]}
                />
                <button className="button primary" onClick={apply}>
                    Terapkan
                </button>
            </div>
            <div className="mini-metrics rekap-metrics">
                <MiniMetric
                    label="Jumlah transaksi"
                    value={completed.length}
                    detail="transaksi selesai"
                />
                <MiniMetric
                    label="Barang terjual"
                    value={items}
                    detail="item"
                />
                <MiniMetric
                    label="Total pendapatan"
                    value={money.format(revenue)}
                    detail="seluruh metode"
                />
                <MiniMetric
                    label="Tunai"
                    value={money.format(methodTotal("cash"))}
                    detail="pembayaran"
                />
                <MiniMetric
                    label="QRIS"
                    value={money.format(methodTotal("qris"))}
                    detail="pembayaran"
                />
                <MiniMetric
                    label="Transfer"
                    value={money.format(methodTotal("transfer"))}
                    detail="pembayaran"
                />
            </div>
            <article className="panel table-panel">
                <div className="table-summary">
                    <span>
                        <strong>{rows.length}</strong> transaksi ditemukan
                    </span>
                    <div>
                        <button
                            className="button xs outline"
                            onClick={() => window.print()}
                        >
                            Ekspor PDF
                        </button>
                        <button
                            className="button xs primary"
                            onClick={exportCsv}
                        >
                            Ekspor Excel
                        </button>
                    </div>
                </div>
                <DataTable
                    headers={[
                        "Invoice",
                        "Tanggal",
                        "Kasir",
                        "Pelanggan",
                        "Item",
                        "Pembayaran",
                        "Total",
                        "Status",
                        "Aksi",
                    ]}
                    rows={rows.map((s) => [
                        <strong>{s.invoice_number}</strong>,
                        formatDate(s.sold_at, true),
                        s.user?.name,
                        s.customer?.name || "Pelanggan umum",
                        `${(s.items || []).reduce((a, i) => a + Number(i.quantity), 0)} item`,
                        <span className="capitalize">
                            {s.payments?.map((p) => p.method).join(", ")}
                        </span>,
                        <b>{money.format(s.grand_total)}</b>,
                        <Status value={s.status} />,
                        <span className="row-actions">
                            <button
                                className="button xs outline"
                                disabled={loadingReceipt === s.id}
                                onClick={() => reprint(s)}
                            >
                                <Icon name="receipt" size={13} />
                                {loadingReceipt === s.id
                                    ? "Membuka..."
                                    : "Detail / Cetak"}
                            </button>
                            {canVoid && s.status === "completed" && (
                                <button
                                    className="icon-button tiny"
                                    title="Batalkan transaksi"
                                    onClick={() => onVoid(s)}
                                >
                                    •••
                                </button>
                            )}
                        </span>,
                    ])}
                />
            </article>
            {receipt && (
                <SuccessModal sale={receipt} onClose={() => setReceipt(null)} />
            )}
        </Page>
    );
}

function SuspendedPage({ rows, onContinue, onDelete }) {
    return (
        <Page>
            <div className="inventory-banner rose-banner">
                <span className="metric-icon revenue">
                    <Icon name="receipt" />
                </span>
                <div>
                    <strong>{rows.length} transaksi menunggu pembayaran</strong>
                    <p>
                        Stok belum berkurang sampai transaksi dilanjutkan dan
                        dibayar.
                    </p>
                </div>
            </div>
            <article className="panel table-panel">
                <DataTable
                    headers={[
                        "Nomor",
                        "Nama / Catatan",
                        "Waktu Ditunda",
                        "Kasir",
                        "Pelanggan",
                        "Item",
                        "Total",
                        "Aksi",
                    ]}
                    rows={rows.map((row) => [
                        <strong>{row.suspension_number}</strong>,
                        <span>
                            <b>{row.name}</b>
                            <small className="block">
                                {row.notes || "Tanpa catatan"}
                            </small>
                        </span>,
                        formatDate(row.suspended_at, true),
                        row.user?.name,
                        row.customer?.name || "Umum",
                        `${row.details?.reduce((a, x) => a + Number(x.quantity), 0) || 0} item`,
                        <b>{money.format(row.grand_total)}</b>,
                        <span className="row-actions">
                            <button
                                className="button xs primary"
                                onClick={() => onContinue(row)}
                            >
                                Lanjutkan
                            </button>
                            <button
                                className="button xs outline danger"
                                onClick={() => onDelete(row)}
                            >
                                Hapus
                            </button>
                        </span>,
                    ])}
                />
            </article>
        </Page>
    );
}

function StockOpnamePage({ data, onSaved, showToast }) {
    const [search, setSearch] = useState(""),
        [physical, setPhysical] = useState({}),
        [notes, setNotes] = useState({}),
        [date, setDate] = useState(new Date().toISOString().slice(0, 10)),
        [busy, setBusy] = useState(false);
    if (!data) return <PageSkeleton />;
    const variants = data.variants.filter((v) =>
        `${v.product_name} ${v.sku} ${v.color}`
            .toLowerCase()
            .includes(search.toLowerCase()),
    );
    const save = async () => {
        const items = variants
            .filter(
                (v) =>
                    physical[v.product_variant_id] !== undefined &&
                    physical[v.product_variant_id] !== "",
            )
            .map((v) => ({
                product_id: v.product_id,
                product_variant_id: v.product_variant_id,
                physical_stock: Number(physical[v.product_variant_id]),
                notes: notes[v.product_variant_id] || null,
            }));
        if (!items.length)
            return showToast("Isi minimal satu stok fisik.", "error");
        setBusy(true);
        try {
            await api("/stock-opnames", {
                method: "POST",
                body: JSON.stringify({ opname_date: date, items }),
            });
            setPhysical({});
            setNotes({});
            onSaved();
        } catch (e) {
            showToast(e.message, "error");
        } finally {
            setBusy(false);
        }
    };
    return (
        <Page>
            <div className="page-toolbar">
                <Search
                    value={search}
                    onChange={setSearch}
                    placeholder="Cari produk, SKU, atau warna..."
                />
                <div className="toolbar-actions">
                    <Field
                        label="Tanggal opname"
                        type="date"
                        value={date}
                        onChange={setDate}
                    />
                    <button
                        className="button primary"
                        disabled={busy}
                        onClick={save}
                    >
                        {busy ? "Menyimpan..." : "Simpan Stok Opname"}
                    </button>
                </div>
            </div>
            <article className="panel table-panel">
                <DataTable
                    headers={[
                        "Produk",
                        "SKU",
                        "Warna",
                        "Stok Sistem",
                        "Stok Fisik",
                        "Selisih",
                        "Status",
                        "Alasan / Catatan",
                    ]}
                    rows={variants.map((v) => {
                        const has =
                                physical[v.product_variant_id] !== undefined &&
                                physical[v.product_variant_id] !== "",
                            diff = has
                                ? Number(physical[v.product_variant_id]) -
                                  Number(v.system_stock)
                                : 0,
                            status = !has
                                ? "—"
                                : diff === 0
                                  ? "Sesuai"
                                  : diff > 0
                                    ? "Surplus"
                                    : "Minus";
                        return [
                            <ProductCell
                                p={{
                                    name: v.product_name,
                                    image: v.image,
                                    description: v.color || "Default",
                                }}
                            />,
                            v.sku,
                            v.color || "Default",
                            <b>{Number(v.system_stock)}</b>,
                            <input
                                className="table-input"
                                type="number"
                                min="0"
                                value={physical[v.product_variant_id] ?? ""}
                                onChange={(e) =>
                                    setPhysical({
                                        ...physical,
                                        [v.product_variant_id]: e.target.value,
                                    })
                                }
                            />,
                            <b
                                className={
                                    diff < 0
                                        ? "text-danger"
                                        : diff > 0
                                          ? "text-green"
                                          : ""
                                }
                            >
                                {has ? (diff > 0 ? `+${diff}` : diff) : "—"}
                            </b>,
                            <Tag>{status}</Tag>,
                            <input
                                className="table-input wide"
                                value={notes[v.product_variant_id] || ""}
                                onChange={(e) =>
                                    setNotes({
                                        ...notes,
                                        [v.product_variant_id]: e.target.value,
                                    })
                                }
                                placeholder="Opsional"
                            />,
                        ];
                    })}
                />
            </article>
            <article className="panel table-panel history-panel">
                <PanelHeading eyebrow="RIWAYAT" title="Stok Opname Tersimpan" />
                <DataTable
                    headers={[
                        "Nomor Opname",
                        "Tanggal",
                        "Petugas",
                        "Jumlah Baris",
                        "Catatan",
                    ]}
                    rows={(data.history?.data || []).map((row) => [
                        <strong>{row.opname_number}</strong>,
                        formatDate(row.opname_date),
                        row.user?.name,
                        `${row.details?.length || 0} barang`,
                        row.notes || "—",
                    ])}
                />
            </article>
        </Page>
    );
}
function ProductsPage({
    products,
    categories,
    onAdd,
    onEdit,
    onDelete,
    onBarcode,
    onCategories,
    canManage,
}) {
    const [search, setSearch] = useState("");
    const rows = products.filter((p) =>
        `${p.name} ${p.sku} ${p.barcode} ${p.category?.name} ${(p.variants || []).map((v) => v.color).join(" ")}`
            .toLowerCase()
            .includes(search.toLowerCase()),
    );
    return (
        <Page>
            <div className="page-toolbar">
                <Search
                    value={search}
                    onChange={setSearch}
                    placeholder="Cari nama, SKU, kategori, atau warna..."
                />
                <div className="toolbar-actions">
                    <button className="button outline" onClick={onCategories}>
                        <Icon name="layers" size={17} /> Kategori (
                        {categories.length})
                    </button>
                    <button
                        className="button outline"
                        onClick={() => products[0] && onBarcode(products[0])}
                    >
                        <Icon name="scan" size={17} /> Cetak Barcode
                    </button>
                    {canManage && (
                        <button className="button primary" onClick={onAdd}>
                            <Icon name="plus" size={17} /> Tambah Produk
                        </button>
                    )}
                </div>
            </div>
            {!canManage && (
                <div className="cashier-access-note">
                    <Icon name="settings" size={17} />
                    <span>
                        <strong>Mode katalog kasir</strong>
                        <small>
                            Harga modal dan aksi perubahan dikunci oleh Admin.
                        </small>
                    </span>
                </div>
            )}
            <div className="mini-metrics">
                <MiniMetric
                    label="Total produk"
                    value={products.length}
                    detail="produk terdaftar"
                />
                <MiniMetric
                    label="Produk aktif"
                    value={products.filter((p) => p.is_active).length}
                    detail="siap dijual"
                />
                <MiniMetric
                    label="Stok menipis"
                    value={
                        products.filter(
                            (p) => Number(p.stock) <= Number(p.min_stock),
                        ).length
                    }
                    detail="perlu restock"
                    danger
                />
                <MiniMetric
                    label="Produk bergambar"
                    value={products.filter((p) => p.image).length}
                    detail="visual katalog"
                />
            </div>
            <article className="panel table-panel">
                <DataTable
                    headers={[
                        "Produk",
                        "SKU / Barcode",
                        "Kategori",
                        canManage ? "Harga Modal" : "Akses",
                        "Harga Jual",
                        "Stok",
                        "Status",
                        "Aksi",
                    ]}
                    rows={rows.map((p) => [
                        <ProductCell p={p} />,
                        <span>
                            {p.sku}
                            <small className="block">
                                {p.barcode || "Belum ada barcode"}
                            </small>
                        </span>,
                        <Tag>{p.category?.name || "Tanpa kategori"}</Tag>,
                        canManage ? (
                            money.format(p.cost_price)
                        ) : (
                            <span className="locked-action">Dikunci</span>
                        ),
                        <b>{money.format(p.selling_price)}</b>,
                        <Stock value={p.stock} min={p.min_stock} />,
                        <Status value={p.is_active ? "active" : "inactive"} />,
                        <span className="row-actions">
                            <button
                                className="icon-button tiny"
                                title="Cetak barcode"
                                onClick={() => onBarcode(p)}
                            >
                                <Icon name="scan" size={15} />
                            </button>
                            {canManage && (
                                <>
                                    <button
                                        className="icon-button tiny"
                                        onClick={() => onEdit(p)}
                                    >
                                        <Icon name="edit" size={15} />
                                    </button>
                                    <button
                                        className="icon-button tiny"
                                        title="Arsipkan produk"
                                        onClick={() => onDelete(p)}
                                    >
                                        <Icon name="trash" size={15} />
                                    </button>
                                </>
                            )}
                        </span>,
                    ])}
                />
            </article>
        </Page>
    );
}
function InventoryPage({ products, onAdjust }) {
    const variants = products.flatMap((product) =>
        (product.variants || []).map((variant) => ({ product, variant })),
    );
    const low = variants.filter(
        ({ product, variant }) =>
            Number(variant.stock) <=
            Number(variant.min_stock || product.min_stock),
    );
    return (
        <Page>
            <div className="inventory-banner">
                <span className="metric-icon stock">
                    <Icon name="layers" />
                </span>
                <div>
                    <strong>{low.length} barang perlu perhatian</strong>
                    <p>
                        Stok berada di bawah batas minimum. Segera lakukan
                        pembelian atau penyesuaian.
                    </p>
                </div>
                <button className="button outline">Buat Purchase Order</button>
            </div>
            <article className="panel table-panel">
                <div className="panel-tools">
                    <div>
                        <h2>Stok Barang per Warna</h2>
                        <p>
                            Diperbarui langsung dari transaksi dan stok opname.
                        </p>
                    </div>
                </div>
                <DataTable
                    headers={[
                        "Produk",
                        "SKU",
                        "Warna",
                        "Stok Tersedia",
                        "Stok Minimum",
                        "Nilai Stok",
                        "Kondisi",
                        "",
                    ]}
                    rows={variants.map(({ product: p, variant: v }) => [
                        <ProductCell p={p} />,
                        v.sku,
                        v.color,
                        <b>{Number(v.stock)} unit</b>,
                        `${Number(v.min_stock || p.min_stock)} unit`,
                        money.format(
                            Number(v.stock) *
                                Number(v.cost_price || p.cost_price),
                        ),
                        <Stock
                            value={v.stock}
                            min={v.min_stock || p.min_stock}
                        />,
                        <button
                            className="button xs outline"
                            onClick={() =>
                                onAdjust({ ...p, selectedVariant: v })
                            }
                        >
                            Sesuaikan
                        </button>,
                    ])}
                />
            </article>
        </Page>
    );
}
function PurchasesPage({ rows, onAdd }) {
    return (
        <Page>
            <Toolbar
                placeholder="Cari nomor pembelian..."
                action="Pembelian Baru"
                onAction={onAdd}
            />
            <div className="mini-metrics">
                <MiniMetric
                    label="Total pembelian"
                    value={money.format(
                        rows.reduce((a, r) => a + Number(r.grand_total), 0),
                    )}
                    detail="seluruh periode"
                />
                <MiniMetric
                    label="Belum dibayar"
                    value={
                        rows.filter((r) => r.payment_status !== "paid").length
                    }
                    detail="tagihan pemasok"
                    danger
                />
                <MiniMetric
                    label="Pesanan diterima"
                    value={rows.filter((r) => r.status === "received").length}
                    detail="penerimaan selesai"
                />
            </div>
            <article className="panel table-panel">
                <DataTable
                    headers={[
                        "Nomor PO",
                        "Tanggal",
                        "Pemasok",
                        "Invoice Supplier",
                        "Total",
                        "Pembayaran",
                        "Status",
                    ]}
                    rows={rows.map((r) => [
                        <strong>{r.purchase_number}</strong>,
                        formatDate(r.purchase_date),
                        r.supplier_name,
                        r.supplier_invoice || "—",
                        <b>{money.format(r.grand_total)}</b>,
                        <Status value={r.payment_status} />,
                        <Status value={r.status} />,
                    ])}
                />
            </article>
        </Page>
    );
}
function PeoplePage({ type, rows, onAdd }) {
    const customer = type === "customer";
    return (
        <Page>
            <Toolbar
                placeholder={`Cari ${customer ? "pelanggan" : "pemasok"}...`}
                action={`Tambah ${customer ? "Pelanggan" : "Pemasok"}`}
                onAction={onAdd}
            />
            {customer && (
                <div className="loyalty-banner">
                    <div>
                        <span className="eyebrow light">PC REWARDS</span>
                        <h2>Loyalty yang membuat pelanggan kembali.</h2>
                        <p>
                            Setiap Rp10.000 transaksi menghasilkan 1 poin
                            otomatis.
                        </p>
                    </div>
                    <span className="loyalty-medal">★</span>
                </div>
            )}
            <article className="panel table-panel">
                <DataTable
                    headers={
                        customer
                            ? [
                                  "Pelanggan",
                                  "Kontak",
                                  "Tier Member",
                                  "Poin",
                                  "Limit Kredit",
                                  "Status",
                              ]
                            : [
                                  "Pemasok",
                                  "Kontak Person",
                                  "Telepon",
                                  "Email",
                                  "Status",
                              ]
                    }
                    rows={rows.map((r) =>
                        customer
                            ? [
                                  <PersonCell p={r} />,
                                  <span>
                                      {r.phone || "—"}
                                      <small className="block">{r.email}</small>
                                  </span>,
                                  <Tag>{r.member_tier}</Tag>,
                                  <b className="points">
                                      ★ {number.format(r.points)}
                                  </b>,
                                  money.format(r.credit_limit),
                                  <Status
                                      value={
                                          r.is_active ? "active" : "inactive"
                                      }
                                  />,
                              ]
                            : [
                                  <PersonCell p={r} />,
                                  r.contact_person || "—",
                                  r.phone || "—",
                                  r.email || "—",
                                  <Status
                                      value={
                                          r.is_active ? "active" : "inactive"
                                      }
                                  />,
                              ],
                    )}
                />
            </article>
        </Page>
    );
}
function ExpensesPage({ rows, onAdd }) {
    const total = rows.reduce((a, r) => a + Number(r.amount), 0);
    return (
        <Page>
            <div className="page-toolbar">
                <div className="date-pill">Bulan berjalan</div>
                <button className="button primary" onClick={onAdd}>
                    <Icon name="plus" size={17} /> Catat Pengeluaran
                </button>
            </div>
            <div className="expense-hero">
                <div>
                    <span>Total pengeluaran</span>
                    <strong>{money.format(total)}</strong>
                    <small>{rows.length} catatan biaya operasional</small>
                </div>
                <div className="expense-ring">
                    <span>OPEX</span>
                </div>
            </div>
            <article className="panel table-panel">
                <DataTable
                    headers={[
                        "Nomor",
                        "Tanggal",
                        "Kategori",
                        "Deskripsi",
                        "Metode",
                        "Jumlah",
                    ]}
                    rows={rows.map((r) => [
                        <strong>{r.expense_number}</strong>,
                        formatDate(r.expense_date),
                        <Tag>{r.category}</Tag>,
                        r.description,
                        <span className="capitalize">{r.payment_method}</span>,
                        <b>{money.format(r.amount)}</b>,
                    ])}
                />
            </article>
        </Page>
    );
}
function ReportsPage({ report, setReport, showToast }) {
    const [period, setPeriod] = useState("month"),
        [from, setFrom] = useState(""),
        [to, setTo] = useState("");
    if (!report) return <PageSkeleton />;
    const s = report.summary;
    const load = async (selected) => {
        const now = new Date(),
            start = new Date(now);
        if (selected === "today") start.setHours(0, 0, 0, 0);
        if (selected === "week") start.setDate(now.getDate() - 6);
        if (selected === "month") start.setDate(1);
        if (selected === "year") start.setMonth(0, 1);
        const f =
                selected === "custom" ? from : start.toISOString().slice(0, 10),
            t = selected === "custom" ? to : now.toISOString().slice(0, 10);
        if (!f || !t)
            return showToast("Pilih tanggal awal dan akhir.", "error");
        setReport(await api(`/reports?from=${f}&to=${t}`));
        setPeriod(selected);
    };
    const exportExcel = () =>
        downloadCsv("laporan-keuangan.csv", [
            "Tanggal,Invoice,Produk,Warna,Jumlah,Harga Beli,Harga Jual,Diskon,Total Penjualan,Laba Kotor",
            ...(report.details || []).map((x) =>
                [
                    x.sold_at,
                    x.invoice_number,
                    x.product_name,
                    x.color || "",
                    x.quantity,
                    x.cost_price,
                    x.unit_price,
                    x.discount_amount,
                    x.total,
                    x.gross_profit,
                ]
                    .map(csvCell)
                    .join(","),
            ),
        ]);
    return (
        <Page>
            <div className="report-toolbar finance-filter">
                <div className="period-tabs">
                    {[
                        ["today", "Hari ini"],
                        ["week", "Minggu ini"],
                        ["month", "Bulan ini"],
                        ["year", "Tahun ini"],
                    ].map(([id, label]) => (
                        <button
                            className={period === id ? "active" : ""}
                            onClick={() => load(id)}
                            key={id}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <Field
                    label="Dari"
                    type="date"
                    value={from}
                    onChange={setFrom}
                />
                <Field label="Sampai" type="date" value={to} onChange={setTo} />
                <button
                    className="button outline"
                    onClick={() => load("custom")}
                >
                    Terapkan
                </button>
                <button
                    className="button outline"
                    onClick={() => window.print()}
                >
                    Cetak / PDF
                </button>
                <button className="button primary" onClick={exportExcel}>
                    Ekspor Excel
                </button>
            </div>
            <section className="report-summary">
                <div>
                    <span>Total Penjualan</span>
                    <strong>{money.format(s.revenue)}</strong>
                    <small>
                        {number.format(s.transactions)} transaksi · Rata-rata{" "}
                        {money.format(s.average_order)}
                    </small>
                </div>
                <div className="profit-block">
                    <span>Laba Kotor</span>
                    <strong>{money.format(s.gross_profit)}</strong>
                    <em>
                        {s.revenue
                            ? Math.round((s.gross_profit / s.revenue) * 100)
                            : 0}
                        % margin
                    </em>
                </div>
            </section>
            <div className="mini-metrics finance-metrics">
                <MiniMetric
                    label="Total modal"
                    value={money.format(s.cogs)}
                    detail="harga beli terjual"
                />
                <MiniMetric
                    label="Total diskon"
                    value={money.format(report.total_discount)}
                    detail="potongan transaksi"
                />
                <MiniMetric
                    label="Total transaksi"
                    value={s.transactions}
                    detail="transaksi selesai"
                />
                <MiniMetric
                    label="Biaya operasional"
                    value={money.format(s.expenses)}
                    detail="pengeluaran"
                    danger
                />
            </div>
            <article className="panel finance-chart">
                <PanelHeading eyebrow="TREN" title="Penjualan & Laba" />
                <SalesProfitChart rows={report.trend || []} />
            </article>
            <section className="dashboard-grid">
                <article className="panel">
                    <PanelHeading
                        eyebrow="PEMBAYARAN"
                        title="Pendapatan per Metode"
                    />
                    <div className="payment-breakdown">
                        {report.payments.map((p, i) => (
                            <div key={p.method}>
                                <span className={`payment-dot dot-${i}`} />
                                <strong className="capitalize">
                                    {p.method}
                                </strong>
                                <b>{money.format(p.total)}</b>
                            </div>
                        ))}
                    </div>
                </article>
                <article className="panel">
                    <PanelHeading eyebrow="PRODUK" title="Produk Terlaris" />
                    <div className="rank-list compact">
                        {report.top_products.slice(0, 5).map((p, i) => (
                            <div className="rank-item" key={p.product_name}>
                                <span className="rank">{i + 1}</span>
                                <span>
                                    <strong>{p.product_name}</strong>
                                    <small>{Number(p.quantity)} terjual</small>
                                </span>
                                <b>{money.format(p.revenue)}</b>
                            </div>
                        ))}
                    </div>
                </article>
            </section>
            <article className="panel table-panel">
                <PanelHeading
                    eyebrow="DETAIL"
                    title="Rincian Laporan Keuangan"
                />
                <DataTable
                    headers={[
                        "Tanggal",
                        "Invoice",
                        "Produk",
                        "Warna",
                        "Jumlah",
                        "Harga Beli",
                        "Harga Jual",
                        "Diskon",
                        "Penjualan",
                        "Laba Kotor",
                    ]}
                    rows={(report.details || []).map((x) => [
                        formatDate(x.sold_at),
                        x.invoice_number,
                        x.product_name,
                        x.color || "—",
                        Number(x.quantity),
                        money.format(x.cost_price),
                        money.format(x.unit_price),
                        money.format(x.discount_amount),
                        money.format(x.total),
                        <b>{money.format(x.gross_profit)}</b>,
                    ])}
                />
            </article>
        </Page>
    );
}

function SalesProfitChart({ rows }) {
    const ref = useRef(null),
        chart = useRef(null);
    useEffect(() => {
        chart.current?.destroy();
        if (!ref.current) return;
        chart.current = new Chart(ref.current, {
            type: "bar",
            data: {
                labels: rows.map((x) =>
                    new Date(x.date).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                    }),
                ),
                datasets: [
                    {
                        label: "Penjualan",
                        data: rows.map((x) => x.sales),
                        backgroundColor: "#71847b",
                        borderRadius: 6,
                    },
                    {
                        label: "Laba",
                        data: rows.map((x) => x.profit),
                        backgroundColor: "#dfb6c3",
                        borderRadius: 6,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "bottom" } },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: (v) => `Rp${number.format(v)}` },
                    },
                    x: { grid: { display: false } },
                },
            },
        });
        return () => chart.current?.destroy();
    }, [rows]);
    return (
        <div className="chart-canvas">
            <canvas ref={ref} />
        </div>
    );
}
function StockActivityPage({ data }) {
    const labels = {
        sale: "Penjualan",
        purchase: "Pembelian",
        adjustment: "Penyesuaian",
        stock_in: "Barang Masuk",
        stock_out: "Barang Keluar",
        damaged: "Rusak",
    };
    return (
        <Page>
            <div className="audit-hero">
                <span className="metric-icon stock">
                    <Icon name="scan" />
                </span>
                <div>
                    <span className="eyebrow">AUDIT INVENTORI</span>
                    <h2>Jejak stok yang transparan</h2>
                    <p>
                        Setiap perubahan menyimpan pengguna, waktu, referensi,
                        dan saldo akhir.
                    </p>
                </div>
                <b>{data.length} aktivitas terbaru</b>
            </div>
            <article className="panel table-panel">
                <DataTable
                    headers={[
                        "Waktu",
                        "Produk",
                        "Jenis",
                        "Perubahan",
                        "Sebelum",
                        "Sesudah",
                        "Pengguna",
                        "Catatan",
                    ]}
                    rows={data.map((row) => [
                        formatDate(row.created_at, true),
                        <span>
                            <strong>{row.product_name}</strong>
                            <small className="block">{row.sku}</small>
                        </span>,
                        <Tag>{labels[row.type] || row.type}</Tag>,
                        <b
                            className={
                                Number(row.quantity) >= 0
                                    ? "positive"
                                    : "negative"
                            }
                        >
                            {Number(row.quantity) >= 0 ? "+" : ""}
                            {Number(row.quantity)}
                        </b>,
                        Number(row.before_quantity),
                        <strong>{Number(row.after_quantity)}</strong>,
                        row.user_name || "Sistem",
                        row.notes || "—",
                    ])}
                />
            </article>
        </Page>
    );
}
function PromotionsPage({ rows, onAdd }) {
    return (
        <Page>
            <div className="page-toolbar">
                <div className="role-pills">
                    <span>
                        {rows.filter((x) => x.is_active).length} promo aktif
                    </span>
                    <span>
                        {rows.reduce(
                            (a, x) => a + Number(x.used_count || 0),
                            0,
                        )}{" "}
                        penggunaan
                    </span>
                </div>
                <button className="button primary" onClick={onAdd}>
                    <Icon name="plus" size={17} /> Buat Promo
                </button>
            </div>
            <div className="promotion-grid">
                {rows.length ? (
                    rows.map((row) => (
                        <article className="promotion-card" key={row.id}>
                            <div className="promo-card-top">
                                <span className="promo-ticket">
                                    <Icon name="receipt" />
                                </span>
                                <Status
                                    value={
                                        row.is_active ? "active" : "inactive"
                                    }
                                />
                            </div>
                            <span className="eyebrow">
                                {row.code || "PROMO OTOMATIS"}
                            </span>
                            <h3>{row.name}</h3>
                            <strong>
                                {row.type === "percentage"
                                    ? `${Number(row.value)}%`
                                    : money.format(row.value)}{" "}
                                OFF
                            </strong>
                            <p>
                                Minimum belanja{" "}
                                {money.format(row.minimum_purchase || 0)}
                            </p>
                            <div>
                                <small>Berlaku sampai</small>
                                <b>{formatDate(row.ends_at)}</b>
                            </div>
                        </article>
                    ))
                ) : (
                    <EmptyState
                        title="Belum ada promo"
                        detail="Buat voucher atau diskon terjadwal pertama Anda."
                        icon="receipt"
                    />
                )}
            </div>
        </Page>
    );
}
function FinancePage({ rows, onPay }) {
    const receivable = rows.filter((x) => x.type === "receivable"),
        payable = rows.filter((x) => x.type === "payable"),
        remaining = (list) =>
            list.reduce(
                (a, x) =>
                    a +
                    Math.max(0, Number(x.total_amount) - Number(x.paid_amount)),
                0,
            );
    return (
        <Page>
            <div className="finance-summary">
                <article>
                    <span>Piutang Pelanggan</span>
                    <strong>{money.format(remaining(receivable))}</strong>
                    <small>
                        {receivable.filter((x) => x.status !== "paid").length}{" "}
                        tagihan terbuka
                    </small>
                </article>
                <article>
                    <span>Hutang Pemasok</span>
                    <strong>{money.format(remaining(payable))}</strong>
                    <small>
                        {payable.filter((x) => x.status !== "paid").length}{" "}
                        kewajiban terbuka
                    </small>
                </article>
                <article className="net-position">
                    <span>Posisi Bersih</span>
                    <strong>
                        {money.format(
                            remaining(receivable) - remaining(payable),
                        )}
                    </strong>
                    <small>Dihitung secara real-time</small>
                </article>
            </div>
            <article className="panel table-panel">
                <DataTable
                    headers={[
                        "Referensi",
                        "Jenis",
                        "Pihak Terkait",
                        "Jatuh Tempo",
                        "Total",
                        "Terbayar",
                        "Sisa",
                        "Status",
                        "Aksi",
                    ]}
                    rows={rows.map((row) => {
                        const left = Math.max(
                            0,
                            Number(row.total_amount) - Number(row.paid_amount),
                        );
                        return [
                            <strong>
                                {row.reference_number || `FIN-${row.id}`}
                            </strong>,
                            <Tag>
                                {row.type === "receivable"
                                    ? "Piutang"
                                    : "Hutang"}
                            </Tag>,
                            row.customer_name || row.supplier_name || "—",
                            formatDate(row.due_date),
                            money.format(row.total_amount),
                            money.format(row.paid_amount),
                            <b>{money.format(left)}</b>,
                            <Status value={row.status} />,
                            left > 0 ? (
                                <button
                                    className="button xs outline"
                                    onClick={() => onPay(row)}
                                >
                                    Catat Bayar
                                </button>
                            ) : (
                                <span className="positive">Selesai</span>
                            ),
                        ];
                    })}
                />
            </article>
        </Page>
    );
}
function ShiftsPage({ shifts, cash }) {
    const open = shifts.filter((x) => x.status === "open"),
        inCash = cash
            .filter((x) => x.type === "in")
            .reduce((a, x) => a + Number(x.amount), 0),
        outCash = cash
            .filter((x) => x.type === "out")
            .reduce((a, x) => a + Number(x.amount), 0);
    return (
        <Page>
            <div className="shift-hero">
                <div>
                    <span className="eyebrow light">CASH CONTROL</span>
                    <h2>{open.length} shift sedang berjalan</h2>
                    <p>
                        Kontrol kas fisik, selisih, kas masuk, dan kas keluar
                        dari satu layar.
                    </p>
                </div>
                <div>
                    <span>Arus kas tercatat</span>
                    <strong>{money.format(inCash - outCash)}</strong>
                </div>
            </div>
            <section className="dashboard-grid">
                <article className="panel table-panel">
                    <PanelHeading
                        eyebrow="SHIFT"
                        title="Riwayat Rekonsiliasi"
                    />
                    <DataTable
                        headers={[
                            "Register",
                            "Kasir",
                            "Dibuka",
                            "Modal",
                            "Kas Diharapkan",
                            "Selisih",
                            "Status",
                        ]}
                        rows={shifts.map((row) => [
                            row.register_name,
                            row.user_name,
                            formatDate(row.opened_at, true),
                            money.format(row.opening_cash),
                            money.format(row.expected_cash),
                            <b
                                className={
                                    Number(row.difference) < 0
                                        ? "negative"
                                        : "positive"
                                }
                            >
                                {money.format(row.difference)}
                            </b>,
                            <Status value={row.status} />,
                        ])}
                    />
                </article>
                <article className="panel">
                    <PanelHeading
                        eyebrow="ARUS KAS"
                        title="Kas Masuk & Keluar"
                    />
                    <div className="cash-feed">
                        {cash.length ? (
                            cash.slice(0, 8).map((row) => (
                                <div key={row.id}>
                                    <span
                                        className={`cash-direction ${row.type}`}
                                    >
                                        <Icon
                                            name={
                                                row.type === "in"
                                                    ? "arrowUp"
                                                    : "wallet"
                                            }
                                            size={16}
                                        />
                                    </span>
                                    <span>
                                        <strong>{row.category}</strong>
                                        <small>
                                            {row.user_name} ·{" "}
                                            {formatDate(row.created_at, true)}
                                        </small>
                                    </span>
                                    <b
                                        className={
                                            row.type === "in"
                                                ? "positive"
                                                : "negative"
                                        }
                                    >
                                        {row.type === "in" ? "+" : "-"}
                                        {money.format(row.amount)}
                                    </b>
                                </div>
                            ))
                        ) : (
                            <EmptyState
                                compact
                                title="Belum ada pergerakan kas"
                            />
                        )}
                    </div>
                </article>
            </section>
        </Page>
    );
}
function EmployeesPage({ boot, users, onAdd, onToggle }) {
    return (
        <Page>
            <div className="page-toolbar">
                <div className="role-pills">
                    <span>{users.length} akun tim</span>
                    <span>{users.filter((x) => x.is_active).length} aktif</span>
                    <span>3 level akses</span>
                </div>
                <button className="button primary" onClick={onAdd}>
                    <Icon name="plus" size={17} /> Tambah Karyawan
                </button>
            </div>
            <article className="panel table-panel employee-table">
                <DataTable
                    headers={[
                        "Karyawan",
                        "Role",
                        "Outlet",
                        "Status",
                        "Terdaftar",
                        "Kontrol",
                    ]}
                    rows={users.map((user) => [
                        <span className="person">
                            <span>{initials(user.name)}</span>
                            <strong>
                                {user.name}
                                <small>{user.email}</small>
                            </strong>
                        </span>,
                        <span className={`role-badge role-${user.role}`}>
                            {roleLabel(user.role)}
                        </span>,
                        user.outlet?.name || "Semua outlet",
                        <Status
                            value={user.is_active ? "active" : "inactive"}
                        />,
                        formatDate(user.created_at),
                        <button
                            className="button xs outline"
                            disabled={user.id === boot?.user?.id}
                            onClick={() => onToggle(user)}
                        >
                            {user.is_active ? "Nonaktifkan" : "Aktifkan"}
                        </button>,
                    ])}
                />
            </article>
            <article className="panel permission-panel">
                <PanelHeading
                    eyebrow="KEAMANAN BERLAPIS"
                    title="Matriks Hak Akses Server"
                />
                <p className="permission-intro">
                    Menu disembunyikan pada antarmuka dan endpoint sensitif juga
                    ditolak oleh server.
                </p>
                <div className="permission-grid">
                    <strong>Fitur</strong>
                    <strong>Admin</strong>
                    <strong>Kasir</strong>
                    {[
                        "Dashboard & transaksi",
                        "Void transaksi",
                        "Produk & inventori",
                        "Pembelian & keuangan",
                        "Laporan bisnis",
                        "Kelola pengguna & pengaturan",
                    ].flatMap((x, i) => [
                        <span key={x}>{x}</span>,
                        <b key={`${i}a`}>✓</b>,
                        <b className={i > 0 ? "muted" : ""} key={`${i}b`}>
                            {i > 0 ? "—" : "✓"}
                        </b>,
                    ])}
                </div>
            </article>
        </Page>
    );
}
function Employee({ name, email, role, owner }) {
    return (
        <article className={`employee-card ${owner ? "owner" : ""}`}>
            <div className="employee-top">
                <span className={`avatar large ${owner ? "" : "secondary"}`}>
                    {initials(name)}
                </span>
                <Status value="active" />
            </div>
            <h3>{name}</h3>
            <p>{email}</p>
            <Tag>{role}</Tag>
            <div className="employee-meta">
                <span>
                    <small>Outlet</small>
                    <strong>Flagship Store</strong>
                </span>
                <span>
                    <small>Akses terakhir</small>
                    <strong>Sekarang</strong>
                </span>
            </div>
        </article>
    );
}
function SettingsPage({ boot, showToast }) {
    const [tab, setTab] = useState("business");
    const labels = {
        business: "Profil Bisnis",
        transaction: "Aturan Transaksi",
        receipt: "Struk & Printer",
        loyalty: "Loyalty Program",
        notification: "Notifikasi",
        security: "Keamanan Akun",
    };
    return (
        <Page extra="settings-layout">
            <aside className="settings-nav">
                {Object.entries(labels).map(([id, label]) => (
                    <button
                        className={tab === id ? "active" : ""}
                        onClick={() => setTab(id)}
                        key={id}
                    >
                        {label}
                        <Icon name="chevron" size={14} />
                    </button>
                ))}
            </aside>
            <article className="panel settings-panel">
                <PanelHeading eyebrow="PENGATURAN" title={labels[tab]} />
                {tab === "business" ? (
                    <div className="settings-form">
                        <div className="business-logo">PC</div>
                        <Field
                            label="Nama bisnis"
                            defaultValue={boot?.settings?.business_name}
                        />
                        <Field
                            label="Nama outlet"
                            defaultValue={boot?.outlet?.name}
                        />
                        <div className="field-row">
                            <Field
                                label="Nomor telepon"
                                defaultValue={boot?.outlet?.phone}
                            />
                            <Field
                                label="Kota"
                                defaultValue={boot?.outlet?.city}
                            />
                        </div>
                        <Field
                            label="Alamat"
                            defaultValue={boot?.outlet?.address}
                        />
                    </div>
                ) : (
                    <SettingsOptions tab={tab} boot={boot} />
                )}
                <div className="settings-actions">
                    <button
                        className="button primary"
                        onClick={() =>
                            showToast("Pengaturan berhasil disimpan.")
                        }
                    >
                        Simpan Perubahan
                    </button>
                </div>
            </article>
        </Page>
    );
}
function SettingsOptions({ tab, boot }) {
    const content = {
        transaction: [
            ["Pajak penjualan", `${boot?.settings?.tax_percent || 11}%`],
            ["Izinkan transaksi piutang", "Aktif"],
            ["Konfirmasi sebelum void", "Aktif"],
            ["Harga grosir otomatis", "Aktif"],
        ],
        receipt: [
            ["Ukuran kertas", boot?.settings?.receipt_width || "80mm"],
            ["Cetak struk otomatis", "Aktif"],
            ["Tampilkan logo", "Aktif"],
            ["Kirim struk digital", "Aktif"],
        ],
        loyalty: [
            [
                "Nilai per poin",
                money.format(boot?.settings?.points_per_amount || 10000),
            ],
            ["Masa berlaku poin", "12 bulan"],
            ["Tier membership", "4 tingkat"],
            ["Promo ulang tahun", "Aktif"],
        ],
        notification: [
            ["Stok menipis", "Aktif"],
            ["Ringkasan harian", "Aktif"],
            ["Jatuh tempo hutang", "Aktif"],
            ["Aktivitas mencurigakan", "Aktif"],
        ],
        security: [
            ["Autentikasi dua faktor", "Tersedia"],
            ["PIN supervisor", "Aktif"],
            ["Audit aktivitas", "Aktif"],
            ["Backup database", "Harian"],
        ],
    };
    return (
        <div className="option-list">
            {content[tab].map(([l, v]) => (
                <div key={l}>
                    <span>
                        <strong>{l}</strong>
                        <small>Dapat disesuaikan untuk setiap outlet.</small>
                    </span>
                    <button className="option-value">
                        {v}
                        <Icon name="chevron" size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
}

function PaymentModal({
    cart,
    customers,
    customerId,
    setCustomerId,
    onClose,
    onSuccess,
    showToast,
}) {
    const itemSubtotal = cart.reduce(
        (a, x) =>
            a +
            Number(x.selling_price) * x.quantity -
            Number(x.discount_amount || 0),
        0,
    );
    const [totalDiscount, setTotalDiscount] = useState(0),
        total = Math.max(0, itemSubtotal - Number(totalDiscount || 0));
    const [method, setMethod] = useState("cash"),
        [paid, setPaid] = useState(total),
        [busy, setBusy] = useState(false);
    useEffect(() => {
        setPaid(total);
    }, [total, method]);
    const submit = async () => {
        setBusy(true);
        try {
            const sale = await api("/sales", {
                method: "POST",
                body: JSON.stringify({
                    customer_id: customerId || null,
                    discount_amount: Number(totalDiscount || 0),
                    items: cart.map((x) => ({
                        product_id: x.id,
                        product_variant_id: x.product_variant_id,
                        quantity: x.quantity,
                        discount_amount: Number(x.discount_amount || 0),
                    })),
                    payments: [
                        {
                            method,
                            amount: method === "cash" ? Number(paid) : total,
                        },
                    ],
                }),
            });
            onSuccess(sale);
        } catch (e) {
            showToast(e.message, "error");
        } finally {
            setBusy(false);
        }
    };
    return (
        <Modal
            title="Pembayaran"
            subtitle="Selesaikan transaksi dengan metode pilihan pelanggan."
            onClose={onClose}
            wide
        >
            <div className="payment-layout">
                <div>
                    <span className="form-label">Metode pembayaran</span>
                    <div className="method-grid compact-method">
                        {[
                            ["cash", "Tunai", "wallet"],
                            ["qris", "QRIS", "scan"],
                            ["transfer", "Transfer", "layers"],
                        ].map(([id, label, icon]) => (
                            <button
                                className={method === id ? "active" : ""}
                                onClick={() => setMethod(id)}
                                key={id}
                            >
                                <Icon name={icon} />
                                <span>{label}</span>
                            </button>
                        ))}
                    </div>
                    <label className="form-field">
                        <span>Pelanggan</span>
                        <select
                            value={customerId}
                            onChange={(e) => setCustomerId(e.target.value)}
                        >
                            <option value="">Pelanggan umum</option>
                            {customers.map((c) => (
                                <option value={c.id} key={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <Field
                        label="Diskon total"
                        type="number"
                        value={totalDiscount}
                        onChange={(v) =>
                            setTotalDiscount(Math.max(0, Number(v)))
                        }
                    />
                    {method === "cash" && (
                        <>
                            <Field
                                label="Uang diterima"
                                type="number"
                                value={paid}
                                onChange={setPaid}
                            />
                            <div className="quick-money">
                                {[
                                    total,
                                    Math.ceil(total / 50000) * 50000,
                                    Math.ceil(total / 100000) * 100000,
                                ]
                                    .filter((x, i, a) => a.indexOf(x) === i)
                                    .map((x) => (
                                        <button
                                            onClick={() => setPaid(x)}
                                            key={x}
                                        >
                                            {money.format(x)}
                                        </button>
                                    ))}
                            </div>
                        </>
                    )}
                </div>
                <aside className="payment-total">
                    <span>Total Pembayaran</span>
                    <strong>{money.format(total)}</strong>
                    <div>
                        <span>Diskon total</span>
                        <b>-{money.format(totalDiscount)}</b>
                    </div>
                    <div>
                        <span>Dibayar</span>
                        <b>{money.format(Number(paid) || 0)}</b>
                    </div>
                    <div>
                        <span>Kembalian</span>
                        <b className="green">
                            {money.format(Math.max(0, Number(paid) - total))}
                        </b>
                    </div>
                    <button
                        className="button primary full"
                        disabled={busy || Number(paid) < total}
                        onClick={submit}
                    >
                        {busy ? "Memproses..." : "Konfirmasi Pembayaran"}
                    </button>
                    <small>
                        Stok barang dikurangi otomatis setelah pembayaran
                        berhasil.
                    </small>
                </aside>
            </div>
        </Modal>
    );
}

function SuspendModal({ cart, customerId, onClose, onSuccess, showToast }) {
    const [form, setForm] = useState({ name: "", notes: "" }),
        [busy, setBusy] = useState(false);
    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            await api("/suspended-transactions", {
                method: "POST",
                body: JSON.stringify({
                    ...form,
                    customer_id: customerId || null,
                    items: cart.map((x) => ({
                        product_id: x.id,
                        product_variant_id: x.product_variant_id,
                        quantity: x.quantity,
                        discount_amount: Number(x.discount_amount || 0),
                    })),
                }),
            });
            onSuccess();
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            setBusy(false);
        }
    };
    return (
        <Modal
            title="Tunda Pembayaran"
            subtitle="Keranjang disimpan tanpa mengurangi stok."
            onClose={onClose}
        >
            <form className="modal-form" onSubmit={submit}>
                <Field
                    label="Nama pesanan *"
                    value={form.name}
                    onChange={(v) => setForm({ ...form, name: v })}
                />
                <Field
                    label="Catatan"
                    value={form.notes}
                    onChange={(v) => setForm({ ...form, notes: v })}
                />
                <div className="stock-preview">
                    <span>
                        {cart.reduce((a, x) => a + x.quantity, 0)} item akan
                        disimpan
                    </span>
                    <strong>
                        {money.format(
                            cart.reduce(
                                (a, x) =>
                                    a +
                                    Number(x.selling_price) * x.quantity -
                                    Number(x.discount_amount || 0),
                                0,
                            ),
                        )}
                    </strong>
                </div>
                <ModalActions
                    onClose={onClose}
                    busy={busy}
                    label="Simpan Transaksi Tunda"
                />
            </form>
        </Modal>
    );
}
function CategoryManager({ categories, onClose, onChanged, showToast }) {
    const [form, setForm] = useState({ name: "", color: "#71847b" });
    const [busy, setBusy] = useState(false);
    const create = async (event) => {
        event.preventDefault();
        setBusy(true);
        try {
            await api("/categories", {
                method: "POST",
                body: JSON.stringify(form),
            });
            setForm({ name: "", color: "#71847b" });
            await onChanged();
            showToast("Kategori pakaian berhasil ditambahkan.");
        } catch (error) {
            showToast(error.message, "error");
        } finally {
            setBusy(false);
        }
    };
    const edit = async (category) => {
        const name = prompt("Nama kategori:", category.name);
        if (!name) return;
        const color = prompt("Warna kategori (hex):", category.color);
        if (!color) return;
        try {
            await api(`/categories/${category.id}`, {
                method: "PUT",
                body: JSON.stringify({ name, color }),
            });
            await onChanged();
            showToast("Kategori berhasil diperbarui.");
        } catch (error) {
            showToast(error.message, "error");
        }
    };
    const remove = async (category) => {
        if (!confirm(`Hapus kategori ${category.name}?`)) return;
        try {
            await api(`/categories/${category.id}`, { method: "DELETE" });
            await onChanged();
            showToast("Kategori berhasil dihapus.");
        } catch (error) {
            showToast(error.message, "error");
        }
    };
    return (
        <Modal
            title="Kelola Kategori Pakaian"
            subtitle="Kategori membantu pencarian dan penyusunan koleksi."
            onClose={onClose}
            wide
        >
            <form className="category-create" onSubmit={create}>
                <Field
                    label="Nama kategori *"
                    value={form.name}
                    onChange={(name) => setForm({ ...form, name })}
                />
                <label className="form-field">
                    <span>Warna</span>
                    <input
                        type="color"
                        value={form.color}
                        onChange={(event) =>
                            setForm({ ...form, color: event.target.value })
                        }
                    />
                </label>
                <button className="button primary" disabled={busy}>
                    <Icon name="plus" size={16} />
                    {busy ? "Menyimpan..." : "Tambah Kategori"}
                </button>
            </form>
            <div className="category-list">
                {categories.map((category) => (
                    <div key={category.id}>
                        <i style={{ background: category.color }} />
                        <span>
                            <strong>{category.name}</strong>
                            <small>{category.color}</small>
                        </span>
                        <button
                            className="button xs outline"
                            onClick={() => edit(category)}
                        >
                            Edit
                        </button>
                        <button
                            className="icon-button tiny"
                            onClick={() => remove(category)}
                            title="Hapus kategori"
                        >
                            <Icon name="trash" size={14} />
                        </button>
                    </div>
                ))}
            </div>
            <div className="modal-actions">
                <button className="button outline" onClick={onClose}>
                    Selesai
                </button>
            </div>
        </Modal>
    );
}

function ProductModal({
    product,
    categories,
    units,
    onClose,
    onSuccess,
    showToast,
}) {
    const [form, setForm] = useState(() =>
            product
                ? {
                      ...product,
                      variants: (product.variants || []).map((v) => ({
                          ...v,
                          stock: Number(v.stock),
                      })),
                  }
                : {
                      name: "",
                      sku: "",
                      barcode: "",
                      category_id: "",
                      unit_id: "",
                      cost_price: "",
                      selling_price: "",
                      wholesale_price: "",
                      min_stock: 5,
                      track_stock: true,
                      is_active: true,
                      variants: [
                          { color: "Default", stock: 0 },
                      ],
                  },
        ),
        [imageFile, setImageFile] = useState(null),
        [busy, setBusy] = useState(false),
        [generating, setGenerating] = useState(false);
    const preview = imageFile ? URL.createObjectURL(imageFile) : product?.image;
    const generate = async () => {
        setGenerating(true);
        try {
            const result = await api("/barcodes/generate", { method: "POST" });
            setForm((current) => ({
                ...current,
                barcode: result.barcode,
                sku: current.sku || result.sku_suggestion,
            }));
            showToast("Barcode EAN-13 unik berhasil dibuat.");
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            setGenerating(false);
        }
    };
    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            const saved = await api(
                product ? `/products/${product.id}` : "/products",
                {
                    method: product ? "PUT" : "POST",
                    body: JSON.stringify(form),
                },
            );
            if (imageFile)
                await upload(`/products/${saved.id}/image`, imageFile);
            onSuccess();
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            setBusy(false);
        }
    };
    const updateVariant = (index, key, value) =>
        setForm((current) => ({
            ...current,
            variants: current.variants.map((v, i) =>
                i === index ? { ...v, [key]: value } : v,
            ),
        }));
    return (
        <Modal
            title={product ? "Edit Produk" : "Tambah Produk Baru"}
            subtitle="Lengkapi identitas, foto, harga, stok, serta pilihan warna."
            onClose={onClose}
            wide
        >
            <form className="modal-form" onSubmit={submit}>
                <div className="product-editor-head">
                    <label
                        className={`product-upload ${preview ? "has-preview" : ""}`}
                    >
                        {preview ? (
                            <img src={preview} alt="Pratinjau produk" />
                        ) : (
                            <>
                                <Icon name="box" />
                                <strong>Foto Produk</strong>
                            </>
                        )}
                        <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={(e) =>
                                setImageFile(e.target.files?.[0] || null)
                            }
                        />
                        <span>
                            {imageFile
                                ? "Ganti gambar"
                                : "Pilih JPG, PNG, atau WebP"}
                        </span>
                    </label>
                    <div className="product-editor-fields">
                        <Field
                            label="Nama produk *"
                            value={form.name}
                            onChange={(v) => setForm({ ...form, name: v })}
                        />
                        <Field
                            label="SKU *"
                            value={form.sku}
                            onChange={(v) => setForm({ ...form, sku: v })}
                        />
                        <SelectField
                            label="Kategori"
                            value={form.category_id || ""}
                            onChange={(v) =>
                                setForm({ ...form, category_id: v })
                            }
                            options={categories.map((c) => [c.id, c.name])}
                        />
                    </div>
                </div>
                <div className="barcode-editor">
                    <div>
                        <Field
                            label="Barcode EAN-13"
                            value={form.barcode || ""}
                            onChange={(v) => setForm({ ...form, barcode: v })}
                        />
                        <small>
                            Bisa dipindai di kasir dan dicetak menjadi label
                            produk.
                        </small>
                    </div>
                    <button
                        type="button"
                        className="button outline barcode-generate"
                        onClick={generate}
                        disabled={generating}
                    >
                        <Icon name="scan" size={17} />
                        {generating ? "Membuat..." : "Buat Kode Otomatis"}
                    </button>
                </div>
                <div className="field-row triple">
                    <Field
                        label="Harga modal *"
                        type="number"
                        value={form.cost_price}
                        onChange={(v) => setForm({ ...form, cost_price: v })}
                    />
                    <Field
                        label="Harga jual *"
                        type="number"
                        value={form.selling_price}
                        onChange={(v) => setForm({ ...form, selling_price: v })}
                    />
                    <Field
                        label="Stok minimum"
                        type="number"
                        value={form.min_stock}
                        onChange={(v) => setForm({ ...form, min_stock: v })}
                    />
                </div>
                <div className="variant-editor">
                    <div className="variant-editor-head">
                        <span>
                            <strong>Warna Produk</strong>
                            <small>
                                Stok dapat dipisahkan berdasarkan warna barang.
                            </small>
                        </span>
                        <button
                            type="button"
                            className="button xs outline"
                            onClick={() =>
                                setForm({
                                    ...form,
                                    variants: [
                                        ...form.variants,
                                        {
                                            color: "",
                                            stock: 0,
                                        },
                                    ],
                                })
                            }
                        >
                            <Icon name="plus" size={14} /> Tambah Warna
                        </button>
                    </div>
                    {form.variants.map((v, i) => (
                        <div className="variant-row" key={v.id || i}>
                            <Field
                                label="Warna"
                                value={v.color}
                                onChange={(value) =>
                                    updateVariant(i, "color", value)
                                }
                            />
                            <Field
                                label="Stok"
                                type="number"
                                value={v.stock ?? 0}
                                onChange={(value) =>
                                    updateVariant(i, "stock", value)
                                }
                            />
                            {form.variants.length > 1 && (
                                <button
                                    type="button"
                                    className="icon-button tiny"
                                    onClick={() =>
                                        setForm({
                                            ...form,
                                            variants: form.variants.filter(
                                                (_, index) => index !== i,
                                            ),
                                        })
                                    }
                                >
                                    <Icon name="trash" size={15} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
                <label className="form-field">
                    <span>Deskripsi</span>
                    <textarea
                        value={form.description || ""}
                        onChange={(e) =>
                            setForm({ ...form, description: e.target.value })
                        }
                    />
                </label>
                <label className="active-toggle">
                    <input
                        type="checkbox"
                        checked={Boolean(form.is_active)}
                        onChange={(event) =>
                            setForm({
                                ...form,
                                is_active: event.target.checked,
                            })
                        }
                    />
                    <span>
                        <strong>Produk aktif</strong>
                        <small>Tampilkan produk di halaman kasir.</small>
                    </span>
                </label>
                <ModalActions
                    onClose={onClose}
                    busy={busy}
                    label="Simpan Produk"
                />
            </form>
        </Modal>
    );
}
function StockModal({ product, onClose, onSuccess, showToast }) {
    const [form, setForm] = useState({
        type: "adjustment",
        quantity: 1,
        notes: "",
    });
    const submit = async (e) => {
        e.preventDefault();
        try {
            await api("/inventory/adjust", {
                method: "POST",
                body: JSON.stringify({
                    ...form,
                    product_id: product.id,
                    product_variant_id: product.selectedVariant.id,
                }),
            });
            onSuccess();
        } catch (err) {
            showToast(err.message, "error");
        }
    };
    return (
        <Modal
            title="Penyesuaian Stok"
            subtitle={`${product.name} · ${product.selectedVariant.color || "Default"} · Stok ${Number(product.selectedVariant.stock)}`}
            onClose={onClose}
        >
            <form className="modal-form" onSubmit={submit}>
                <SelectField
                    label="Jenis pergerakan"
                    value={form.type}
                    onChange={(v) => setForm({ ...form, type: v })}
                    options={[
                        ["adjustment", "Penyesuaian"],
                        ["stock_in", "Barang masuk"],
                        ["stock_out", "Barang keluar"],
                        ["damaged", "Rusak / hilang"],
                    ]}
                />
                <Field
                    label="Perubahan jumlah (+ / -)"
                    type="number"
                    value={form.quantity}
                    onChange={(v) => setForm({ ...form, quantity: v })}
                />
                <Field
                    label="Alasan *"
                    value={form.notes}
                    onChange={(v) => setForm({ ...form, notes: v })}
                />
                <div className="stock-preview">
                    <span>Stok setelah penyesuaian</span>
                    <strong>
                        {Number(product.selectedVariant.stock) +
                            Number(form.quantity || 0)}{" "}
                        unit
                    </strong>
                </div>
                <ModalActions onClose={onClose} label="Simpan Penyesuaian" />
            </form>
        </Modal>
    );
}
function SimpleFormModal({
    title,
    fields,
    endpoint,
    onClose,
    onSuccess,
    showToast,
}) {
    const [form, setForm] = useState({});
    const submit = async (e) => {
        e.preventDefault();
        try {
            await api(endpoint, { method: "POST", body: JSON.stringify(form) });
            onSuccess();
        } catch (err) {
            showToast(err.message, "error");
        }
    };
    return (
        <Modal
            title={title}
            subtitle="Data akan langsung tersedia di seluruh outlet."
            onClose={onClose}
        >
            <form className="modal-form" onSubmit={submit}>
                {fields.map(([key, label]) => (
                    <Field
                        key={key}
                        label={`${label}${key === "name" ? " *" : ""}`}
                        value={form[key] || ""}
                        onChange={(v) => setForm({ ...form, [key]: v })}
                    />
                ))}
                <ModalActions onClose={onClose} />
            </form>
        </Modal>
    );
}
function ExpenseModal({ onClose, onSuccess, showToast }) {
    const [form, setForm] = useState({
        category: "Operasional",
        description: "",
        amount: "",
        payment_method: "cash",
        expense_date: new Date().toISOString().slice(0, 10),
    });
    const submit = async (e) => {
        e.preventDefault();
        try {
            await api("/expenses", {
                method: "POST",
                body: JSON.stringify(form),
            });
            onSuccess();
        } catch (err) {
            showToast(err.message, "error");
        }
    };
    return (
        <Modal
            title="Catat Pengeluaran"
            subtitle="Masukkan biaya operasional agar laporan laba tetap akurat."
            onClose={onClose}
        >
            <form className="modal-form" onSubmit={submit}>
                <SelectField
                    label="Kategori"
                    value={form.category}
                    onChange={(v) => setForm({ ...form, category: v })}
                    options={[
                        "Operasional",
                        "Utilitas",
                        "Gaji",
                        "Kebersihan",
                        "Transportasi",
                        "Pemasaran",
                        "Lainnya",
                    ].map((x) => [x, x])}
                />
                <Field
                    label="Deskripsi *"
                    value={form.description}
                    onChange={(v) => setForm({ ...form, description: v })}
                />
                <div className="field-row">
                    <Field
                        label="Jumlah *"
                        type="number"
                        value={form.amount}
                        onChange={(v) => setForm({ ...form, amount: v })}
                    />
                    <Field
                        label="Tanggal"
                        type="date"
                        value={form.expense_date}
                        onChange={(v) => setForm({ ...form, expense_date: v })}
                    />
                </div>
                <SelectField
                    label="Metode pembayaran"
                    value={form.payment_method}
                    onChange={(v) => setForm({ ...form, payment_method: v })}
                    options={[
                        ["cash", "Tunai"],
                        ["transfer", "Transfer"],
                        ["debit", "Debit"],
                    ]}
                />
                <ModalActions onClose={onClose} label="Catat Pengeluaran" />
            </form>
        </Modal>
    );
}
function PurchaseModal({ products, suppliers, onClose, onSuccess, showToast }) {
    const [form, setForm] = useState({
        supplier_id: "",
        product_id: "",
        quantity: 1,
        cost_price: "",
        paid_amount: 0,
        purchase_date: new Date().toISOString().slice(0, 10),
    });
    const submit = async (e) => {
        e.preventDefault();
        try {
            await api("/purchases", {
                method: "POST",
                body: JSON.stringify({
                    supplier_id: form.supplier_id,
                    purchase_date: form.purchase_date,
                    paid_amount: form.paid_amount,
                    items: [
                        {
                            product_id: form.product_id,
                            quantity: form.quantity,
                            cost_price: form.cost_price,
                        },
                    ],
                }),
            });
            onSuccess();
        } catch (err) {
            showToast(err.message, "error");
        }
    };
    return (
        <Modal
            title="Penerimaan Pembelian"
            subtitle="Stok dan harga modal akan diperbarui otomatis."
            onClose={onClose}
            wide
        >
            <form className="modal-form" onSubmit={submit}>
                <div className="field-row">
                    <SelectField
                        label="Pemasok *"
                        value={form.supplier_id}
                        onChange={(v) => setForm({ ...form, supplier_id: v })}
                        options={suppliers.map((s) => [s.id, s.name])}
                    />
                    <Field
                        label="Tanggal pembelian"
                        type="date"
                        value={form.purchase_date}
                        onChange={(v) => setForm({ ...form, purchase_date: v })}
                    />
                </div>
                <SelectField
                    label="Produk *"
                    value={form.product_id}
                    onChange={(v) => {
                        const p = products.find(
                            (x) => String(x.id) === String(v),
                        );
                        setForm({
                            ...form,
                            product_id: v,
                            cost_price: p?.cost_price || "",
                        });
                    }}
                    options={products.map((p) => [
                        p.id,
                        `${p.name} · ${p.sku}`,
                    ])}
                />
                <div className="field-row triple">
                    <Field
                        label="Jumlah"
                        type="number"
                        value={form.quantity}
                        onChange={(v) => setForm({ ...form, quantity: v })}
                    />
                    <Field
                        label="Harga modal"
                        type="number"
                        value={form.cost_price}
                        onChange={(v) => setForm({ ...form, cost_price: v })}
                    />
                    <Field
                        label="Dibayar"
                        type="number"
                        value={form.paid_amount}
                        onChange={(v) => setForm({ ...form, paid_amount: v })}
                    />
                </div>
                <div className="stock-preview">
                    <span>Total pembelian</span>
                    <strong>
                        {money.format(
                            Number(form.quantity) * Number(form.cost_price),
                        )}
                    </strong>
                </div>
                <ModalActions onClose={onClose} label="Terima Barang" />
            </form>
        </Modal>
    );
}
function PromotionModal({ onClose, onSuccess, showToast }) {
    const [form, setForm] = useState({
            name: "",
            code: "",
            type: "percentage",
            value: 10,
            minimum_purchase: 0,
            maximum_discount: "",
            starts_at: new Date().toISOString().slice(0, 10),
            ends_at: "",
        }),
        [busy, setBusy] = useState(false);
    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            await api("/promotions", {
                method: "POST",
                body: JSON.stringify({
                    ...form,
                    code: form.code || null,
                    maximum_discount: form.maximum_discount || null,
                    ends_at: form.ends_at || null,
                }),
            });
            onSuccess();
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            setBusy(false);
        }
    };
    return (
        <Modal
            title="Buat Promo & Voucher"
            subtitle="Diskon terjadwal dengan kode yang mudah dibagikan."
            onClose={onClose}
            wide
        >
            <form className="modal-form" onSubmit={submit}>
                <div className="field-row">
                    <Field
                        label="Nama promo *"
                        value={form.name}
                        onChange={(v) => setForm({ ...form, name: v })}
                    />
                    <Field
                        label="Kode voucher"
                        value={form.code}
                        onChange={(v) =>
                            setForm({ ...form, code: v.toUpperCase() })
                        }
                    />
                </div>
                <div className="field-row triple">
                    <SelectField
                        label="Jenis diskon"
                        value={form.type}
                        onChange={(v) => setForm({ ...form, type: v })}
                        options={[
                            ["percentage", "Persentase (%)"],
                            ["fixed", "Nominal (Rp)"],
                        ]}
                    />
                    <Field
                        label="Nilai diskon *"
                        type="number"
                        value={form.value}
                        onChange={(v) => setForm({ ...form, value: v })}
                    />
                    <Field
                        label="Maksimum diskon"
                        type="number"
                        value={form.maximum_discount}
                        onChange={(v) =>
                            setForm({ ...form, maximum_discount: v })
                        }
                    />
                </div>
                <div className="field-row triple">
                    <Field
                        label="Minimum belanja"
                        type="number"
                        value={form.minimum_purchase}
                        onChange={(v) =>
                            setForm({ ...form, minimum_purchase: v })
                        }
                    />
                    <Field
                        label="Mulai"
                        type="date"
                        value={form.starts_at}
                        onChange={(v) => setForm({ ...form, starts_at: v })}
                    />
                    <Field
                        label="Berakhir"
                        type="date"
                        value={form.ends_at}
                        onChange={(v) => setForm({ ...form, ends_at: v })}
                    />
                </div>
                <ModalActions
                    onClose={onClose}
                    busy={busy}
                    label="Aktifkan Promo"
                />
            </form>
        </Modal>
    );
}
function UserModal({ outlets, onClose, onSuccess, showToast }) {
    const [form, setForm] = useState({
            name: "",
            email: "",
            password: "",
            role: "cashier",
            outlet_id: outlets[0]?.id || "",
        }),
        [busy, setBusy] = useState(false);
    const submit = async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
            await api("/users", { method: "POST", body: JSON.stringify(form) });
            onSuccess();
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            setBusy(false);
        }
    };
    return (
        <Modal
            title="Tambah Akun Karyawan"
            subtitle="Hak akses diterapkan pada menu sekaligus API server."
            onClose={onClose}
        >
            <form className="modal-form" onSubmit={submit}>
                <Field
                    label="Nama lengkap *"
                    value={form.name}
                    onChange={(v) => setForm({ ...form, name: v })}
                />
                <Field
                    label="Email *"
                    type="email"
                    value={form.email}
                    onChange={(v) => setForm({ ...form, email: v })}
                />
                <Field
                    label="Password awal *"
                    type="password"
                    value={form.password}
                    onChange={(v) => setForm({ ...form, password: v })}
                />
                <div className="field-row">
                    <SelectField
                        label="Role"
                        value={form.role}
                        onChange={(v) => setForm({ ...form, role: v })}
                        options={[
                            ["cashier", "Kasir — transaksi saja"],
                            ["admin", "Admin — akses penuh"],
                        ]}
                    />
                    <SelectField
                        label="Outlet"
                        value={form.outlet_id}
                        onChange={(v) => setForm({ ...form, outlet_id: v })}
                        options={outlets.map((x) => [x.id, x.name])}
                    />
                </div>
                <div className="access-preview">
                    <Icon name="settings" />
                    <span>
                        <strong>{roleLabel(form.role)}</strong>
                        <small>
                            {form.role === "admin"
                                ? "Akses penuh termasuk pengguna dan pengaturan"
                                : "Kasir, transaksi tunda, cetak struk, dan riwayat miliknya"}
                        </small>
                    </span>
                </div>
                <ModalActions onClose={onClose} busy={busy} label="Buat Akun" />
            </form>
        </Modal>
    );
}
function BarcodeGraphic({ value }) {
    const ref = useRef(null);
    useEffect(() => {
        if (!value || !ref.current) return;
        try {
            JsBarcode(ref.current, value, {
                format: /^\d{13}$/.test(value) ? "EAN13" : "CODE128",
                displayValue: true,
                font: "Inter",
                fontSize: 13,
                height: 54,
                width: 1.7,
                margin: 4,
                background: "#fff",
                lineColor: "#10251b",
            });
        } catch {
            /* barcode manual yang tidak valid tetap ditampilkan sebagai teks */
        }
    }, [value]);
    return value ? (
        <svg ref={ref} aria-label={`Barcode ${value}`} />
    ) : (
        <span className="barcode-empty">Belum ada barcode</span>
    );
}
function BarcodeModal({ product, onClose }) {
    const [quantity, setQuantity] = useState(8),
        [paper, setPaper] = useState("label50"),
        [template, setTemplate] = useState("boutique"),
        [storeName, setStoreName] = useState("PUTRI COLLECTION"),
        [fields, setFields] = useState({
            store: true,
            name: true,
            category: true,
            sku: true,
            selling: true,
            cost: false,
            wholesale: false,
            stock: false,
            printDate: false,
        });
    const canShowCost =
            product.cost_price !== undefined && product.cost_price !== null,
        toggle = (key) =>
            setFields((current) => ({ ...current, [key]: !current[key] }));
    const fieldChoices = [
        ["store", "Nama toko"],
        ["name", "Nama barang"],
        ["category", "Kategori"],
        ["sku", "Kode barang / SKU"],
        ["selling", "Harga jual"],
        ["cost", "Harga modal"],
        ["wholesale", "Harga grosir"],
        ["stock", "Stok tersedia"],
        ["printDate", "Tanggal cetak"],
    ];
    return (
        <Modal
            title="Studio Label Barcode Thermal"
            subtitle="Atur ukuran label, informasi produk, dan jumlah cetak sesuai printer Anda."
            onClose={onClose}
            wide
        >
            <div className="barcode-designer">
                <aside className="barcode-controls">
                    <span className="control-title">FORMAT KERTAS</span>
                    <div className="paper-presets">
                        {[
                            ["label30", "30 × 20 mm"],
                            ["label40", "40 × 30 mm"],
                            ["label50", "50 × 30 mm"],
                            ["label50x40", "50 × 40 mm"],
                            ["thermal58", "Thermal 58 mm"],
                            ["thermal80", "Thermal 80 mm"],
                            ["a4", "Kertas A4"],
                        ].map(([id, label]) => (
                            <button
                                className={paper === id ? "active" : ""}
                                onClick={() => setPaper(id)}
                                key={id}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <div className="designer-row">
                        <SelectField
                            label="Gaya label"
                            value={template}
                            onChange={setTemplate}
                            options={[
                                ["boutique", "Boutique Premium"],
                                ["retail", "Retail Modern"],
                                ["compact", "Hemat / Compact"],
                            ]}
                        />
                        <Field
                            label="Jumlah cetak"
                            type="number"
                            value={quantity}
                            onChange={(v) =>
                                setQuantity(
                                    Math.max(1, Math.min(100, Number(v) || 1)),
                                )
                            }
                        />
                    </div>
                    <Field
                        label="Nama toko pada label"
                        value={storeName}
                        onChange={setStoreName}
                    />
                    <span className="control-title">
                        INFORMASI YANG DICETAK
                    </span>
                    <div className="label-field-grid">
                        {fieldChoices.map(([id, label]) => (
                            <label
                                className={
                                    !canShowCost && id === "cost"
                                        ? "disabled"
                                        : ""
                                }
                                key={id}
                            >
                                <input
                                    type="checkbox"
                                    checked={Boolean(fields[id])}
                                    disabled={!canShowCost && id === "cost"}
                                    onChange={() => toggle(id)}
                                />
                                <span>{label}</span>
                            </label>
                        ))}
                    </div>
                    {!canShowCost && (
                        <div className="label-security">
                            <Icon name="settings" size={15} /> Harga modal hanya
                            tersedia untuk Admin.
                        </div>
                    )}
                    <div className="thermal-note">
                        <Icon name="scan" />
                        <span>
                            <strong>Kompatibel printer thermal</strong>
                            <small>
                                Gunakan skala 100%, margin none, dan matikan
                                header/footer browser saat mencetak.
                            </small>
                        </span>
                    </div>
                </aside>
                <section className="label-preview-panel">
                    <div className="preview-caption">
                        <span>PRATINJAU HASIL</span>
                        <b>
                            {quantity} label · {paper.replace("label", "")}{" "}
                        </b>
                    </div>
                    <div
                        className={`barcode-sheet paper-${paper} template-${template}`}
                        id="barcode-print-area"
                    >
                        {Array.from({ length: quantity }, (_, i) => (
                            <article className="barcode-label" key={i}>
                                {fields.store && (
                                    <span className="barcode-brand">
                                        {storeName}
                                    </span>
                                )}
                                {fields.category && (
                                    <small className="label-category">
                                        {product.category?.name ||
                                            "KOLEKSI PILIHAN"}
                                    </small>
                                )}
                                {fields.name && <strong>{product.name}</strong>}
                                <BarcodeGraphic value={product.barcode} />
                                {fields.sku && (
                                    <span className="label-sku">
                                        KODE: {product.sku}
                                    </span>
                                )}
                                <div className="label-prices">
                                    {fields.selling && (
                                        <span>
                                            <small>HARGA</small>
                                            <b>
                                                {compactMoney(
                                                    product.selling_price,
                                                )}
                                            </b>
                                        </span>
                                    )}
                                    {fields.cost && canShowCost && (
                                        <span>
                                            <small>MODAL</small>
                                            <b>
                                                {compactMoney(
                                                    product.cost_price,
                                                )}
                                            </b>
                                        </span>
                                    )}
                                    {fields.wholesale &&
                                        product.wholesale_price && (
                                            <span>
                                                <small>GROSIR</small>
                                                <b>
                                                    {compactMoney(
                                                        product.wholesale_price,
                                                    )}
                                                </b>
                                            </span>
                                        )}
                                </div>
                                {(fields.stock || fields.printDate) && (
                                    <div className="label-meta">
                                        {fields.stock && (
                                            <span>
                                                STOK {Number(product.stock)}
                                            </span>
                                        )}
                                        {fields.printDate && (
                                            <span>
                                                {new Date().toLocaleDateString(
                                                    "id-ID",
                                                )}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </article>
                        ))}
                    </div>
                </section>
            </div>
            <div className="modal-actions barcode-actions">
                <button className="button outline" onClick={onClose}>
                    Tutup
                </button>
                <button
                    className="button primary"
                    disabled={!product.barcode}
                    onClick={() => printDocument("barcode", paper)}
                >
                    <Icon name="scan" size={17} /> Cetak {quantity} Label
                    Thermal
                </button>
            </div>
        </Modal>
    );
}
function ReceiptDocument({ sale, width = "80mm" }) {
    const profile = sale.receipt_profile || {},
        payments = sale.payments || [],
        items = sale.items || [],
        method = {
            cash: "TUNAI",
            qris: "QRIS",
            debit: "KARTU DEBIT",
            credit: "KARTU KREDIT",
            transfer: "TRANSFER",
            ewallet: "E-WALLET",
            credit_customer: "PIUTANG",
        };
    return (
        <article className={`boutique-receipt receipt-${width}`}>
            <header className="receipt-brand">
                <img
                    className="receipt-logo"
                    src={profile.logo || "/images/putri-collection-logo.svg"}
                    alt="Putri Collection"
                />
                <h2>{profile.business_name || "Putri Collection"}</h2>
                <p>{profile.outlet_name}</p>
                <small>
                    {[profile.address, profile.city].filter(Boolean).join(", ")}
                </small>
                <small>
                    {profile.whatsapp && `WhatsApp ${profile.whatsapp}`}
                </small>
            </header>
            <div className="receipt-rule ornament">
                <span>◆</span>
            </div>
            <section className="receipt-info">
                <div>
                    <span>NO. STRUK</span>
                    <b>{sale.invoice_number}</b>
                </div>
                <div>
                    <span>TANGGAL</span>
                    <b>{formatDate(sale.sold_at, true)}</b>
                </div>
                <div>
                    <span>KASIR</span>
                    <b>{sale.user?.name || "Kasir"}</b>
                </div>
                <div>
                    <span>PELANGGAN</span>
                    <b>{sale.customer?.name || "Pelanggan Umum"}</b>
                </div>
            </section>
            <div className="receipt-rule" />
            <section className="receipt-items">
                {items.map((item, index) => (
                    <div className="receipt-item" key={item.id || index}>
                        <div>
                            <strong>{item.product_name}</strong>
                            <small>
                                {item.sku}
                                {item.color && item.color !== "Default"
                                    ? ` · ${item.color}`
                                    : ""}
                            </small>
                        </div>
                        <div className="receipt-item-calc">
                            <span>
                                {Number(item.quantity)} ×{" "}
                                {compactMoney(item.unit_price)}
                            </span>
                            <b>{compactMoney(item.total)}</b>
                        </div>
                        {Number(item.discount_amount) > 0 && (
                            <em>
                                Diskon item -
                                {compactMoney(item.discount_amount)}
                            </em>
                        )}
                    </div>
                ))}
            </section>
            <div className="receipt-rule" />
            <section className="receipt-totals">
                <div>
                    <span>Subtotal</span>
                    <b>{compactMoney(sale.subtotal)}</b>
                </div>
                {Number(sale.discount_amount) > 0 && (
                    <div>
                        <span>Diskon</span>
                        <b>-{compactMoney(sale.discount_amount)}</b>
                    </div>
                )}
                {Number(sale.tax_amount) > 0 && (
                    <div>
                        <span>Pajak</span>
                        <b>{compactMoney(sale.tax_amount)}</b>
                    </div>
                )}
                {Number(sale.service_charge) > 0 && (
                    <div>
                        <span>Biaya layanan</span>
                        <b>{compactMoney(sale.service_charge)}</b>
                    </div>
                )}
                <div className="receipt-grand">
                    <span>TOTAL</span>
                    <strong>{compactMoney(sale.grand_total)}</strong>
                </div>
                {payments.map((payment, index) => (
                    <div key={payment.id || index}>
                        <span>
                            {method[payment.method] ||
                                String(payment.method).toUpperCase()}
                        </span>
                        <b>{compactMoney(payment.amount)}</b>
                    </div>
                ))}
                <div>
                    <span>Kembalian</span>
                    <b>{compactMoney(sale.change_amount)}</b>
                </div>
            </section>
            <section className="receipt-summary">
                <span>
                    {items.reduce(
                        (sum, item) => sum + Number(item.quantity),
                        0,
                    )}{" "}
                    ITEM
                </span>
                <span>
                    {sale.points_earned
                        ? `+${sale.points_earned} POIN`
                        : "THANK YOU"}
                </span>
            </section>
            <div className="receipt-invoice-code">
                <BarcodeGraphic value={sale.invoice_number} />
            </div>
            <footer className="receipt-footer">
                <strong>TERIMA KASIH TELAH BERBELANJA</strong>
                <p>
                    {profile.footer ||
                        "Barang dapat ditukar sesuai syarat dan ketentuan toko. Simpan struk ini sebagai bukti pembelian."}
                </p>
                <small>Putri Collection · Cantik, anggun, dan nyaman</small>
                <span>STRUK RESMI PUTRI COLLECTION</span>
            </footer>
        </article>
    );
}
function SuccessModal({ sale, onClose }) {
    const [width, setWidth] = useState(
            sale.receipt_profile?.paper_width === "58mm" ? "58mm" : "80mm",
        ),
        [copies, setCopies] = useState(1);
    return (
        <Modal
            title="Transaksi Berhasil"
            subtitle="Struk boutique siap dicetak pada printer thermal."
            onClose={onClose}
            wide
        >
            <div className="receipt-success-layout">
                <section className="receipt-preview-wrap">
                    <div className="receipt-preview-label">
                        <span>LIVE PREVIEW</span>
                        <b>Thermal {width}</b>
                    </div>
                    <div className="receipt-preview">
                        <ReceiptDocument sale={sale} width={width} />
                    </div>
                </section>
                <aside className="receipt-controls">
                    <span className="success-icon small-success">
                        <Icon name="check" size={24} />
                    </span>
                    <span className="eyebrow">PEMBAYARAN BERHASIL</span>
                    <h2>{money.format(sale.grand_total)}</h2>
                    <p>{sale.invoice_number}</p>
                    <div className="receipt-option">
                        <span>Lebar kertas</span>
                        <div>
                            {["58mm", "80mm"].map((size) => (
                                <button
                                    className={width === size ? "active" : ""}
                                    onClick={() => setWidth(size)}
                                    key={size}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>
                    <Field
                        label="Jumlah salinan"
                        type="number"
                        value={copies}
                        onChange={(v) =>
                            setCopies(Math.max(1, Math.min(5, Number(v) || 1)))
                        }
                    />
                    <div className="receipt-feature-list">
                        <span>✓ Logo & identitas boutique</span>
                        <span>✓ Detail barang dan kode SKU</span>
                        <span>✓ Pembayaran, pajak & kembalian</span>
                        <span>✓ Barcode nomor invoice</span>
                        <span>✓ Kebijakan penukaran barang</span>
                    </div>
                    <button
                        className="button primary full"
                        onClick={() => printDocument("receipt", width)}
                    >
                        <Icon name="receipt" size={17} /> Cetak Struk Thermal
                    </button>
                    <button className="button outline full" onClick={onClose}>
                        Transaksi Baru
                    </button>
                </aside>
            </div>
            <div className={`receipt-print-zone print-${width}`}>
                {Array.from({ length: copies }, (_, i) => (
                    <ReceiptDocument sale={sale} width={width} key={i} />
                ))}
            </div>
        </Modal>
    );
}

function Page({ children, extra = "" }) {
    return <div className={`page-content ${extra}`}>{children}</div>;
}
function Toolbar({
    search = "",
    setSearch = () => {},
    placeholder,
    action,
    onAction,
}) {
    return (
        <div className="page-toolbar">
            <Search
                value={search}
                onChange={setSearch}
                placeholder={placeholder}
            />
            <div className="toolbar-actions">
                <button className="button outline">
                    <Icon name="download" size={17} /> Ekspor
                </button>
                {action && (
                    <button className="button primary" onClick={onAction}>
                        <Icon name="plus" size={17} /> {action}
                    </button>
                )}
            </div>
        </div>
    );
}
function LogoutModal({ user, onClose, onConfirm, showToast }) {
    const [busy, setBusy] = useState(false);
    const submit = async () => {
        setBusy(true);
        try {
            await onConfirm();
        } catch (error) {
            setBusy(false);
            showToast(error.message, "error");
        }
    };
    return (
        <div
            className="modal-backdrop logout-backdrop"
            onMouseDown={(event) =>
                event.target === event.currentTarget && onClose()
            }
        >
            <section
                className="logout-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="logout-title"
            >
                <button
                    className="icon-button logout-close"
                    onClick={onClose}
                    aria-label="Tutup"
                >
                    <Icon name="close" size={18} />
                </button>
                <span className="logout-dialog-icon">
                    <Icon name="logout" size={30} />
                </span>
                <span className="eyebrow">KONFIRMASI KELUAR</span>
                <h2 id="logout-title">Keluar dari Putri Collection?</h2>
                <p>
                    Sesi <strong>{user?.name}</strong> akan diakhiri. Pastikan
                    transaksi yang sedang dikerjakan sudah disimpan atau
                    ditunda.
                </p>
                <div className="logout-actions">
                    <button
                        className="button outline"
                        onClick={onClose}
                        disabled={busy}
                    >
                        Tetap di Aplikasi
                    </button>
                    <button
                        className="button logout-confirm"
                        onClick={submit}
                        disabled={busy}
                    >
                        <Icon name="logout" size={17} />
                        {busy ? "Sedang keluar..." : "Ya, Keluar"}
                    </button>
                </div>
            </section>
        </div>
    );
}

function Modal({ title, subtitle, onClose, children, wide = false }) {
    return (
        <div
            className="modal-backdrop"
            onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className={`modal ${wide ? "wide" : ""}`}>
                <div className="modal-head">
                    <div>
                        <h2>{title}</h2>
                        {subtitle && <p>{subtitle}</p>}
                    </div>
                    <button className="icon-button" onClick={onClose}>
                        <Icon name="close" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}
function ModalActions({ onClose, busy, label = "Simpan" }) {
    return (
        <div className="modal-actions">
            <button type="button" className="button outline" onClick={onClose}>
                Batal
            </button>
            <button className="button primary" disabled={busy}>
                {busy ? "Menyimpan..." : label}
            </button>
        </div>
    );
}
function Search({ value, onChange, placeholder }) {
    return (
        <label className="search-box">
            <Icon name="search" size={19} />
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
            />
            <kbd>⌘ K</kbd>
        </label>
    );
}
function Field({ label, value, onChange, defaultValue, type = "text" }) {
    return (
        <label className="form-field">
            <span>{label}</span>
            <input
                type={type}
                value={onChange ? value : undefined}
                defaultValue={!onChange ? defaultValue : undefined}
                onChange={
                    onChange ? (e) => onChange(e.target.value) : undefined
                }
            />
        </label>
    );
}
function SelectField({ label, value, onChange, options }) {
    return (
        <label className="form-field">
            <span>{label}</span>
            <select value={value} onChange={(e) => onChange(e.target.value)}>
                <option value="">Pilih</option>
                {options.map(([v, l]) => (
                    <option value={v} key={v}>
                        {l}
                    </option>
                ))}
            </select>
        </label>
    );
}
function PanelHeading({ eyebrow, title, action }) {
    return (
        <div className="panel-heading">
            <div>
                <span className="eyebrow">{eyebrow}</span>
                <h2>{title}</h2>
            </div>
            {action}
        </div>
    );
}
function MiniMetric({ label, value, detail, danger }) {
    return (
        <div className={`mini-metric ${danger ? "danger" : ""}`}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{detail}</small>
        </div>
    );
}
function DataTable({ headers, rows }) {
    return (
        <div className="table-wrap">
            <table>
                <thead>
                    <tr>
                        {headers.map((h, i) => (
                            <th key={i}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.length ? (
                        rows.map((row, i) => (
                            <tr key={i}>
                                {row.map((cell, j) => (
                                    <td key={j}>{cell}</td>
                                ))}
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={headers.length}>
                                <EmptyState compact title="Belum ada data" />
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
function ProductCell({ p }) {
    return (
        <span className="table-product">
            <span
                className={p.image ? "with-image" : ""}
                style={{ "--color": p.category?.color }}
            >
                {p.image ? <img src={p.image} alt="" /> : initials(p.name)}
            </span>
            <strong>
                {p.name}
                <small>{p.description}</small>
            </strong>
        </span>
    );
}
function PersonCell({ p }) {
    return (
        <span className="person">
            <span>{initials(p.name)}</span>
            <strong>
                {p.name}
                <small>{p.code}</small>
            </strong>
        </span>
    );
}
function EmptyState({ title, detail, icon = "box", compact = false }) {
    return (
        <div className={`empty-state ${compact ? "compact" : ""}`}>
            <span>
                <Icon name={icon} />
            </span>
            <strong>{title}</strong>
            {detail && <p>{detail}</p>}
        </div>
    );
}
function Tag({ children }) {
    return <span className="tag">{children}</span>;
}
function Status({ value }) {
    const labels = {
        completed: "Selesai",
        void: "Dibatalkan",
        active: "Aktif",
        inactive: "Nonaktif",
        paid: "Lunas",
        unpaid: "Belum lunas",
        partial: "Sebagian",
        received: "Diterima",
        open: "Aktif",
    };
    return (
        <span className={`status status-${value}`}>
            <i />
            {labels[value] || value}
        </span>
    );
}
function Stock({ value, min }) {
    const v = Number(value),
        m = Number(min);
    return (
        <span
            className={`stock-pill ${v <= 0 ? "empty" : v <= m ? "low" : "safe"}`}
        >
            <i />
            {v <= 0 ? "Habis" : v <= m ? "Menipis" : "Aman"}
        </span>
    );
}
function PageSkeleton() {
    return (
        <div className="page-content skeleton-page">
            <div />
            <div />
            <div />
            <div />
        </div>
    );
}
function LoadingScreen({ appName }) {
    return (
        <div className="loading-screen">
            <div className="brand-mark large">
                <span>PC</span>
            </div>
            <strong>{appName}</strong>
            <span className="loading-line">
                <i />
            </span>
            <small>Menyiapkan business suite...</small>
        </div>
    );
}
function initials(name = "PC") {
    return name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((x) => x[0])
        .join("")
        .toUpperCase();
}
function roleLabel(role) {
    return { admin: "Admin", cashier: "Kasir" }[role] || "Administrator";
}
function formatDate(date, withTime = false) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    });
}

export default App;
