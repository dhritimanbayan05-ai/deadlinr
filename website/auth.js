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
    }
};

// Login Modal Controller
let loginModal = null;

function showLoginModal() {
    loginModal = document.getElementById('login-modal');
    if (loginModal) {
        loginModal.classList.add('open');
    }
}

function hideLoginModal() {
    if (loginModal) {
        loginModal.classList.remove('open');
    }
}

function selectUser(userName) {
    // Set the user in auth
    AuthManager.setCurrentUser(userName);

    // Hide modal
    hideLoginModal();

    // Reload page to refresh with logged-in user
    window.location.reload();
}

function handleLogout() {
    if (confirm('Are you sure you want to sign out?')) {
        AuthManager.logout();
        window.location.reload();
    }
}

function initLoginModal() {
    // Get all users from storage
    const appData = StorageManager.load();
    const modalContainer = document.getElementById('user-cards-container');

    if (modalContainer) {
        modalContainer.innerHTML = appData.users.map(user => `
      <div class="user-card" onclick="selectUser('${user.name}')">
        <div class="user-card-indicator"></div>
        <div class="user-card-name">${user.name}</div>
        <div class="user-card-role">${user.role}</div>
      </div>
    `).join('');
    }

    // Close modal when clicking outside
    const modal = document.getElementById('login-modal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideLoginModal();
            }
        });
    }
}

function updateCheckInButton() {
    const checkInBtn = document.getElementById('check-in-btn');
    if (!checkInBtn) return;

    if (AuthManager.isLoggedIn()) {
        const currentUser = AuthManager.getCurrentUser();
        checkInBtn.textContent = 'Sign Out';
        checkInBtn.onclick = handleLogout;
    } else {
        checkInBtn.textContent = 'Check In';
        checkInBtn.onclick = showLoginModal;
    }
}

// Initialize auth system on page load
function initAuth() {
    initLoginModal();
    updateCheckInButton();
}

// Auto-run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}
