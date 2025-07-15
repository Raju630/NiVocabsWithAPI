// admin.js (Final Corrected Version - Removed dead event listener)

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ---
    let adminPassword = null;
    let wordsState = { data: [], currentPage: 0, total: 0, isLoading: false, limit: 30 };
    let sentencesState = { data: [], currentPage: 0, total: 0, isLoading: false, limit: 30 };

    // --- DOM ELEMENTS ---
    const loginSection = document.getElementById('login-section');
    const adminContent = document.getElementById('admin-content');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const adminTabs = document.querySelector('.nav-tabs');

    // Word Panel
    const wordsPanel = document.getElementById('words-panel');
    const addWordForm = document.getElementById('add-word-form');
    const wordsTableBody = document.getElementById('words-table-body');
    const loadingWordsText = document.getElementById('admin-loading-words');
    const filterLesson = document.getElementById('filter-lesson');
    const filterCategory = document.getElementById('filter-category');
    const selectAllWordsCheckbox = document.getElementById('select-all-words');
    const bulkDeleteWordsBtn = document.getElementById('bulk-delete-words-btn');
    const bulkUploadWordsForm = document.getElementById('bulk-upload-words-form');
    const bulkPasteWordsForm = document.getElementById('bulk-paste-words-form');

    // Sentence Panel
    const sentencesPanel = document.getElementById('sentences-panel');
    const addSentenceForm = document.getElementById('add-sentence-form');
    const sentencesTableBody = document.getElementById('sentences-table-body');
    const loadingSentencesText = document.getElementById('admin-loading-sentences');
    const selectAllSentencesCheckbox = document.getElementById('select-all-sentences');
    const bulkDeleteSentencesBtn = document.getElementById('bulk-delete-sentences-btn');
    const bulkUploadSentencesForm = document.getElementById('bulk-upload-sentences-form');
    const bulkPasteSentencesForm = document.getElementById('bulk-paste-sentences-form');
    
    // Request Panel
    const requestsPanel = document.getElementById('requests-panel');
    const loadingRequestsText = document.getElementById('admin-loading-requests');
    const requestsTableBody = document.getElementById('requests-table-body');

    // --- API HELPER ---
    const apiRequest = async (endpoint, method, data = {}) => {
        try {
            const response = await fetch(endpoint, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminPassword}` }, body: method !== 'GET' ? JSON.stringify(data) : undefined });
            if (!response.ok) { const err = await response.json(); throw new Error(err.error || 'API request failed'); }
            return response.status === 204 ? null : response.json();
        } catch (error) {
            alert(`API Error: ${error.message}`);
            if (error.message.includes('Unauthorized')) logout();
            throw error;
        }
    };

    // --- INITIALIZATION & LOGIN ---
    const populateLessonFilter = () => { for (let i = 1; i <= 25; i++) { const o = document.createElement('option'); o.value = i; o.textContent = `Lesson ${i}`; filterLesson.appendChild(o); } };
    populateLessonFilter();
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault(); const passwordInput = document.getElementById('admin-password').value; loginError.textContent = '';
        try {
            const response = await fetch('/.netlify/functions/admin-words', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'login', password: passwordInput }) });
            const result = await response.json(); if (!response.ok) throw new Error(result.error);
            adminPassword = passwordInput; loginSection.style.display = 'none'; adminContent.style.display = 'block';
            resetAndLoadWords();
        } catch (error) { loginError.textContent = 'Incorrect password.'; }
    });
    function logout() { adminPassword = null; loginSection.style.display = 'block'; adminContent.style.display = 'none'; }

    // --- TAB SWITCHING ---
    adminTabs.addEventListener('click', (e) => {
        if (!e.target.matches('.nav-tab')) return;
        const targetPanelId = e.target.dataset.tab;
        adminTabs.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active')); e.target.classList.add('active');
        document.querySelectorAll('.admin-panel').forEach(panel => panel.style.display = 'none');
        document.getElementById(targetPanelId).style.display = 'block';
        if (targetPanelId === 'words-panel' && wordsState.data.length === 0) resetAndLoadWords();
        else if (targetPanelId === 'sentences-panel' && sentencesState.data.length === 0) resetAndLoadSentences();
        else if (targetPanelId === 'requests-panel') loadRequests();
    });

    // --- WORD MANAGEMENT ---
    const resetAndLoadWords = () => { wordsState = { data: [], currentPage: 0, total: 0, isLoading: false, limit: 30 }; wordsTableBody.innerHTML = ''; loadWords(); };
    const loadWords = async () => {
        if (wordsState.isLoading || (wordsState.currentPage > 0 && wordsState.data.length >= wordsState.total)) return;
        wordsState.isLoading = true; loadingWordsText.style.display = 'block';
        const nextPage = wordsState.currentPage + 1;
        const endpoint = `/.netlify/functions/admin-words?page=${nextPage}&limit=${wordsState.limit}&lesson=${filterLesson.value}&category=${filterCategory.value}`;
        try {
            const response = await apiRequest(endpoint, 'GET');
            if (response.data && response.data.length > 0) {
                wordsState.total = response.total;
                wordsState.data.push(...response.data);
                wordsState.currentPage = nextPage;
                response.data.forEach(word => wordsTableBody.appendChild(createWordRow(word)));
            } else if (nextPage === 1) { loadingWordsText.textContent = 'No words found for this filter.'; }
        } catch (error) { loadingWordsText.textContent = `Failed to load words.`;
        } finally { wordsState.isLoading = false; if (wordsState.data.length > 0 || nextPage > 1) loadingWordsText.style.display = 'none'; }
    };
    filterLesson.addEventListener('change', resetAndLoadWords);
    filterCategory.addEventListener('change', resetAndLoadWords);
    addWordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = { bangla: document.getElementById('add-bangla').value, japanese: document.getElementById('add-japanese').value, english: document.getElementById('add-english').value, category: document.getElementById('add-category').value, lesson: parseInt(document.getElementById('add-lesson').value, 10) || 0 };
        try { await apiRequest('/.netlify/functions/admin-words', 'POST', data); addWordForm.reset(); resetAndLoadWords(); } catch (error) {}
    });
    wordsTableBody.addEventListener('click', async (e) => {
        const target = e.target; const row = target.closest('tr'); if (!row) return; const id = row.dataset.id;
        if (target.classList.contains('edit-btn')) toggleWordEdit(row, true);
        else if (target.classList.contains('cancel-edit-btn')) toggleWordEdit(row, false);
        else if (target.classList.contains('save-edit-btn')) {
            const updatedData = { bangla: row.querySelector('.word-bangla-input').value, japanese: row.querySelector('.word-japanese-input').value, english: row.querySelector('.word-english-input').value, lesson: parseInt(row.querySelector('.word-lesson-input').value, 10) || 0, category: row.querySelector('.word-category-input').value };
            try { await apiRequest('/.netlify/functions/admin-words', 'PUT', { id, ...updatedData }); const index = wordsState.data.findIndex(w => w._id === id); if (index > -1) wordsState.data[index] = { _id: id, ...updatedData }; toggleWordEdit(row, false);
            } catch (error) {}
        } else if (target.classList.contains('delete-btn')) {
            if (confirm('Delete this word permanently?')) { try { await apiRequest('/.netlify/functions/admin-words', 'DELETE', { id }); row.remove(); wordsState.data = wordsState.data.filter(w => w._id !== id); } catch (error) {} }
        }
    });
    function createWordRow(word) {
        const row = document.createElement('tr'); row.dataset.id = word._id;
        row.innerHTML = `<td><input type="checkbox" class="word-checkbox" data-id="${word._id}"></td><td data-field="bangla"><span>${word.bangla}</span></td><td data-field="japanese"><span>${word.japanese}</span></td><td data-field="english"><span>${word.english || ''}</span></td><td data-field="lesson"><span>${word.lesson || ''}</span></td><td data-field="category"><span>${word.category || ''}</span></td><td class="actions-cell"><button class="control-button edit-btn">Edit</button><button class="control-button delete-btn">Delete</button></td>`;
        return row;
    }
    function toggleWordEdit(row, isEditing) {
        if (isEditing) {
            const word = wordsState.data.find(w => w._id === row.dataset.id);
            row.querySelector('td[data-field="bangla"]').innerHTML = `<input type="text" class="inline-edit-input word-bangla-input" value="${word.bangla}">`;
            row.querySelector('td[data-field="japanese"]').innerHTML = `<input type="text" class="inline-edit-input word-japanese-input" value="${word.japanese}">`;
            row.querySelector('td[data-field="english"]').innerHTML = `<input type="text" class="inline-edit-input word-english-input" value="${word.english || ''}">`;
            row.querySelector('td[data-field="lesson"]').innerHTML = `<input type="number" class="inline-edit-input word-lesson-input" value="${word.lesson || ''}">`;
            row.querySelector('td[data-field="category"]').innerHTML = `<select class="inline-edit-select word-category-input"><option value="">None</option><option value="Noun" ${word.category === 'Noun' ? 'selected' : ''}>Noun</option><option value="Verb" ${word.category === 'Verb' ? 'selected' : ''}>Verb</option><option value="Adjective" ${word.category === 'Adjective' ? 'selected' : ''}>Adjective</option><option value="Adverb" ${word.category === 'Adverb' ? 'selected' : ''}>Adverb</option><option value="Phrase" ${word.category === 'Phrase' ? 'selected' : ''}>Phrase</option><option value="Particle" ${word.category === 'Particle' ? 'selected' : ''}>Particle</option><option value="Conjunction" ${word.category === 'Conjunction' ? 'selected' : ''}>Conjunction</option><option value="Counter" ${word.category === 'Counter' ? 'selected' : ''}>Counter</option><option value="Others" ${word.category === 'Others' ? 'selected' : ''}>Others</option></select>`;
            row.querySelector('.actions-cell').innerHTML = `<button class="control-button save-edit-btn">Save</button><button class="control-button cancel-edit-btn">Cancel</button>`;
        } else {
            const word = wordsState.data.find(w => w._id === row.dataset.id);
            row.replaceWith(createWordRow(word));
        }
    }

    // --- SENTENCE MANAGEMENT ---
    const resetAndLoadSentences = () => { sentencesState = { data: [], currentPage: 0, total: 0, isLoading: false, limit: 30 }; sentencesTableBody.innerHTML = ''; loadAllSentences(); };
    const loadAllSentences = async () => {
        if (sentencesState.isLoading || (sentencesState.currentPage > 0 && sentencesState.data.length >= sentencesState.total)) return;
        sentencesState.isLoading = true; loadingSentencesText.style.display = 'block';
        const nextPage = sentencesState.currentPage + 1;
        const endpoint = `/.netlify/functions/admin-sentences?page=${nextPage}&limit=${sentencesState.limit}`;
        try {
            const response = await apiRequest(endpoint, 'GET');
            if (response.data && response.data.length > 0) {
                sentencesState.total = response.total;
                sentencesState.data.push(...response.data);
                sentencesState.currentPage = nextPage;
                response.data.forEach(s => sentencesTableBody.appendChild(createSentenceRow(s)));
            } else if (nextPage === 1) {
                loadingSentencesText.textContent = 'No sentences found.';
            }
        } catch (error) { loadingSentencesText.textContent = `Failed to load sentences.`;
        } finally { sentencesState.isLoading = false; if(sentencesState.data.length > 0 || nextPage > 1) loadingSentencesText.style.display = 'none'; }
    };
    addSentenceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = { jp: document.getElementById('add-sentence-jp').value, en: document.getElementById('add-sentence-en').value, bn: document.getElementById('add-sentence-bn').value };
        try { await apiRequest('/.netlify/functions/admin-sentences', 'POST', data); addSentenceForm.reset(); resetAndLoadSentences(); } catch (error) {}
    });
    function createSentenceRow(sentence) {
        const row = document.createElement('tr'); row.dataset.id = sentence._id;
        row.innerHTML = `<td><input type="checkbox" class="sentence-checkbox" data-id="${sentence._id}"></td><td data-field="jp"><span>${sentence.jp}</span></td><td data-field="en"><span>${sentence.en}</span></td><td data-field="bn"><span>${sentence.bn || ''}</span></td><td class="actions-cell"><button class="control-button edit-sentence-btn">Edit</button><button class="control-button delete-sentence-btn">Delete</button></td>`;
        return row;
    }
    function toggleSentenceEdit(row, isEditing) {
        if (isEditing) {
            const sentence = sentencesState.data.find(s => s._id === row.dataset.id);
            row.querySelector('td[data-field="jp"]').innerHTML = `<input type="text" class="inline-edit-input sentence-jp-input" value="${sentence.jp}">`;
            row.querySelector('td[data-field="en"]').innerHTML = `<input type="text" class="inline-edit-input sentence-en-input" value="${sentence.en}">`;
            row.querySelector('td[data-field="bn"]').innerHTML = `<input type="text" class="inline-edit-input sentence-bn-input" value="${sentence.bn || ''}">`;
            row.querySelector('.actions-cell').innerHTML = `<button class="control-button save-edit-btn">Save</button><button class="control-button cancel-edit-btn">Cancel</button>`;
        } else {
            const sentence = sentencesState.data.find(s => s._id === row.dataset.id);
            row.replaceWith(createSentenceRow(sentence));
        }
    }
    sentencesTableBody.addEventListener('click', async (e) => {
        const target = e.target; const row = target.closest('tr'); if (!row) return;
        const id = row.dataset.id;
        if (target.classList.contains('edit-sentence-btn')) toggleSentenceEdit(row, true);
        else if (target.classList.contains('cancel-edit-btn')) toggleSentenceEdit(row, false);
        else if (target.classList.contains('save-edit-btn')) {
            const updatedData = { jp: row.querySelector('.sentence-jp-input').value, en: row.querySelector('.sentence-en-input').value, bn: row.querySelector('.sentence-bn-input').value, };
            try { await apiRequest('/.netlify/functions/admin-sentences', 'PUT', { id, ...updatedData }); const index = sentencesState.data.findIndex(s => s._id === id); if (index > -1) sentencesState.data[index] = { _id: id, ...updatedData }; toggleSentenceEdit(row, false);
            } catch (error) {}
        } else if (target.classList.contains('delete-sentence-btn')) {
            if (confirm('Delete this sentence permanently?')) {
                try { await apiRequest('/.netlify/functions/admin-sentences', 'DELETE', { id }); row.remove(); sentencesState.data = sentencesState.data.filter(s => s._id !== id); } catch (error) {}
            }
        }
    });

    // --- REQUEST MANAGEMENT ---
    const loadRequests = async () => {
        loadingRequestsText.style.display = 'block'; requestsTableBody.innerHTML = '';
        try {
            const requests = await apiRequest('/.netlify/functions/admin-requests', 'GET');
            loadingRequestsText.style.display = 'none';
            if (requests.length === 0) { requestsTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">No pending requests.</td></tr>';
            } else {
                requests.forEach(req => { const row = document.createElement('tr'); const requestDate = new Date(req.requestedAt).toLocaleDateString(); row.innerHTML = `<td>${req.japanese}</td><td>${req.english || 'N/A'}</td><td>${req.bangla}</td><td>${requestDate}</td><td><button class="control-button resolve-request-btn" data-id="${req._id}">Resolve</button></td>`; requestsTableBody.appendChild(row); });
            }
        } catch (error) { loadingRequestsText.textContent = `Failed to load requests.`; }
    };
    requestsTableBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('resolve-request-btn')) {
            const requestId = e.target.dataset.id;
            if (confirm('Are you sure you want to resolve this request?')) {
                try { await apiRequest('/.netlify/functions/admin-requests', 'DELETE', { id: requestId }); loadRequests(); } catch (error) {}
            }
        }
    });

    // --- INFINITE SCROLL ---
    const setupInfiniteScroll = (panelId, state, loaderFn) => {
        window.addEventListener('scroll', () => { if (document.getElementById(panelId).style.display !== 'none' && (window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 300) { loaderFn(); } });
    };
    setupInfiniteScroll('words-panel', wordsState, loadWords);
    setupInfiniteScroll('sentences-panel', sentencesState, loadAllSentences);

    // --- BULK DELETION ---
    const setupBulkDelete = (type, selectAllCheckbox, tableBody, bulkDeleteBtn, checkboxClass) => {
        selectAllCheckbox.addEventListener('change', () => { tableBody.querySelectorAll(`.${checkboxClass}`).forEach(cb => { cb.checked = selectAllCheckbox.checked; }); updateBulkDeleteButton(type, tableBody.querySelectorAll(`.${checkboxClass}:checked`).length > 0); });
        tableBody.addEventListener('change', (e) => { if (e.target.classList.contains(checkboxClass)) { const checkedCount = tableBody.querySelectorAll(`.${checkboxClass}:checked`).length; updateBulkDeleteButton(type, checkedCount > 0); } });
        bulkDeleteBtn.addEventListener('click', async () => {
            const checkedBoxes = tableBody.querySelectorAll(`.${checkboxClass}:checked`);
            const idsToDelete = Array.from(checkedBoxes).map(cb => cb.dataset.id);
            if (idsToDelete.length === 0) return;
            if (confirm(`Are you sure you want to permanently delete ${idsToDelete.length} selected item(s)?`)) {
                try {
                    const endpoint = type === 'words' ? '/.netlify/functions/admin-words' : '/.netlify/functions/admin-sentences';
                    await apiRequest(endpoint, 'DELETE', { ids: idsToDelete });
                    if (type === 'words') resetAndLoadWords(); else resetAndLoadSentences();
                } catch (error) {}
            }
        });
    };
    const updateBulkDeleteButton = (type, show) => {
        const btn = type === 'words' ? bulkDeleteWordsBtn : bulkDeleteSentencesBtn;
        btn.style.display = show ? 'inline-block' : 'none';
        if (!show) { const cb = type === 'words' ? selectAllWordsCheckbox : selectAllSentencesCheckbox; cb.checked = false; }
    };
    setupBulkDelete('words', selectAllWordsCheckbox, wordsTableBody, bulkDeleteWordsBtn, 'word-checkbox');
    setupBulkDelete('sentences', selectAllSentencesCheckbox, sentencesTableBody, bulkDeleteSentencesBtn, 'sentence-checkbox');
    
    // --- BULK UPLOAD (File and Paste) ---
    const processBulkUpload = async (data, type, submitButton) => {
        submitButton.disabled = true; submitButton.textContent = 'Uploading...';
        try {
            let endpoint = '';
            if (type === 'words') {
                if (!data.dictionary) { if (typeof data === 'object' && !Array.isArray(data)) { data = { "dictionary": data }; } else { throw new Error('JSON for words must have a "dictionary" key.'); } }
                endpoint = '/.netlify/functions/admin-bulk-words';
            } else if (type === 'sentences') {
                if (Array.isArray(data)) { data = { "exampleSentences": data }; }
                if (!data.exampleSentences) throw new Error('JSON for sentences must have an "exampleSentences" array or be an array of objects.');
                endpoint = '/.netlify/functions/admin-bulk-sentences';
            }
            const result = await apiRequest(endpoint, 'POST', data);
            alert(`Success! Inserted ${result.insertedCount} new item(s). The list will now refresh.`);
            if (type === 'words') resetAndLoadWords(); else resetAndLoadSentences();
        } catch (error) {
            console.error('Bulk upload processing error:', error);
        } finally {
            submitButton.disabled = false;
            if (submitButton.closest('form').id.includes('paste')) {
                submitButton.textContent = 'Upload Pasted Text';
            } else {
                submitButton.textContent = 'Upload From File';
            }
        }
    };
    
    const handleBulkFileUpload = async (e, type) => {
        e.preventDefault(); const fileInput = e.target.querySelector('input[type="file"]'); const submitButton = e.target.querySelector('button[type="submit"]'); const file = fileInput.files[0]; if (!file) return alert('Please select a JSON file.');
        const reader = new FileReader();
        reader.onload = async (event) => {
            try { const data = JSON.parse(event.target.result); await processBulkUpload(data, type, submitButton);
            } catch (error) { alert(`Upload failed: Invalid JSON in file. ${error.message}`); submitButton.disabled = false; submitButton.textContent = 'Upload From File';
            } finally { fileInput.value = ''; }
        };
        reader.onerror = () => { alert('Failed to read the file.'); submitButton.disabled = false; submitButton.textContent = 'Upload From File'; };
        reader.readAsText(file);
    };

    const handleBulkPasteUpload = async (e, type) => {
        e.preventDefault(); const textArea = e.target.querySelector('textarea'); const submitButton = e.target.querySelector('button[type="submit"]'); const text = textArea.value; if (!text.trim()) return alert('Please paste JSON text.');
        try { const data = JSON.parse(text); await processBulkUpload(data, type, submitButton); textArea.value = '';
        } catch (error) { alert(`Upload failed: Invalid JSON format. ${error.message}`); submitButton.disabled = false; submitButton.textContent = 'Upload Pasted Text'; }
    };
    
    bulkUploadWordsForm.addEventListener('submit', (e) => handleBulkFileUpload(e, 'words'));
    bulkUploadSentencesForm.addEventListener('submit', (e) => handleBulkFileUpload(e, 'sentences'));
    bulkPasteWordsForm.addEventListener('submit', (e) => handleBulkPasteUpload(e, 'words'));
    bulkPasteSentencesForm.addEventListener('submit', (e) => handleBulkPasteUpload(e, 'sentences'));
});