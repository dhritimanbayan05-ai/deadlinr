// Authentication Module
// Handles user login, logout, and session management

const AuthManager = {
    STORAGE_KEY: 'protocol_auth',

    // Get currently logged-in user
    getCurrentUser() {
        const auth = localStorage.getItem(this.STORAGE_KEY);
        if (!auth) return null;

        const authData = JSON.parse(auth);
        return authData.currentUser || null;
    },

    // Set logged-in user
    setCurrentUser(userName) {
        const authData = {
            currentUser: userName,
            loginTime: new Date().toISOString()
        };
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(authData));
    },

    // Logout current user
    logout() {
        localStorage.removeItem(this.STORAGE_KEY);
    },

    // Check if user is logged in
    isLoggedIn() {
        return this.getCurrentUser() !== null;
    },

    // Redirect logic
    enforceAuth() {
        const isLoginPage = window.location.pathname.endsWith('login.html');
        if (!this.isLoggedIn() && !isLoginPage) {
            window.location.replace('login.html');
        } else if (this.isLoggedIn() && isLoginPage) {
            window.location.replace('index.html');
        }
    }
};

// Enforce auth immediately
AuthManager.enforceAuth();

function selectUser(userName) {
    AuthManager.setCurrentUser(userName);
    window.location.href = 'index.html';
}

function handleLogout() {
    if (confirm('Are you sure you want to sign out?')) {
        AuthManager.logout();
        window.location.href = 'login.html';
    }
}

async function initLoginPage() {
    const isLoginPage = window.location.pathname.endsWith('login.html');
    if (!isLoginPage) return;

    // Wait for AppData to load if StorageManager is available
    if (typeof StorageManager !== 'undefined') {
        const appData = await StorageManager.load();
        const container = document.getElementById('user-cards-container');

        if (container && appData && appData.users) {
            container.innerHTML = appData.users.map(user => {
                const safeName = user.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
                return `
                <div class="user-pill" style="margin-bottom: 0.5rem; justify-content: center; text-align: center; cursor: pointer; padding: 1rem; border: 1px solid var(--border);" data-user="${safeName}">
                    <div style="font-size: 1.2rem; font-weight: bold;">${safeName}</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted);">${user.role}</div>
                </div>
            `;
            }).join('');

            // Use event delegation instead of inline onclick
            container.addEventListener('click', (e) => {
                const card = e.target.closest('[data-user]');
                if (card) selectUser(card.dataset.user);
            });
        } else if (container) {
            container.innerHTML = '<div style="color: var(--text-muted); text-align: center;">No users found.</div>';
        }
    }
}

function updateCheckInButton() {
    const checkInBtn = document.getElementById('check-in-btn');
    if (!checkInBtn) return;

    if (AuthManager.isLoggedIn()) {
        const currentUser = AuthManager.getCurrentUser();
        // checkInBtn.textContent = \`Sign Out (\${currentUser})\`;
        checkInBtn.textContent = 'Sign Out';
        checkInBtn.onclick = handleLogout;
        checkInBtn.style.background = 'var(--surface)';
        checkInBtn.style.color = 'var(--text)';
        checkInBtn.style.border = '1px solid var(--border)';
    }
}

async function initAuth() {
    await initLoginPage();
    updateCheckInButton();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}
