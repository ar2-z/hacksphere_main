const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('hacksphere_token');
}

function isAuthenticated() {
  return !!getToken();
}

async function fetchApi(url, options = {}) {
  const token = getToken();
  const headers = options.headers || {};
  headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const csrf = document.querySelector('meta[name="csrf-token"]');
  if (csrf) {
    headers['X-CSRF-Token'] = csrf.getAttribute('content');
  }
  try {
    const res = await fetch(API_BASE + url, { ...options, headers });
    if (res.status === 401) {
      localStorage.removeItem('hacksphere_token');
      window.location.href = '/login';
      return null;
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }
    return res.json();
  } catch (e) {
    if (e.name !== 'AbortError') throw e;
    return null;
  }
}

async function loginUser(username, password, teamName) {
  const data = await fetchApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password, team_name: teamName || '' })
  });
  if (data && data.access_token) {
    localStorage.setItem('hacksphere_token', data.access_token);
    localStorage.setItem('hacksphere_user', JSON.stringify(data.user || {}));
  }
  return data;
}

async function registerUser(data) {
  return fetchApi('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

async function logoutUser() {
  try {
    await fetchApi('/auth/logout', { method: 'POST' });
  } catch (e) {}
  localStorage.removeItem('hacksphere_token');
  localStorage.removeItem('hacksphere_user');
  window.location.href = '/login';
}

function poll(url, callback, interval = 5000) {
  const call = async () => {
    try {
      const data = await fetchApi(url);
      if (data !== null) callback(data);
    } catch (e) {
      console.warn('Poll error:', url, e);
    }
  };
  call();
  return setInterval(call, interval);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function showAlert(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity .3s';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function getUserFromStorage() {
  try {
    return JSON.parse(localStorage.getItem('hacksphere_user')) || {};
  } catch {
    return {};
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const user = getUserFromStorage();
  const nameEl = document.getElementById('user-name');
  const fullnameEl = document.getElementById('user-fullname');
  const roleEl = document.getElementById('user-role');
  if (nameEl) nameEl.textContent = user.username || '';
  if (fullnameEl) fullnameEl.textContent = user.full_name || user.username || '';
  if (roleEl) {
    const role = user.role || 'participant';
    roleEl.textContent = role;
    roleEl.className = `badge badge-${role}`;
  }
  const adminMembersLink = document.getElementById('admin-members-link');
  if (adminMembersLink && user.role === 'admin') {
    adminMembersLink.classList.remove('hidden');
  }

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.addEventListener('click', logoutUser);

  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const teamName = document.getElementById('team_name')?.value || '';
      const errEl = document.getElementById('error-message');
      try {
        const data = await loginUser(username, password, teamName);
        if (data && data.access_token) {
          window.location.href = '/dashboard';
        } else {
          errEl.textContent = data?.detail || 'Login failed';
          errEl.classList.remove('hidden');
        }
      } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
      }
    });
  }

  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        full_name: document.getElementById('full_name').value,
        username: document.getElementById('username').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        confirm_password: document.getElementById('confirm_password').value,
        team_name: document.getElementById('team_name')?.value || ''
      };
      const errEl = document.getElementById('error-message');
      try {
        const res = await registerUser(data);
        if (res && res.access_token) {
          showAlert('Registration successful! Please log in.', 'success');
          setTimeout(() => window.location.href = '/login', 1500);
        } else {
          errEl.textContent = res?.detail || 'Registration failed';
          errEl.classList.remove('hidden');
        }
      } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
      }
    });
  }

  const hintTrigger = document.querySelector('.hint-trigger');
  if (hintTrigger) {
    hintTrigger.addEventListener('click', () => {
      const content = document.querySelector('.hint-content');
      content.classList.toggle('hidden');
    });
  }

  if (window.location.pathname === '/dashboard') initDashboard();
  if (window.location.pathname === '/quiz') initQuiz();
  if (window.location.pathname === '/debug') initDebug();
  if (window.location.pathname === '/ideathon') initIdeathon();
  if (window.location.pathname === '/leaderboard') initLeaderboard();
  if (window.location.pathname === '/admin/dashboard') initAdminDashboard();
  if (window.location.pathname === '/admin/teams') initAdminTeams();
  if (window.location.pathname === '/admin/quiz') initAdminQuiz();
  if (window.location.pathname === '/admin/debug') initAdminDebug();
  if (window.location.pathname === '/admin/ideathon') initAdminIdeathon();
  if (window.location.pathname === '/admin/members') initAdminMembers();
  if (window.location.pathname === '/admin/violations') initAdminViolations();
  if (window.location.pathname === '/admin/announcements') initAdminAnnouncements();
});

function initDashboard() {
  async function loadDashboard() {
    try {
      const data = await fetchApi('/participants/me');
      if (!data) return;
      document.getElementById('stat-phase').textContent = data.current_phase || 'Not started';
      document.getElementById('stat-team').textContent = data.team_name || 'No team';
      document.getElementById('stat-score').textContent = data.total_score ?? 0;
      document.getElementById('stat-rank').textContent = data.rank ?? '--';
      const compInfo = document.getElementById('competition-info');
      if (data.competition_name) {
        compInfo.textContent = `Active Competition: ${data.competition_name}`;
      }
    } catch (e) {
      console.warn('Dashboard load error:', e);
    }
  }
  async function loadAnnouncements() {
    try {
      const data = await fetchApi('/announcements');
      if (!data) return;
      const list = document.getElementById('announcements-list');
      const items = Array.isArray(data) ? data : [];
      list.innerHTML = items.map(a => `
        <div class="announcement-item">
          <div class="announcement-text">${a.message}</div>
          <div class="announcement-date">${a.created_at ? new Date(a.created_at).toLocaleString() : ''}</div>
        </div>
      `).join('');
    } catch (e) {}
  }
  loadDashboard();
  loadAnnouncements();
  setInterval(loadAnnouncements, 5000);

  const changePwForm = document.getElementById('change-password-form');
  if (changePwForm) {
    changePwForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const current = document.getElementById('current-password').value;
      const next = document.getElementById('new-password').value;
      const confirmPw = document.getElementById('confirm-new-password').value;
      const msgEl = document.getElementById('password-change-message');
      msgEl.classList.add('hidden');
      if (next.length < 8) {
        msgEl.textContent = 'New password must be at least 8 characters';
        msgEl.className = 'alert alert-error';
        msgEl.classList.remove('hidden');
        return;
      }
      if (next !== confirmPw) {
        msgEl.textContent = 'New passwords do not match';
        msgEl.className = 'alert alert-error';
        msgEl.classList.remove('hidden');
        return;
      }
      try {
        const data = await fetchApi('/auth/change-password', {
          method: 'POST',
          body: JSON.stringify({ current_password: current, new_password: next })
        });
        msgEl.textContent = data?.message || 'Password updated successfully';
        msgEl.className = 'alert alert-success';
        msgEl.classList.remove('hidden');
        changePwForm.reset();
      } catch (err) {
        msgEl.textContent = err.message;
        msgEl.className = 'alert alert-error';
        msgEl.classList.remove('hidden');
      }
    });
  }
}

function initQuiz() {
  let ticker = null;
  let currentIndex = 0;
  let currentQuestion = null;
  let remainingSec = 0;
  let answeredCurrent = false;
  let fetching = false;
  let totalQuestions = 0;
  let lastBoundaryFetch = 0;

  function showState(state) {
    document.querySelectorAll('.quiz-state').forEach(el => el.classList.add('hidden'));
    const el = document.getElementById(`quiz-${state}`);
    if (el) el.classList.remove('hidden');
    document.getElementById('quiz-loading').classList.add('hidden');
  }

  function setWaitingText(title, text) {
    const t = document.getElementById('quiz-waiting-title');
    const p = document.getElementById('quiz-waiting-text');
    if (t) t.textContent = title;
    if (p) p.textContent = text;
  }

  function renderQuestion(q) {
    if (!q) return;
    currentQuestion = q;
    document.getElementById('question-current').textContent = currentIndex + 1;
    document.getElementById('question-total').textContent = totalQuestions || 10;
    document.getElementById('question-text').textContent = q.question_text;
    const options = ['A', 'B', 'C', 'D'];
    document.querySelectorAll('.option-btn').forEach((btn, idx) => {
      const opt = options[idx];
      btn.dataset.option = opt;
      btn.querySelector('.option-text').textContent = q[`option_${opt.toLowerCase()}`] || '';
      btn.className = 'option-btn';
      btn.disabled = answeredCurrent;
    });
    const statusEl = document.getElementById('answer-status');
    if (statusEl) {
      if (answeredCurrent) {
        statusEl.textContent = 'Answer submitted. Waiting for the next question...';
        statusEl.classList.remove('hidden');
      } else {
        statusEl.classList.add('hidden');
      }
    }
  }

  function startTicker() {
    if (ticker) clearInterval(ticker);
    const timerEl = document.getElementById('quiz-timer');
    ticker = setInterval(() => {
      if (remainingSec > 0) remainingSec--;
      timerEl.textContent = formatTime(remainingSec);
      const card = timerEl.parentElement;
      card.className = 'glass-card timer-card';
      if (remainingSec <= 10) card.classList.add('timer-critical');
      else if (remainingSec <= 30) card.classList.add('timer-warning');
      if (remainingSec <= 0 && !fetching && Date.now() - lastBoundaryFetch > 1000) {
        lastBoundaryFetch = Date.now();
        loadQuizState();
      }
    }, 1000);
  }

  async function loadQuizState() {
    if (fetching) return;
    fetching = true;
    try {
      const data = await fetchApi('/quiz/round/current');
      if (!data) return;
      if (data.status === 'inactive') {
        showState('waiting');
        setWaitingText('Quiz not yet started', 'Waiting for the admin to start the quiz round.');
        return;
      }
      if (data.status === 'paused') {
        showState('waiting');
        setWaitingText('Quiz Paused', 'The admin has paused the quiz. Hang tight.');
        return;
      }
      if (data.status === 'completed' || data.finished) {
        showState('results');
        loadResults();
        return;
      }
      remainingSec = data.remaining_seconds || 0;
      totalQuestions = data.total_questions || 0;
      const q = data.question;
      if (!q) {
        showState('results');
        loadResults();
        return;
      }
      if (currentIndex !== data.question_index || !currentQuestion || currentQuestion.id !== q.id) {
        currentIndex = data.question_index;
        answeredCurrent = data.answered_current;
        renderQuestion(q);
      } else {
        answeredCurrent = data.answered_current;
        if (answeredCurrent) renderQuestion(q);
      }
      showState('active');
      document.getElementById('round-number').textContent = data.round_number || 1;
      startTicker();
    } catch (e) {
      showState('waiting');
    } finally {
      fetching = false;
    }
  }

  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const q = currentQuestion;
      if (!q || btn.disabled || answeredCurrent) return;
      const option = btn.dataset.option;
      btn.disabled = true;
      document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const statusEl = document.getElementById('answer-status');
      try {
        const data = await fetchApi('/quiz/answer', {
          method: 'POST',
          body: JSON.stringify({ question_id: q.id, selected_option: option })
        });
        if (data && data.is_correct !== undefined) {
          answeredCurrent = true;
          document.querySelectorAll('.option-btn').forEach(b => { b.disabled = true; });
          if (statusEl) {
            statusEl.textContent = 'Submitted successfully';
            statusEl.classList.remove('hidden');
          }
        } else if (data && data.detail === 'Already answered') {
          answeredCurrent = true;
          document.querySelectorAll('.option-btn').forEach(b => { b.disabled = true; });
          if (statusEl) {
            statusEl.textContent = 'Answer already submitted.';
            statusEl.classList.remove('hidden');
          }
        }
      } catch (e) {
        btn.disabled = false;
        btn.classList.remove('selected');
        if (statusEl) {
          statusEl.textContent = e.message || 'Submission failed. Try again.';
          statusEl.classList.remove('hidden');
        }
      }
    });
  });

  async function loadResults() {
    try {
      const data = await fetchApi('/quiz/results');
      if (!data) return;
      document.getElementById('results-correct').textContent = data.correct ?? 0;
      document.getElementById('results-incorrect').textContent = data.incorrect ?? 0;
      document.getElementById('results-unanswered').textContent = data.unanswered ?? 0;
      document.getElementById('results-score').textContent = data.total_score ?? 0;
      const clueEl = document.getElementById('clue-display');
      const clueText = document.getElementById('clue-text');
      if (data.clue) {
        clueText.textContent = data.clue;
        clueEl.classList.remove('hidden');
      } else {
        clueEl.classList.add('hidden');
      }
    } catch (e) {}
  }

  loadQuizState();
  setInterval(loadQuizState, 3000);
}

function initDebug() {
  let challenges = [];
  let selectedChallenge = null;
  let debugTimer = null;

  function showState(state) {
    document.querySelectorAll('.debug-state').forEach(el => el.classList.add('hidden'));
    const el = document.getElementById(`debug-${state}`);
    if (el) el.classList.remove('hidden');
    document.getElementById('debug-loading').classList.add('hidden');
  }

  async function loadDebugState() {
    try {
      const data = await fetchApi('/debug/round/current');
      if (!data) return;
      if (data.status === 'inactive' || data.status === 'paused') {
        showState('waiting');
        return;
      }
      showState('active');
      challenges = data.challenges || [];
      renderChallengeList();
      if (data.time_limit_minutes) {
        startDebugTimer(data.time_limit_minutes * 60);
      }
    } catch (e) {
      showState('waiting');
    }
  }

  function renderChallengeList() {
    const list = document.getElementById('challenge-list');
    list.innerHTML = challenges.map((ch, i) => `
      <li class="${selectedChallenge?.id === ch.id ? 'active' : ''}" data-index="${i}">
        ${ch.title}
      </li>
    `).join('');
    list.querySelectorAll('li').forEach(li => {
      li.addEventListener('click', () => {
        const idx = parseInt(li.dataset.index);
        selectedChallenge = challenges[idx];
        renderChallengeDetail();
        renderChallengeList();
      });
    });
    if (!selectedChallenge && challenges.length > 0) {
      selectedChallenge = challenges[0];
      renderChallengeDetail();
    }
  }

  function renderChallengeDetail() {
    const ch = selectedChallenge;
    if (!ch) return;
    document.getElementById('challenge-title').textContent = ch.title;
    document.getElementById('challenge-description').textContent = ch.description;
    document.getElementById('buggy-code').textContent = ch.buggy_code;
    document.getElementById('attempt-info').textContent = `Attempts remaining: ${ch.remaining_attempts ?? 3}`;
    const testList = document.getElementById('test-list');
    const tests = ch.public_tests || [];
    testList.innerHTML = tests.map((t, i) => `
      <div class="test-item">
        <strong>Test ${i + 1}:</strong> Input: ${t.input || 'N/A'} | Expected: ${t.expected}
      </div>
    `).join('');
    document.getElementById('debug-results').classList.add('hidden');
    document.getElementById('code-input').value = '';
  }

  function startDebugTimer(totalSeconds) {
    if (debugTimer) clearInterval(debugTimer);
    let remaining = totalSeconds;
    const timerEl = document.getElementById('debug-timer');
    function tick() {
      timerEl.textContent = formatTime(remaining);
      if (remaining <= 60) timerEl.parentElement.classList.add('timer-critical');
      if (remaining <= 0) clearInterval(debugTimer);
      remaining--;
    }
    tick();
    debugTimer = setInterval(tick, 1000);
  }

  document.getElementById('submit-code').addEventListener('click', async () => {
    const code = document.getElementById('code-input').value;
    if (!code || !selectedChallenge) return;
    const btn = document.getElementById('submit-code');
    btn.disabled = true;
    btn.textContent = 'Evaluating...';
    try {
      const data = await fetchApi('/debug/submit', {
        method: 'POST',
        body: JSON.stringify({ challenge_id: selectedChallenge.id, code })
      });
      if (!data) return;
      if (data.status !== 'running' || !data.submission_id) {
        btn.disabled = false;
        btn.textContent = 'Submit';
        return;
      }
      const result = await pollJudgeResult(data.submission_id);
      if (!result) return;
      renderDebugResults(result);
      if (result.remaining_attempts === 0) {
        btn.textContent = 'No attempts left';
      } else {
        btn.disabled = false;
        btn.textContent = 'Submit';
      }
    } catch (err) {
      showAlert(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Submit';
    }
  });

  async function pollJudgeResult(submissionId, maxTries = 80) {
    for (let i = 0; i < maxTries; i++) {
      const res = await fetchApi(`/debug/results/${submissionId}`);
      if (!res) return null;
      if (res.status === 'running') {
        await new Promise(r => setTimeout(r, 1500));
        continue;
      }
      return res;
    }
    return null;
  }

  function renderDebugResults(data) {
    const resultsEl = document.getElementById('debug-results');
    if (data.status === 'failed') {
      showAlert(data.error || 'Execution failed', 'error');
      return;
    }
    resultsEl.classList.remove('hidden');
    const testResults = document.getElementById('test-results');
    const tests = data.public_results || [];
    testResults.innerHTML = tests.map((t, i) => `
      <div class="test-item ${t.passed ? 'passed' : 'failed'}">
        Test ${i + 1}: ${t.passed ? 'PASSED' : 'FAILED'} ${t.output ? `(Output: ${t.output})` : ''}
      </div>
    `).join('');
    document.getElementById('debug-score').textContent = data.score ?? 0;
    const hiddenEl = document.getElementById('hidden-results');
    const hiddenList = document.getElementById('hidden-test-results-list');
    if (data.hidden_results) {
      hiddenList.innerHTML = (data.hidden_results || []).map((t, i) => `
        <div class="test-item ${t.passed ? 'passed' : 'failed'}">
          Hidden Test ${i + 1}: ${t.passed ? 'PASSED' : 'FAILED'}
        </div>
      `).join('');
      hiddenEl.classList.remove('hidden');
    } else {
      hiddenEl.classList.add('hidden');
    }
    if (data.remaining_attempts !== undefined) {
      document.getElementById('attempt-info').textContent = `Attempts remaining: ${data.remaining_attempts}`;
    }
  }

  loadDebugState();
  setInterval(loadDebugState, 5000);
}

function initIdeathon() {
  function showState(state) {
    document.querySelectorAll('.ideathon-state').forEach(el => el.classList.add('hidden'));
    const el = document.getElementById(`ideathon-${state}`);
    if (el) el.classList.remove('hidden');
    document.getElementById('ideathon-loading').classList.add('hidden');
  }

  async function loadIdeathon() {
    try {
      const data = await fetchApi('/ideathon/status');
      if (!data) return;
      if (data.status === 'inactive' || data.status === 'paused') {
        showState('waiting');
        return;
      }
      showState('active');
      if (data.problem_statement) {
        document.getElementById('problem-statement').textContent = data.problem_statement;
      }
      if (data.submitted) {
        document.getElementById('ideathon-submission').classList.add('hidden');
        document.getElementById('ideathon-locked').classList.remove('hidden');
        document.getElementById('presentation-slot').textContent = data.presentation_slot || '--';
      } else {
        document.getElementById('ideathon-submission').classList.remove('hidden');
        document.getElementById('ideathon-locked').classList.add('hidden');
      }
      loadPresentationTable();
    } catch (e) {
      showState('waiting');
    }
  }

  async function loadPresentationTable() {
    try {
      const data = await fetchApi('/ideathon/presentation-order');
      if (!data) return;
      const teams = Array.isArray(data) ? data : (data.teams || []);
      document.getElementById('presentation-table').innerHTML = teams.map((t, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${t.team_name}</td>
        </tr>
      `).join('');
    } catch (e) {}
  }

  document.getElementById('submit-idea')?.addEventListener('click', async () => {
    const summary = document.getElementById('idea-summary').value;
    const fileInput = document.getElementById('idea-file');
    const file = fileInput?.files?.[0];
    if (!summary) {
      showAlert('Please enter an idea summary', 'error');
      return;
    }
    if (file && file.size > 20 * 1024 * 1024) {
      showAlert('File exceeds 20MB limit', 'error');
      return;
    }
    const formData = new FormData();
    formData.append('summary', summary);
    if (file) formData.append('file', file);
    try {
      const data = await fetchApi('/ideathon/submit', {
        method: 'POST',
        headers: {},
        body: formData
      });
      if (data) showAlert('Idea submitted successfully!', 'success');
    } catch (err) {
      showAlert(err.message, 'error');
    }
  });

  document.getElementById('ready-idea')?.addEventListener('click', async () => {
    try {
      const data = await fetchApi('/ideathon/ready', { method: 'POST' });
      if (data) {
        showAlert('You are ready for presentation!', 'success');
        loadIdeathon();
      }
    } catch (err) {
      showAlert(err.message, 'error');
    }
  });

  loadIdeathon();
  setInterval(loadIdeathon, 5000);
}

function initLeaderboard() {
  async function loadLeaderboard() {
    try {
      const data = await fetchApi('/leaderboard');
      if (!data) return;
      const entries = Array.isArray(data) ? data : (data.leaderboard || []);
      const user = getUserFromStorage();
      const tbody = document.getElementById('leaderboard-body');
      tbody.innerHTML = entries.map((e, i) => {
        const rank = i + 1;
        let cls = '';
        if (rank === 1) cls = 'rank-1';
        else if (rank === 2) cls = 'rank-2';
        else if (rank === 3) cls = 'rank-3';
        if (e.team_name && user.team_name && e.team_name === user.team_name) {
          cls += ' current-user-row';
        }
        return `<tr class="${cls}">
          <td>${rank}</td>
          <td>${e.team_name || '--'}</td>
          <td>${e.quiz_score ?? 0}</td>
          <td>${e.debug_score ?? 0}</td>
          <td>${e.ideathon_score ?? 0}</td>
          <td><strong>${e.total_score ?? 0}</strong></td>
        </tr>`;
      }).join('');
    } catch (e) {}
  }
  loadLeaderboard();
  setInterval(loadLeaderboard, 5000);
}

function initAdminDashboard() {
  const user = getUserFromStorage();
  if (user.role !== 'admin') {
    window.location.href = '/dashboard';
    return;
  }

  async function loadStats() {
    try {
      const data = await fetchApi('/participants/stats');
      if (!data) return;
      document.getElementById('stat-total').textContent = data.total_participants ?? 0;
      document.getElementById('stat-active').textContent = data.active ?? 0;
      document.getElementById('stat-idle').textContent = data.idle ?? 0;
      document.getElementById('stat-left').textContent = data.left ?? 0;
    } catch (e) {}
  }

  async function loadParticipants() {
    try {
      const data = await fetchApi('/participants');
      if (!data) return;
      const participants = Array.isArray(data) ? data : (data.participants || []);
      const tbody = document.getElementById('participants-table-body');
      tbody.innerHTML = participants.map(p => {
        const inactive = p.is_active === false;
        return `<tr class="${inactive ? 'row-inactive' : ''}">
          <td>${p.team_name || p.username || '--'}</td>
          <td class="status-${p.status?.toLowerCase() || 'active'}">${inactive ? 'Kicked' : (p.status || 'Active')}</td>
          <td>${p.last_active ? new Date(p.last_active).toLocaleTimeString() : '--'}</td>
          <td>${p.current_phase || '--'}</td>
          <td>${p.score ?? 0}</td>
          <td>
            ${inactive ? '<span class="text-muted">--</span>' : `
            <button class="btn btn-sm btn-warning" onclick="adminAction(${p.id},'warn')">Warn</button>
            <button class="btn btn-sm btn-danger" onclick="adminAction(${p.id},'kick')">Kick</button>
            <button class="btn btn-sm btn-danger" onclick="adminAction(${p.id},'disqualify')">DQ</button>`}
          </td>
        </tr>`;
      }).join('');
    } catch (e) {}
  }

  document.querySelectorAll('.round-control-card .btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const phase = btn.dataset.phase;
      const action = btn.dataset.action;
      try {
        const data = await fetchApi(`/admin/${phase}/${action}`, { method: 'POST' });
        if (data) showAlert(`${phase} ${action} successful`, 'success');
      } catch (err) {
        showAlert(err.message, 'error');
      }
    });
  });

  loadStats();
  loadParticipants();
  setInterval(loadStats, 5000);
  setInterval(loadParticipants, 5000);
}

function initAdminTeams() {
  async function loadTeams() {
    try {
      const data = await fetchApi('/admin/teams');
      if (!data) return;
      const teams = Array.isArray(data) ? data : (data.teams || []);
      const tbody = document.getElementById('teams-table-body');
      tbody.innerHTML = teams.map(t => `
        <tr class="team-row" data-team-id="${t.id}">
          <td>${t.name}</td>
          <td>${t.leader_name || '--'}</td>
          <td>${(t.members || []).map(m => m.username).join(', ') || '--'}</td>
          <td>${t.member_count ?? 0}</td>
          <td class="status-${t.status?.toLowerCase() || 'active'}">${t.status || 'Active'}</td>
          <td>${t.created_at ? new Date(t.created_at).toLocaleDateString() : '--'}</td>
          <td>
            <button class="btn btn-sm btn-warning" onclick="adminAction(${t.id},'warn','team')">Warn</button>
            <button class="btn btn-sm btn-danger" onclick="adminAction(${t.id},'kick','team')">Kick</button>
            <button class="btn btn-sm btn-danger" onclick="adminAction(${t.id},'disqualify','team')">DQ</button>
          </td>
        </tr>
        <tr class="team-details hidden" data-team-details="${t.id}">
          <td colspan="7">
            <div class="glass-card">
              <h4>Team Members</h4>
              ${(t.members || []).map(m => `<p>${m.full_name || m.username} (${m.username}) - ${m.email || ''}</p>`).join('') || 'No members'}
            </div>
          </td>
        </tr>
      `).join('');
      tbody.querySelectorAll('.team-row').forEach(row => {
        row.addEventListener('click', () => {
          const id = row.dataset.teamId;
          const details = document.querySelector(`tr[data-team-details="${id}"]`);
          if (details) details.classList.toggle('hidden');
        });
      });
    } catch (e) {}
  }
  loadTeams();
}

function initAdminQuiz() {
  async function loadRoundControls() {
    try {
      const data = await fetchApi('/admin/quiz/rounds');
      if (!data) return;
      const rounds = Array.isArray(data) ? data : (data.rounds || []);
      const container = document.getElementById('round-controls');
      container.innerHTML = rounds.map(r => `
        <div class="glass-card round-control-card">
          <h3>Round ${r.round_number}</h3>
          <p>Status: ${r.status}</p>
          <div class="control-buttons">
            <button class="btn btn-sm btn-success" onclick="adminRoundAction('quiz',${r.round_number},'start')">Start</button>
            <button class="btn btn-sm btn-warning" onclick="adminRoundAction('quiz',${r.round_number},'pause')">Pause</button>
            <button class="btn btn-sm btn-danger" onclick="adminRoundAction('quiz',${r.round_number},'end')">End</button>
          </div>
        </div>
      `).join('');
    } catch (e) {}
  }

  document.getElementById('add-question-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const correct = document.querySelector('input[name="correct"]:checked')?.value || 'A';
    const data = {
      question_text: document.getElementById('q-text').value,
      option_a: document.getElementById('q-opt-a').value,
      option_b: document.getElementById('q-opt-b').value,
      option_c: document.getElementById('q-opt-c').value,
      option_d: document.getElementById('q-opt-d').value,
      correct_answer: correct,
      difficulty: document.getElementById('q-difficulty').value,
      points: parseInt(document.getElementById('q-points').value),
      time_limit_seconds: parseInt(document.getElementById('q-time').value)
    };
    try {
      const res = await fetchApi('/admin/quiz/questions', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (res) {
        showAlert('Question added', 'success');
        loadQuestions();
        e.target.reset();
      }
    } catch (err) {
      showAlert(err.message, 'error');
    }
  });

  async function loadQuestions() {
    try {
      const data = await fetchApi('/admin/quiz/questions');
      if (!data) return;
      const questions = Array.isArray(data) ? data : (data.questions || []);
      const container = document.getElementById('questions-list');
      container.innerHTML = questions.map(q => `
        <div class="question-card-item">
          <div class="q-text">${q.question_text}</div>
          <div class="q-options">A: ${q.option_a} | B: ${q.option_b} | C: ${q.option_c} | D: ${q.option_d}</div>
          <div class="q-meta">Correct: ${q.correct_answer} | ${q.difficulty} | ${q.points}pts | ${q.time_limit_seconds}s</div>
          <div class="card-actions">
            <button class="btn btn-sm btn-danger" onclick="deleteQuestion(${q.id})">Delete</button>
          </div>
        </div>
      `).join('');
    } catch (e) {}
  }

  async function loadScores() {
    try {
      const data = await fetchApi('/admin/quiz/scores');
      if (!data) return;
      const scores = Array.isArray(data) ? data : (data.scores || []);
      const tbody = document.getElementById('quiz-scores-body');
      tbody.innerHTML = scores.map(s => `
        <tr>
          <td>${s.team_name}</td>
          <td>${s.correct ?? 0}</td>
          <td>${s.incorrect ?? 0}</td>
          <td><strong>${s.total_score ?? 0}</strong></td>
        </tr>
      `).join('');
    } catch (e) {}
  }

  loadRoundControls();
  loadQuestions();
  loadScores();
}

function initAdminDebug() {
  async function loadRoundControls() {
    try {
      const data = await fetchApi('/admin/debug/rounds');
      if (!data) return;
      const rounds = Array.isArray(data) ? data : (data.rounds || []);
      const container = document.getElementById('debug-round-controls');
      container.innerHTML = rounds.map(r => `
        <div class="glass-card round-control-card">
          <h3>Round ${r.round_number}</h3>
          <p>Status: ${r.status}</p>
          <div class="control-buttons">
            <button class="btn btn-sm btn-success" onclick="adminRoundAction('debug',${r.round_number},'start')">Start</button>
            <button class="btn btn-sm btn-warning" onclick="adminRoundAction('debug',${r.round_number},'pause')">Pause</button>
            <button class="btn btn-sm btn-danger" onclick="adminRoundAction('debug',${r.round_number},'end')">End</button>
          </div>
        </div>
      `).join('');
    } catch (e) {}
  }

  document.getElementById('add-challenge-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    let publicTests = [];
    let hiddenTests = [];
    try {
      publicTests = JSON.parse(document.getElementById('ch-public-tests').value || '[]');
    } catch { showAlert('Invalid JSON for public tests', 'error'); return; }
    try {
      hiddenTests = JSON.parse(document.getElementById('ch-hidden-tests').value || '[]');
    } catch { showAlert('Invalid JSON for hidden tests', 'error'); return; }
    const data = {
      title: document.getElementById('ch-title').value,
      description: document.getElementById('ch-description').value,
      buggy_code: document.getElementById('ch-buggy-code').value,
      public_tests: publicTests,
      hidden_tests: hiddenTests,
      difficulty: document.getElementById('ch-difficulty').value,
      points: parseInt(document.getElementById('ch-points').value),
      time_limit_minutes: parseInt(document.getElementById('ch-time').value)
    };
    try {
      const res = await fetchApi('/admin/debug/challenges', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      if (res) {
        showAlert('Challenge added', 'success');
        loadChallenges();
        e.target.reset();
      }
    } catch (err) {
      showAlert(err.message, 'error');
    }
  });

  async function loadChallenges() {
    try {
      const data = await fetchApi('/admin/debug/challenges');
      if (!data) return;
      const challenges = Array.isArray(data) ? data : (data.challenges || []);
      const container = document.getElementById('challenges-list');
      container.innerHTML = challenges.map(ch => `
        <div class="challenge-card-item">
          <div class="ch-title"><strong>${ch.title}</strong></div>
          <div class="ch-desc">${ch.description}</div>
          <div class="q-meta">${ch.difficulty} | ${ch.points}pts | ${ch.time_limit_minutes}min</div>
          <div class="card-actions">
            <button class="btn btn-sm btn-danger" onclick="deleteChallenge(${ch.id})">Delete</button>
          </div>
        </div>
      `).join('');
    } catch (e) {}
  }

  loadRoundControls();
  loadChallenges();
}

function initAdminIdeathon() {
  async function loadTeams() {
    try {
      const data = await fetchApi('/admin/ideathon/teams');
      if (!data) return;
      const teams = Array.isArray(data) ? data : (data.teams || []);
      const container = document.getElementById('ideathon-teams');
      container.innerHTML = teams.map(t => `
        <div class="ideathon-team-card">
          <div>
            <strong>${t.team_name}</strong>
          </div>
          <div>
            <p><strong>Problem:</strong> ${t.problem_statement || 'Not assigned'}</p>
            <p><strong>Idea:</strong> ${t.idea_summary || 'Not submitted'}</p>
            ${t.file_url ? `<p><a href="${t.file_url}" target="_blank">View File</a></p>` : ''}
          </div>
          <div>
            <input type="number" class="form-input score-input" id="score-${t.id}" placeholder="Score" value="${t.score ?? ''}" min="0">
          </div>
          <div>
            <button class="btn btn-sm btn-primary" onclick="submitIdeathonScore(${t.id})">Save Score</button>
          </div>
        </div>
      `).join('');
    } catch (e) {}
  }

  async function loadPresentationOrder() {
    try {
      const data = await fetchApi('/admin/ideathon/presentation-order');
      if (!data) return;
      const teams = Array.isArray(data) ? data : (data.teams || []);
      const container = document.getElementById('presentation-order');
      container.innerHTML = teams.map((t, i) => `
        <div class="glass-card" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.5rem;">
          <span><strong>Slot ${i + 1}:</strong> ${t.team_name}</span>
          <button class="btn btn-sm btn-secondary" onclick="movePresentationSlot(${t.id},'up')">▲</button>
          <button class="btn btn-sm btn-secondary" onclick="movePresentationSlot(${t.id},'down')">▼</button>
        </div>
      `).join('');
    } catch (e) {}
  }

  loadTeams();
  loadPresentationOrder();
}

function initAdminMembers() {
  const user = getUserFromStorage();
  if (user.role !== 'admin') {
    window.location.href = '/dashboard';
    return;
  }
  async function loadMembers() {
    try {
      const data = await fetchApi('/participants');
      if (!data) return;
      const members = Array.isArray(data) ? data : (data.participants || []);
      const tbody = document.getElementById('members-table-body');
      let active = 0, idle = 0, left = 0;
      tbody.innerHTML = members.map(p => {
        const s = (p.status || 'Left').toLowerCase();
        if (s === 'active') active++;
        else if (s === 'idle') idle++;
        else left++;
        const disabled = p.role === 'admin' || p.is_active === false;
        return `<tr class="${p.is_active === false ? 'row-inactive' : ''}">
          <td>${p.username || '--'}</td>
          <td>${p.full_name || '--'}</td>
          <td>${p.email || '--'}</td>
          <td><span class="badge badge-${p.role === 'admin' ? 'danger' : 'info'}">${p.role || 'member'}</span></td>
          <td>${p.team_name || '<em>No team</em>'}</td>
          <td class="status-${s}">${p.is_active === false ? 'Kicked' : (p.status || 'Left')}</td>
          <td>${p.last_active ? new Date(p.last_active).toLocaleString() : '--'}</td>
          <td>
            ${disabled ? '<span class="text-muted">--</span>' : `
            <button class="btn btn-sm btn-warning" onclick="adminAction(${p.id},'warn')">Warn</button>
            <button class="btn btn-sm btn-danger" onclick="adminAction(${p.id},'kick')">Kick</button>
            <button class="btn btn-sm btn-danger" onclick="adminAction(${p.id},'disqualify')">DQ</button>`}
          </td>
        </tr>`;
      }).join('');
      const total = members.length;
      document.getElementById('stat-total').textContent = total;
      document.getElementById('stat-active').textContent = active;
      document.getElementById('stat-idle').textContent = idle;
      document.getElementById('stat-left').textContent = left;
    } catch (e) {}
  }
  async function doMemberAction(id, action) {
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;
    try {
      const data = await fetchApi(`/admin/participants/${id}/${action}`, { method: 'POST' });
      if (data) {
        showAlert(`User ${action} successful`, 'success');
        loadMembers();
      }
    } catch (err) {
      showAlert(err.message, 'error');
    }
  }
  window.doMemberAction = doMemberAction;
  window._refreshMembers = loadMembers;
  loadMembers();
  setInterval(loadMembers, 5000);
}

function initAdminViolations() {
  async function loadViolations() {
    try {
      const data = await fetchApi('/admin/violations');
      if (!data) return;
      const violations = Array.isArray(data) ? data : (data.violations || []);
      const tbody = document.getElementById('violations-table-body');
      tbody.innerHTML = violations.map(v => `
        <tr>
          <td>${v.team_name || '--'}</td>
          <td>${v.username || '--'}</td>
          <td><span class="badge badge-${v.type === 'severe' ? 'danger' : 'warning'}">${v.type || 'warning'}</span></td>
          <td>${v.description || ''}</td>
          <td>${v.created_at ? new Date(v.created_at).toLocaleString() : '--'}</td>
        </tr>
      `).join('');
    } catch (e) {}
  }
  loadViolations();
}

function initAdminAnnouncements() {
  async function loadAnnouncements() {
    try {
      const data = await fetchApi('/admin/announcements');
      if (!data) return;
      const announcements = Array.isArray(data) ? data : (data.announcements || []);
      const container = document.getElementById('announcements-admin-list');
      container.innerHTML = announcements.map(a => `
        <div class="announcement-item">
          <div class="announcement-text">${a.message}</div>
          <div class="announcement-date">${a.created_at ? new Date(a.created_at).toLocaleString() : ''}</div>
          <div class="card-actions">
            <button class="btn btn-sm btn-danger" onclick="deleteAnnouncement(${a.id})">Delete</button>
          </div>
        </div>
      `).join('') || '<p class="text-muted">No announcements</p>';
    } catch (e) {}
  }

  document.getElementById('announcement-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = document.getElementById('announcement-message').value;
    try {
      const res = await fetchApi('/admin/announcements', {
        method: 'POST',
        body: JSON.stringify({ message })
      });
      if (res) {
        showAlert('Announcement posted', 'success');
        loadAnnouncements();
        e.target.reset();
      }
    } catch (err) {
      showAlert(err.message, 'error');
    }
  });

  loadAnnouncements();
}

async function adminAction(id, action, type = 'participant') {
  const messages = {
    warn: 'Are you sure you want to warn this user?',
    kick: 'Are you sure you want to kick this user?',
    disqualify: 'Are you sure you want to disqualify this user?'
  };
  if (!confirm(messages[action] || 'Are you sure?')) return;
  try {
    const endpoint = type === 'team' ? `/admin/teams/${id}/${action}` : `/admin/participants/${id}/${action}`;
    const data = await fetchApi(endpoint, { method: 'POST' });
    if (data) {
      showAlert(`${action} successful`, 'success');
      if (window._refreshMembers) window._refreshMembers();
    }
  } catch (err) {
    showAlert(err.message, 'error');
  }
}

async function adminRoundAction(phase, round, action) {
  if (!confirm(`Are you sure you want to ${action} ${phase} round ${round}?`)) return;
  try {
    const data = await fetchApi(`/admin/${phase}/round/${round}/${action}`, { method: 'POST' });
    if (data) {
      showAlert(`${phase} round ${round} ${action} successful`, 'success');
      if (phase === 'quiz') initAdminQuiz();
      if (phase === 'debug') initAdminDebug();
    }
  } catch (err) {
    showAlert(err.message, 'error');
  }
}

async function resetQuiz() {
  if (!confirm('This deletes ALL quiz questions, answers, scores and resets quiz rounds to pending. Continue?')) return;
  try {
    const data = await fetchApi('/admin/quiz/reset', { method: 'POST' });
    if (data) {
      showAlert('Quiz reset complete', 'success');
      initAdminQuiz();
    }
  } catch (err) {
    showAlert(err.message, 'error');
  }
}

async function deleteQuestion(id) {
  if (!confirm('Delete this question?')) return;
  try {
    await fetchApi(`/admin/quiz/questions/${id}`, { method: 'DELETE' });
    showAlert('Question deleted', 'success');
    initAdminQuiz();
  } catch (err) {
    showAlert(err.message, 'error');
  }
}

async function deleteChallenge(id) {
  if (!confirm('Delete this challenge?')) return;
  try {
    await fetchApi(`/admin/debug/challenges/${id}`, { method: 'DELETE' });
    showAlert('Challenge deleted', 'success');
    initAdminDebug();
  } catch (err) {
    showAlert(err.message, 'error');
  }
}

async function submitIdeathonScore(teamId) {
  const input = document.getElementById(`score-${teamId}`);
  const score = parseInt(input?.value);
  if (isNaN(score) || score < 0) {
    showAlert('Please enter a valid score', 'error');
    return;
  }
  try {
    await fetchApi(`/admin/ideathon/score/${teamId}`, {
      method: 'POST',
      body: JSON.stringify({ score })
    });
    showAlert('Score saved', 'success');
  } catch (err) {
    showAlert(err.message, 'error');
  }
}

async function movePresentationSlot(teamId, direction) {
  try {
    await fetchApi(`/admin/ideathon/presentation/move/${teamId}`, {
      method: 'POST',
      body: JSON.stringify({ direction })
    });
    showAlert('Order updated', 'success');
    initAdminIdeathon();
  } catch (err) {
    showAlert(err.message, 'error');
  }
}

async function deleteAnnouncement(id) {
  if (!confirm('Delete this announcement?')) return;
  try {
    await fetchApi(`/admin/announcements/${id}`, { method: 'DELETE' });
    showAlert('Announcement deleted', 'success');
    initAdminAnnouncements();
  } catch (err) {
    showAlert(err.message, 'error');
  }
}
