let sessionToken = "";
let username = "";
let userRole = "";

function showToast(msg, type = 'info') {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toast-icon');
    const toastMsg = document.getElementById('toast-msg');
    
    toast.className = `toast ${type}`;
    toastMsg.innerText = msg;
    
    if (type === 'success') {
        toastIcon.className = 'fa-solid fa-circle-check';
    } else if (type === 'error') {
        toastIcon.className = 'fa-solid fa-circle-exclamation';
    } else {
        toastIcon.className = 'fa-solid fa-circle-info';
    }
    
    toast.style.display = 'flex';
    // Auto hide after 6 seconds
    setTimeout(() => {
        if (toastMsg.innerText === msg) {
            toast.style.display = 'none';
        }
    }, 6000);
}

function switchTab(tabId) {
    // Clear any error messages
    document.getElementById('toast').style.display = 'none';
    
    // Toggle active classes on tab buttons
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(btn => {
        const label = btn.innerText.toLowerCase();
        if (label.includes(tabId)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Toggle active form section
    const sections = document.querySelectorAll('.form-section');
    sections.forEach(sec => {
        if (sec.id === `${tabId}-form`) {
            sec.classList.add('active');
        } else {
            sec.classList.remove('active');
        }
    });

    // Reset forms
    if (tabId === 'reset') {
        cancelReset();
    }
}

function toggleDashboard(isLoggedIn) {
    document.getElementById('auth-tabs').style.display = isLoggedIn ? 'none' : 'flex';
    document.getElementById('forms-container').style.display = isLoggedIn ? 'none' : 'block';
    document.getElementById('dashboard').style.display = isLoggedIn ? 'block' : 'none';
    
    if (!isLoggedIn) {
        document.getElementById('main-title').innerText = 'Secure Shield';
        document.getElementById('main-subtitle').innerText = 'Advanced Authentication System';
        document.getElementById('users-table-container').style.display = 'none';
        // Clear inputs
        document.getElementById('login_pass').value = '';
    }
}

async function register() {
    const user = document.getElementById('reg_user').value.trim();
    const pass = document.getElementById('reg_pass').value;
    const q = document.getElementById('reg_q').value.trim();
    const a = document.getElementById('reg_a').value.trim();

    if (!user || !pass || !q || !a) {
        showToast("Please fill all registration fields.", "error");
        return;
    }

    try {
        const res = await fetch('/api/register', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username: user, password: pass, question: q, answer: a })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(data.message || "Registration successful!", "success");
            // Reset register fields
            document.getElementById('reg_user').value = '';
            document.getElementById('reg_pass').value = '';
            document.getElementById('reg_q').value = '';
            document.getElementById('reg_a').value = '';
            // Switch to login
            setTimeout(() => switchTab('login'), 1500);
        } else {
            showToast(data.error, "error");
        }
    } catch (e) {
        showToast("Server connection error.", "error");
    }
}

async function login() {
    const user = document.getElementById('login_user').value.trim();
    const pass = document.getElementById('login_pass').value;

    if (!user || !pass) {
        showToast("Username and Password are required.", "error");
        return;
    }

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username: user, password: pass })
        });
        const data = await res.json();
        if (res.ok) {
            sessionToken = data.token;
            username = data.username;
            userRole = data.role;
            
            // Update UI
            document.getElementById('main-title').innerText = 'Shield Dashboard';
            document.getElementById('main-subtitle').innerText = 'Authorized Access Session';
            document.getElementById('welcome-msg').innerText = `Welcome, ${username}!`;
            document.getElementById('session-token-text').innerText = sessionToken;
            
            const badge = document.getElementById('role-badge');
            badge.innerText = userRole;
            badge.className = `role-badge ${userRole}`;

            // Admin Action visibility
            const adminBtn = document.getElementById('admin-action-btn');
            if (userRole === 'admin') {
                adminBtn.style.display = 'flex';
            } else {
                adminBtn.style.display = 'none';
            }

            showToast("Authenticated successfully.", "success");
            toggleDashboard(true);
        } else {
            showToast(data.error, "error");
        }
    } catch (e) {
        showToast("Server connection error.", "error");
    }
}

async function logout() {
    try {
        const res = await fetch('/api/logout', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username, token: sessionToken })
        });
        if (res.ok) {
            sessionToken = "";
            username = "";
            userRole = "";
            showToast("Logged out successfully.", "success");
            toggleDashboard(false);
        } else {
            showToast("Session logout error.", "error");
        }
    } catch (e) {
        showToast("Connection error during logout.", "error");
    }
}

async function listUsers() {
    try {
        const res = await fetch('/api/admin/users', {
            headers: {'Authorization': sessionToken, 'Username': username}
        });
        const data = await res.json();
        if (res.ok) {
            const tbody = document.getElementById('users-table-body');
            tbody.innerHTML = '';
            
            data.users.forEach(u => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><i class="fa-solid fa-user-lock" style="margin-right: 8px; color: var(--text-muted);"></i>${u.username}</td>
                    <td><span class="role-badge ${u.role}">${u.role}</span></td>
                `;
                tbody.appendChild(tr);
            });
            
            const container = document.getElementById('users-table-container');
            container.style.display = container.style.display === 'block' ? 'none' : 'block';
        } else {
            showToast(data.error, "error");
        }
    } catch (e) {
        showToast("Unauthorized request or connection error.", "error");
    }
}

function copyToken() {
    const tokenText = document.getElementById('session-token-text').innerText;
    navigator.clipboard.writeText(tokenText).then(() => {
        showToast("Session token copied to clipboard!", "success");
    }).catch(() => {
        showToast("Failed to copy token.", "error");
    });
}

// Password Reset Flows
async function fetchQuestion() {
    const user = document.getElementById('reset_user').value.trim();
    if (!user) {
        showToast("Please enter a username.", "error");
        return;
    }

    try {
        const res = await fetch('/api/get-security-question', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username: user })
        });
        const data = await res.json();
        if (res.ok) {
            document.getElementById('reset-q-text').innerText = data.question;
            document.getElementById('reset-q-box').style.display = 'block';
            document.getElementById('reset-step-1').style.display = 'none';
            document.getElementById('reset-step-2').style.display = 'block';
            showToast("Question retrieved successfully.", "success");
        } else {
            showToast(data.error, "error");
        }
    } catch (e) {
        showToast("Server connection error.", "error");
    }
}

async function resetPassword() {
    const user = document.getElementById('reset_user').value.trim();
    const ans = document.getElementById('reset_a').value.trim();
    const newPass = document.getElementById('reset_new_pass').value;

    if (!ans || !newPass) {
        showToast("Answer and New Password are required.", "error");
        return;
    }

    try {
        const res = await fetch('/api/reset-password', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ username: user, answer: ans, new_password: newPass })
        });
        const data = await res.json();
        if (res.ok) {
            showToast(data.message || "Password updated successfully!", "success");
            // Reset forms and switch to login
            cancelReset();
            setTimeout(() => switchTab('login'), 1500);
        } else {
            showToast(data.error, "error");
        }
    } catch (e) {
        showToast("Server connection error.", "error");
    }
}

function cancelReset() {
    document.getElementById('reset-step-1').style.display = 'block';
    document.getElementById('reset-step-2').style.display = 'none';
    document.getElementById('reset_user').value = '';
    document.getElementById('reset_a').value = '';
    document.getElementById('reset_new_pass').value = '';
    document.getElementById('reset-q-box').style.display = 'none';
}
