// Lógica de login del evaluador
document.addEventListener('DOMContentLoaded', () => {
    const btnLogin = document.getElementById('btnLogin');
    const loginUser = document.getElementById('loginUser');
    const loginPass = document.getElementById('loginPass');
    const loginError = document.getElementById('loginError');

    if (btnLogin) {
        btnLogin.addEventListener('click', async () => {
            const usuario = loginUser.value.trim();
            const password = loginPass.value.trim();
            loginError.textContent = '';
            if (!usuario || !password) {
                loginError.textContent = 'Completa usuario y contraseña.';
                return;
            }
            try {
                const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ usuario, password })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Error de login');
                document.getElementById('login').classList.add('oculto');
                document.getElementById('panel').classList.remove('oculto');
                if (window.cargarResultados) window.cargarResultados();
            } catch (err) {
                loginError.textContent = err.message;
            }
        });
    }

    // Enter para login
    if (loginPass) {
        loginPass.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') btnLogin.click();
        });
    }
});