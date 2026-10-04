<x-layouts::auth :title="__('Masuk')">
    <div class="pc-auth-form-heading">
        <span class="pc-auth-form-kicker">SELAMAT DATANG KEMBALI</span>
        <h2>Masuk ke Putri Collection</h2>
        <p>Kelola butik muslim dengan rapi, cepat, dan penuh perhatian.</p>
    </div>

    <x-auth-session-status class="pc-session-status" :status="session('status')" />

    <form method="POST" action="{{ route('login.store') }}" class="pc-auth-form">
        @csrf
        <label class="pc-auth-field">
            <span>Alamat email</span>
            <span class="pc-auth-input-wrap">
                <svg viewBox="0 0 24 24"><path d="M4 5h16v14H4V5Zm0 2 8 6 8-6" /></svg>
                <input id="login-email" name="email" value="{{ old('email') }}" type="email" required autofocus autocomplete="email" placeholder="nama@bisnis.com">
            </span>
            @error('email')<small class="pc-auth-error">{{ $message }}</small>@enderror
        </label>

        <label class="pc-auth-field">
            <span class="pc-auth-label-row"><span>Password</span>@if(Route::has('password.request'))<a href="{{ route('password.request') }}">Lupa password?</a>@endif</span>
            <span class="pc-auth-input-wrap">
                <svg viewBox="0 0 24 24"><path d="M6 10V8a6 6 0 0 1 12 0v2M5 10h14v11H5V10Z" /></svg>
                <input id="login-password" name="password" type="password" required autocomplete="current-password" placeholder="Masukkan password">
                <button type="button" class="pc-password-toggle" onclick="const input=document.getElementById('login-password');input.type=input.type==='password'?'text':'password'">Lihat</button>
            </span>
            @error('password')<small class="pc-auth-error">{{ $message }}</small>@enderror
        </label>

        <label class="pc-auth-remember"><input type="checkbox" name="remember" @checked(old('remember'))><span>Ingat saya di perangkat ini</span></label>

        <button class="pc-auth-submit" type="submit" data-test="login-button"><span>Masuk ke Dashboard</span><b>→</b></button>
    </form>

    <div class="pc-demo-divider"><span>Akses akun demo</span></div>
    <div class="pc-demo-accounts">
        <button type="button" onclick="document.getElementById('login-email').value='admin@putricollection.com';document.getElementById('login-password').value='password'">
            <span class="pc-demo-icon owner">A</span><span><strong>Admin</strong><small>Akses penuh</small></span><b>Gunakan</b>
        </button>
        <button type="button" onclick="document.getElementById('login-email').value='kasir@putricollection.com';document.getElementById('login-password').value='password'">
            <span class="pc-demo-icon cashier">K</span><span><strong>Kasir</strong><small>Akses transaksi</small></span><b>Gunakan</b>
        </button>
    </div>

    @if(Route::has('register'))
        <p class="pc-auth-switch">Belum memiliki akun? <a href="{{ route('register') }}">Daftar bisnis baru</a></p>
    @endif
</x-layouts::auth>
