<x-layouts::auth :title="__('Daftar')">
    <div class="pc-auth-form-heading compact">
        <span class="pc-auth-form-kicker">MULAI GRATIS</span>
        <h2>Buat akun Putri Collection</h2>
        <p>Siapkan akun operasional bisnis Anda dalam beberapa detik.</p>
    </div>

    <form method="POST" action="{{ route('register.store') }}" class="pc-auth-form compact">
        @csrf
        <label class="pc-auth-field">
            <span>Nama lengkap</span>
            <span class="pc-auth-input-wrap"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg><input name="name" value="{{ old('name') }}" type="text" required autofocus autocomplete="name" placeholder="Nama pemilik atau karyawan"></span>
            @error('name')<small class="pc-auth-error">{{ $message }}</small>@enderror
        </label>
        <label class="pc-auth-field">
            <span>Alamat email</span>
            <span class="pc-auth-input-wrap"><svg viewBox="0 0 24 24"><path d="M4 5h16v14H4V5Zm0 2 8 6 8-6"/></svg><input name="email" value="{{ old('email') }}" type="email" required autocomplete="email" placeholder="nama@bisnis.com"></span>
            @error('email')<small class="pc-auth-error">{{ $message }}</small>@enderror
        </label>
        <div class="pc-auth-field-grid">
            <label class="pc-auth-field">
                <span>Password</span>
                <span class="pc-auth-input-wrap"><svg viewBox="0 0 24 24"><path d="M6 10V8a6 6 0 0 1 12 0v2M5 10h14v11H5V10Z"/></svg><input name="password" type="password" required autocomplete="new-password" placeholder="Minimal 8 karakter"></span>
                @error('password')<small class="pc-auth-error">{{ $message }}</small>@enderror
            </label>
            <label class="pc-auth-field">
                <span>Ulangi password</span>
                <span class="pc-auth-input-wrap"><svg viewBox="0 0 24 24"><path d="M6 10V8a6 6 0 0 1 12 0v2M5 10h14v11H5V10Z"/></svg><input name="password_confirmation" type="password" required autocomplete="new-password" placeholder="Konfirmasi password"></span>
            </label>
        </div>
        <label class="pc-auth-remember"><input type="checkbox" required><span>Saya menyetujui ketentuan layanan dan kebijakan privasi Putri Collection.</span></label>
        <button class="pc-auth-submit" type="submit" data-test="register-user-button"><span>Buat Akun Sekarang</span><b>→</b></button>
    </form>

    <div class="pc-register-trust"><span>✓ SSL terenkripsi</span><span>✓ Data terisolasi</span><span>✓ Siap digunakan</span></div>
    <p class="pc-auth-switch">Sudah memiliki akun? <a href="{{ route('login') }}">Masuk di sini</a></p>
</x-layouts::auth>
