// admin.js (Refactored for separate Word and Sentence Management)

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ---
    let adminPassword = null;
    let allWordsCache = []; // Cache all words to avoid re-fetching for form edits

    // --- DOM ELEMENTS ---
    const loginSection = document.getElementById('login-section');
    const adminContent = document.getElementById('admin-content');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    
    // Tab Elements
    const adminTabs = document.querySelector('.nav-tabs');
    const wordsPanel = document.getElementById('words-panel');
    const sentencesPanel = document.getElementById('sentences-panel');

    // Word Panel Elements
    const addEditForm = document.getElementById('add-edit-form');
    const wordsTableBody = document.getElementById('words-table-body');
    const loadingWordsText = document.getElementById('admin-loading-words');
    const clearFormBtn = document.getElementById('clear-form-btn');
    const filterLesson = document.getElementById('filter-lesson');
    const filterCategory = document.getElementById('filter-category');

    // Sentence Panel Elements
    const addSentenceForm = document.getElementById('add-sentence-form');
    const sentencesTableBody = document.getElementById('sentences-table-body');
    const loadingSentencesText = document.getElementById('admin-loading-sentences');
    
    // --- API HELPERS ---
    const apiRequest = async (endpoint, method, data = {}) => {
        try {
            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminPassword}` },
                body: method !== 'GET' ? JSON.stringify(data) : undefined,
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'API request failed');
            }
            if (response.status === 204) return null; // Handle No Content response
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
    const populateLessonFilter = () => {
        for (let i = 1; i <= 25; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Lesson ${i}`;
            filterLesson.appendChild(option);
        }
    };
    populateLessonFilter();

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const passwordInput = document.getElementById('admin-password').value;
        loginError.textContent = '';
        try {
            const result = await wordsApi('POST', { action: 'login', password: passwordInput });
            if (result.success) {
                adminPassword = passwordInput;
                loginSection.style.display = 'none';
                adminContent.style.display = 'block';
                loadWords(); // Load the default tab's content
            }
        } catch (error) {
            loginError.textContent = 'Incorrect password.';
        }
    });

    function logout() {
        adminPassword = null;
        loginSection.style.display = 'block';
        adminContent.style.display = 'none';
    }

    // --- TAB SWITCHING LOGIC ---
    adminTabs.addEventListener('click', (e) => {
        if (!e.target.matches('.nav-tab')) return;

        // Update active state for tabs
        adminTabs.querySelectorAll('.nav-tab').forEach(tab => tab.classList.remove('active'));
        e.target.classList.add('active');

        // Show/hide panels
        document.querySelectorAll('.admin-panel').forEach(panel => panel.style.display = 'none');
        const targetPanelId = e.target.dataset.tab;
        document.getElementById(targetPanelId).style.display = 'block';

        // Load content for the newly activated tab
        if (targetPanelId === 'words-panel') {
            loadWords();
        } else if (targetPanelId === 'sentences-panel') {
            loadAllSentences();
        }
    });

    // --- WORD MANAGEMENT ---
    const loadWords = async () => {
        loadingWordsText.style.display = 'block';
        wordsTableBody.innerHTML = '';
        
        const lesson = filterLesson.value;
        const category = filterCategory.value;
        let endpoint = '/.netlify/functions/admin-words?';
        if (lesson) endpoint += `lesson=${lesson}&`;
        if (category) endpoint += `category=${category}&`;
        
        try {
            allWordsCache = await apiRequest(endpoint, 'GET');
            loadingWordsText.style.display = 'none';
            allWordsCache.forEach(word => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${word.bangla}</td><td>${word.japanese}</td><td>${word.lesson || 'N/A'}</td><td>${word.category || 'N/A'}</td>
                    <td>
                        <button class="control-button edit-btn" data-id="${word._id}">Edit</button>
                        <button class="control-button delete-btn" style="background-color:#d9534f;" data-id="${word._id}">Delete</button>
                    </td>`;
                wordsTableBody.appendChild(row);
            });
        } catch (error) {
            loadingWordsText.textContent = `Failed to load words.`;
        }
    };
    filterLesson.addEventListener('change', loadWords);
    filterCategory.addEventListener('change', loadWords);

    addEditForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const wordId = document.getElementById('edit-word-id').value;
        const wordData = {
            bangla: document.getElementById('admin-bangla').value, japanese: document.getElementById('admin-japanese').value,
            english: document.getElementById('admin-english').value, category: document.getElementById('admin-category').value,
            lesson: parseInt(document.getElementById('admin-lesson').value, 10) || 0,
        };
        try {
            if (wordId) await wordsApi('PUT', { id: wordId, ...wordData });
            else await wordsApi('POST', wordData);
            clearForm();
            loadWords();
        } catch (error) {}
    });
    
    function clearForm() {
        addEditForm.reset();
        document.getElementById('edit-word-id').value = '';
    }
    clearFormBtn.addEventListener('click', clearForm);

    wordsTableBody.addEventListener('click', async (e) => {
        const wordId = e.target.dataset.id;
        if (!wordId) return;
        if (e.target.classList.contains('edit-btn')) {
            const word = allWordsCache.find(w => w._id === wordId);
            document.getElementById('edit-word-id').value = word._id;
            document.getElementById('admin-bangla').value = word.bangla;
            document.getElementById('admin-japanese').value = word.japanese;
            document.getElementById('admin-english').value = word.english || '';
            document.getElementById('admin-category').value = word.category || '';
            document.getElementById('admin-lesson').value = word.lesson || '';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (e.target.classList.contains('delete-btn')) {
            if (confirm('Delete this word permanently?')) {
                try { await wordsApi('DELETE', { id: wordId }); loadWords(); } catch (error) {}
            }
        }
    });

    // --- SENTENCE MANAGEMENT ---
    const loadAllSentences = async () => {
        loadingSentencesText.style.display = 'block';
        sentencesTableBody.innerHTML = '';
        try {
            const sentences = await sentencesApi('GET');
            loadingSentencesText.style.display = 'none';
            sentences.forEach(s => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${s.jp}</td><td>${s.en}</td><td>${s.bn || 'N/A'}</td>
                    <td><button class="control-button delete-sentence-btn" data-id="${s._id}" style="background-color:#d9534f;">Delete</button></td>`;
                sentencesTableBody.appendChild(row);
            });
        } catch (error) {
            loadingSentencesText.textContent = `Failed to load sentences.`;
        }
    };
    
    addSentenceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const sentenceData = {
            jp: document.getElementById('sentence-jp').value,
            en: document.getElementById('sentence-en').value,
            bn: document.getElementById('sentence-bn').value,
        };
        try {
            await sentencesApi('POST', sentenceData);
            addSentenceForm.reset();
            loadAllSentences();
        } catch (error) {}
    });

    sentencesTableBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('delete-sentence-btn')) {
            const sentenceId = e.target.dataset.id;
            if (confirm('Delete this sentence permanently?')) {
                try { await sentencesApi('DELETE', { id: sentenceId }); loadAllSentences(); } catch (error) {}
            }
        }
    });
});