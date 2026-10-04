<!DOCTYPE html>
<html lang="id">
    <head>
        @include('partials.head')
    </head>
    <body class="pc-auth-body">
        <main class="pc-auth-shell">
            <section class="pc-auth-showcase">
                <div class="pc-auth-glow pc-auth-glow-one"></div>
                <div class="pc-auth-glow pc-auth-glow-two"></div>

                <a href="{{ route('home') }}" class="pc-auth-brand">
                    <span class="pc-auth-logo"><img src="/images/putri-collection-logo.svg" alt="Logo Putri Collection"></span>
                    <span><strong>PUTRI COLLECTION</strong><small>Muslim Fashion Boutique</small></span>
                </a>

                <div class="pc-auth-pitch">
                    <span class="pc-auth-kicker"><i></i> MODEST FASHION · MODERN POS</span>
                    <h1>Butik muslim yang tertata,<br><em>dari satu layar.</em></h1>
                    <p>Kelola koleksi, variasi ukuran dan warna, penjualan, stok, serta laporan Putri Collection dengan mudah.</p>
                    <div class="pc-auth-benefits">
                        <span>✓ Transaksi super cepat</span>
                        <span>✓ Laporan real-time</span>
                        <span>✓ Multi-outlet & role</span>
                    </div>
                </div>

                <div class="pc-auth-preview">
                    <div class="pc-preview-top"><span><i></i><i></i><i></i></span><b>Ringkasan Bisnis</b><em>Live</em></div>
                    <div class="pc-preview-body">
                        <div class="pc-preview-sidebar"><b>PU</b><i></i><i></i><i></i><i></i></div>
                        <div class="pc-preview-content">
                            <div class="pc-preview-welcome"><span><small>Penjualan hari ini</small><strong>Rp 8.450.000</strong></span><b>+18.4%</b></div>
                            <div class="pc-preview-metrics"><i></i><i></i><i></i></div>
                            <div class="pc-preview-chart"><span style="height:30%"></span><span style="height:48%"></span><span style="height:42%"></span><span style="height:67%"></span><span style="height:58%"></span><span style="height:85%"></span><span style="height:73%"></span></div>
                        </div>
                    </div>
                </div>

                <div class="pc-auth-proof"><span class="pc-proof-avatars"><i>AR</i><i>NP</i><i>BS</i><i>+</i></span><span><strong>Dipercaya tim bisnis modern</strong><small>Data aman · Dukungan operasional lengkap</small></span></div>
            </section>

            <section class="pc-auth-form-side">
                <div class="pc-auth-mobile-brand"><span class="pc-auth-logo"><img src="/images/putri-collection-logo.svg" alt="Logo Putri Collection"></span><strong>PUTRI COLLECTION</strong></div>
                <div class="pc-auth-form-wrap">
                    {{ $slot }}
                </div>
                <footer class="pc-auth-footer"><span>© {{ date('Y') }} Putri Collection</span><span><i></i> Sistem aman & terenkripsi</span></footer>
            </section>
        </main>

        @persist('toast')
            <flux:toast.group><flux:toast /></flux:toast.group>
        @endpersist
        @fluxScripts
    </body>
</html>
