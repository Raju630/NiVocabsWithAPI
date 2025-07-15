// admin.js (With English column fix)

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ---
    let adminPassword = null;
    let wordsState = { data: [], currentPage: 1, total: 0, isLoading: false, limit: 30 };
    let sentencesState = { data: [], currentPage: 1, total: 0, isLoading: false, limit: 30 };

    // --- DOM ELEMENTS ---
    const loginSection = document.getElementById('login-section');
    const adminContent = document.getElementById('admin-content');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const adminTabs = document.querySelector('.nav-tabs');
    const wordsPanel = document.getElementById('words-panel');
    const addEditForm = document.getElementById('add-edit-form');
    const wordsTableBody = document.getElementById('words-table-body');
    const loadingWordsText = document.getElementById('admin-loading-words');
    const clearFormBtn = document.getElementById('clear-form-btn');
    const filterLesson = document.getElementById('filter-lesson');
    const filterCategory = document.getElementById('filter-category');
    const selectAllWordsCheckbox = document.getElementById('select-all-words');
    const bulkDeleteWordsBtn = document.getElementById('bulk-delete-words-btn');
    const sentencesPanel = document.getElementById('sentences-panel');
    const addSentenceForm = document.getElementById('add-sentence-form');
    const sentencesTableBody = document.getElementById('sentences-table-body');
    const loadingSentencesText = document.getElementById('admin-loading-sentences');
    const selectAllSentencesCheckbox = document.getElementById('select-all-sentences');
    const bulkDeleteSentencesBtn = document.getElementById('bulk-delete-sentences-btn');
    const clearSentenceFormBtn = document.getElementById('clear-sentence-form-btn');

    // --- API HELPER ---
    const apiRequest = async (endpoint, method, data = {}) => {
        try {
            const response = await fetch(endpoint, {
                method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminPassword}` },
                body: method !== 'GET' ? JSON.stringify(data) : undefined,
            });
            if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'API request failed'); }
            if (response.status === 204) return null;
            return response.json();
        } catch (error) {
            alert(`API Error: ${error.message}`);
            if (error.message.includes('Unauthorized')) logout();
            throw error;
        }
    };
    const wordsApi = (method, data) => apiRequest('/.netlify/functions/admin-words', method, data);
    const sentencesApi = (method, data) => apiRequest('/.netlify/functions/admin-sentences', method, data);

    // --- INITIALIZATION & LOGIN ---
    const populateLessonFilter = () => { for (let i = 1; i <= 25; i++) { const o = document.createElement('option'); o.value = i; o.textContent = `Lesson ${i}`; filterLesson.appendChild(o); } };
    populateLessonFilter();
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); const p = document.getElementById('admin-password').value; loginError.textContent = '';
        try { const r = await wordsApi('POST', { action: 'login', password: p }); if (r.success) { adminPassword = p; loginSection.style.display = 'none'; adminContent.style.display = 'block'; resetAndLoadWords(); }
        } catch (error) { loginError.textContent = 'Incorrect password.'; }
    });
    function logout() { adminPassword = null; loginSection.style.display = 'block'; adminContent.style.display = 'none'; }

    // --- TAB SWITCHING LOGIC ---
    adminTabs.addEventListener('click', (e) => {
        if (!e.target.matches('.nav-tab')) return;
        adminTabs.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active')); e.target.classList.add('active');
        document.querySelectorAll('.admin-panel').forEach(p => p.style.display = 'none');
        const pId = e.target.dataset.tab; document.getElementById(pId).style.display = 'block';
        if (pId === 'words-panel' && wordsState.data.length === 0) { resetAndLoadWords(); }
        else if (pId === 'sentences-panel' && sentencesState.data.length === 0) { resetAndLoadSentences(); }
    });

    // --- WORD MANAGEMENT ---
    const resetAndLoadWords = () => {
        wordsState = { data: [], currentPage: 1, total: 0, isLoading: false, limit: 30 };
        wordsTableBody.innerHTML = '';
        loadWords(1);
    };

    const loadWords = async (page = 1) => {
        if (wordsState.isLoading || (page > 1 && wordsState.data.length >= wordsState.total)) { return; }
        wordsState.isLoading = true;
        loadingWordsText.style.display = 'block';
        const lesson = filterLesson.value;
        const category = filterCategory.value;
        const endpoint = `/.netlify/functions/admin-words?page=${page}&limit=${wordsState.limit}&lesson=${lesson}&category=${category}`;
        try {
            const response = await apiRequest(endpoint, 'GET');
            wordsState.total = response.total;
            wordsState.data.push(...response.data);
            wordsState.currentPage = page;
            response.data.forEach(word => {
                const row = document.createElement('tr');
                // MODIFIED: Added English data cell
                row.innerHTML = `
                    <td><input type="checkbox" class="word-checkbox" data-id="${word._id}"></td>
                    <td>${word.bangla}</td>
                    <td>${word.japanese}</td>
                    <td>${word.english || 'N/A'}</td>
                    <td>${word.lesson || 'N/A'}</td>
                    <td>${word.category || 'N/A'}</td>
                    <td>
                        <button class="control-button edit-btn" data-id="${word._id}">Edit</button>
                        <button class="control-button delete-btn" data-id="${word._id}" style="background-color:#d9534f;">Delete</button>
                    </td>`;
                wordsTableBody.appendChild(row);
            });
        } catch (error) {
            loadingWordsText.textContent = `Failed to load words.`;
        } finally {
            wordsState.isLoading = false;
            loadingWordsText.style.display = 'none';
        }
    };
    
    filterLesson.addEventListener('change', resetAndLoadWords);
    filterCategory.addEventListener('change', resetAndLoadWords);

    addEditForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-word-id').value;
        const data = { bangla: document.getElementById('admin-bangla').value, japanese: document.getElementById('admin-japanese').value, english: document.getElementById('admin-english').value, category: document.getElementById('admin-category').value, lesson: parseInt(document.getElementById('admin-lesson').value, 10) || 0 };
        try {
            if (id) await wordsApi('PUT', { id, ...data });
            else await wordsApi('POST', data);
            clearForm();
            resetAndLoadWords();
        } catch (error) {}
    });
    
    function clearForm() { addEditForm.reset(); document.getElementById('edit-word-id').value = ''; }
    clearFormBtn.addEventListener('click', clearForm);

    wordsTableBody.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (!id) return;
        if (e.target.classList.contains('edit-btn')) {
            const word = wordsState.data.find(w => w._id === id);
            if (word) {
                document.getElementById('edit-word-id').value = word._id;
                document.getElementById('admin-bangla').value = word.bangla;
                document.getElementById('admin-japanese').value = word.japanese;
                document.getElementById('admin-english').value = word.english || '';
                document.getElementById('admin-category').value = word.category || '';
                document.getElementById('admin-lesson').value = word.lesson || '';
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
        if (e.target.classList.contains('delete-btn')) {
            if (confirm('Delete this word permanently?')) {
                try { await wordsApi('DELETE', { id }); resetAndLoadWords(); } catch (error) {}
            }
        }
    });

    // --- SENTENCE MANAGEMENT ---
    const resetAndLoadSentences = () => {
        sentencesState = { data: [], currentPage: 1, total: 0, isLoading: false, limit: 30 };
        sentencesTableBody.innerHTML = '';
        loadAllSentences(1);
    };

    const loadAllSentences = async (page = 1) => {
        if (sentencesState.isLoading || (page > 1 && sentencesState.data.length >= sentencesState.total)) { return; }
        sentencesState.isLoading = true;
        loadingSentencesText.style.display = 'block';
        const endpoint = `/.netlify/functions/admin-sentences?page=${page}&limit=${sentencesState.limit}`;
        try {
            const response = await apiRequest(endpoint, 'GET');
            sentencesState.total = response.total;
            sentencesState.data.push(...response.data);
            sentencesState.currentPage = page;
            response.data.forEach(s => {
                const row = document.createElement('tr');
                row.innerHTML = `<td><input type="checkbox" class="sentence-checkbox" data-id="${s._id}"></td><td>${s.jp}</td><td>${s.en}</td><td>${s.bn || 'N/A'}</td><td><button class="control-button edit-sentence-btn" data-id="${s._id}">Edit</button><button class="control-button delete-sentence-btn" data-id="${s._id}" style="background-color:#d9534f;">Delete</button></td>`;
                sentencesTableBody.appendChild(row);
            });
        } catch (error) {
            loadingSentencesText.textContent = `Failed to load sentences.`;
        } finally {
            sentencesState.isLoading = false;
            loadingSentencesText.style.display = 'none';
        }
    };

    addSentenceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-sentence-id').value;
        const data = { jp: document.getElementById('sentence-jp').value, en: document.getElementById('sentence-en').value, bn: document.getElementById('sentence-bn').value };
        try {
            if (id) await sentencesApi('PUT', { id, ...data });
            else await sentencesApi('POST', data);
            clearSentenceForm();
            resetAndLoadSentences();
        } catch (error) {}
    });

    function clearSentenceForm() { addSentenceForm.reset(); document.getElementById('edit-sentence-id').value = ''; }
    clearSentenceFormBtn.addEventListener('click', clearSentenceForm);

    sentencesTableBody.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (!id) return;
        if (e.target.classList.contains('edit-sentence-btn')) {
            const sentence = sentencesState.data.find(s => s._id === id);
            if (sentence) {
                document.getElementById('edit-sentence-id').value = sentence._id;
                document.getElementById('sentence-jp').value = sentence.jp;
                document.getElementById('sentence-en').value = sentence.en;
                document.getElementById('sentence-bn').value = sentence.bn || '';
                addSentenceForm.scrollIntoView({ behavior: 'smooth' });
            }
        }
        if (e.target.classList.contains('delete-sentence-btn')) {
            if (confirm('Delete this sentence permanently?')) {
                try { await sentencesApi('DELETE', { id }); resetAndLoadSentences(); } catch (error) {}
            }
        }
    });

    // --- INFINITE SCROLL LOGIC ---
    const setupInfiniteScroll = (panelId, state, loaderFn) => {
        const panel = document.getElementById(panelId);
        window.addEventListener('scroll', () => {
            if (panel.style.display !== 'none') {
                const isNearBottom = (window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 300;
                if (isNearBottom) {
                    loaderFn(state.currentPage + 1);
                }
            }
        });
    };
    setupInfiniteScroll('words-panel', wordsState, loadWords);
    setupInfiniteScroll('sentences-panel', sentencesState, loadAllSentences);

    // --- BULK DELETION LOGIC ---
    const setupBulkDelete = (type, selectAllCheckbox, tableBody, bulkDeleteBtn, checkboxClass) => {
        selectAllCheckbox.addEventListener('change', () => {
            tableBody.querySelectorAll(`.${checkboxClass}`).forEach(cb => { cb.checked = selectAllCheckbox.checked; });
            updateBulkDeleteButton(type, tableBody.querySelectorAll(`.${checkboxClass}:checked`).length > 0);
        });
        tableBody.addEventListener('change', (e) => {
            if (e.target.classList.contains(checkboxClass)) {
                const checkedCount = tableBody.querySelectorAll(`.${checkboxClass}:checked`).length;
                updateBulkDeleteButton(type, checkedCount > 0);
            }
        });
        bulkDeleteBtn.addEventListener('click', async () => {
            const checkedBoxes = tableBody.querySelectorAll(`.${checkboxClass}:checked`);
            const idsToDelete = Array.from(checkedBoxes).map(cb => cb.dataset.id);
            if (idsToDelete.length === 0) return;
            if (confirm(`Are you sure you want to permanently delete ${idsToDelete.length} selected item(s)?`)) {
                try {
                    const api = type === 'words' ? wordsApi : sentencesApi;
                    await api('DELETE', { ids: idsToDelete });
                    if (type === 'words') resetAndLoadWords();
                    else resetAndLoadSentences();
                } catch (error) {}
            }
        });
    };
    
    const updateBulkDeleteButton = (type, show) => {
        const btn = type === 'words' ? bulkDeleteWordsBtn : bulkDeleteSentencesBtn;
        btn.style.display = show ? 'inline-block' : 'none';
        if (!show) {
            const cb = type === 'words' ? selectAllWordsCheckbox : selectAllSentencesCheckbox;
            cb.checked = false;
        }
    };
    setupBulkDelete('words', selectAllWordsCheckbox, wordsTableBody, bulkDeleteWordsBtn, 'word-checkbox');
    setupBulkDelete('sentences', selectAllSentencesCheckbox, sentencesTableBody, bulkDeleteSentencesBtn, 'sentence-checkbox');
});