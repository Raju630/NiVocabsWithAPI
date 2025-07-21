const App = {
    data: {
        serverDictionary: {}, 
        userWords: {},
        deletedWords: [],
        liveDictionary: {},
        weakWords: [],
        manifestETag: null,
        manifestLastModified: null
    },
    config: {
        lessonId: null,
        currentRandomWord: null,
        mainPracticeList: [],
        weakPracticeList: [],
        currentQuiz: { },
        quizScore: 0,
        studyList: [],
        isSelectionMode: false,
        allWordsForView: [],
        renderBatchSize: 30,
        currentPage: 0,
        targetParticles: ['は', 'が', 'を', 'に', 'へ', 'で', 'と', 'も', 'の', 'か', 'や'],
    },
    elements: {
        appContainer: document.getElementById('dictionary-app-container'),
        modal: document.getElementById('edit-modal'),
        sentenceModal: document.getElementById('sentence-modal'),
        mnemonicModal: document.getElementById('mnemonic-modal')
    },
};

function loadUserData() {
    const userDataJSON = localStorage.getItem('N5_USER_DATA');
    if (userDataJSON) {
        const userData = JSON.parse(userDataJSON);
        App.data.userWords = userData.userWords || {};
        App.data.deletedWords = userData.deletedWords || [];
        App.data.weakWords = userData.weakWords || [];
    }
}

function saveUserData() {
    const userData = {
        userWords: App.data.userWords,
        deletedWords: App.data.deletedWords,
        weakWords: App.data.weakWords
    };
    localStorage.setItem('N5_USER_DATA', JSON.stringify(userData));
}

function updateLiveDictionary() {
    const combined = { ...App.data.serverDictionary };
    Object.assign(combined, App.data.userWords);
    App.data.deletedWords.forEach(word => {
        delete combined[word];
    });
    App.data.liveDictionary = combined;
}

document.addEventListener('DOMContentLoaded', () => {
    loadUserData();
    const urlParams = new URLSearchParams(window.location.search);
    App.config.lessonId = urlParams.get('id');
    renderApp();
    fetchAndRenderWords();
});
function renderSkeletons(container) {
    container.innerHTML = '';
    const skeletonHTML = `
        <div class="skeleton-card">
            <div class="skeleton-line title"></div>
            <div class="skeleton-line text"></div>
        </div>
    `;
    for (let i = 0; i < 12; i++) {
        container.innerHTML += skeletonHTML;
    }
}

async function fetchAndRenderWords(searchTerm = '') {
    const container = document.getElementById('word-list-container');
    if (!container) return;
    renderSkeletons(container);
    let apiUrl = '/.netlify/functions/words';
    const isSearching = searchTerm.length > 0;
    if (isSearching) {
        apiUrl += `?search=${encodeURIComponent(searchTerm)}`;
    } else if (App.config.lessonId) {
        apiUrl += `?lesson=${App.config.lessonId}`;
    }
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`API request failed: ${errorBody.error || response.statusText}`);
        }
        App.data.serverDictionary = await response.json();
        updateLiveDictionary();
        const wordKeys = Object.keys(App.data.liveDictionary).sort();
        container.innerHTML = '';
        if (wordKeys.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#888;">No words found.</p>';
            return;
        }
        App.config.allWordsForView = wordKeys;
        App.config.currentPage = 0;
        renderNextBatch();
        window.addEventListener('scroll', handleInfiniteScroll);
    } catch (error) {
        console.error("Failed to fetch words:", error);
        container.innerHTML = `<p style="text-align:center; color:#ff8a80;">Error: Could not load dictionary data. ${error.message}</p>`;
    }
}

function renderNextBatch() {
    const container = document.getElementById('word-list-container');
    if (!container) return;
    const { allWordsForView, currentPage, renderBatchSize } = App.config;
    const startIndex = currentPage * renderBatchSize;
    const endIndex = startIndex + renderBatchSize;
    const batchToRender = allWordsForView.slice(startIndex, endIndex);
    if (batchToRender.length === 0 && currentPage === 0) {
        container.innerHTML = '<p style="text-align:center; color:#888;">No words found.</p>';
        return;
    }
    batchToRender.forEach(word => {
        if (App.data.liveDictionary[word]) {
            container.appendChild(createWordCard(word));
        }
    });
    App.config.currentPage++;
}

function getWordData(word) {
    return App.data.liveDictionary[word];
}

function createWordCard(word) {
    const card = document.createElement('div');
    card.className = 'word-card';
    card.dataset.word = word;
    const { meaning, category, lesson, en, isUserWord } = getWordData(word);
    if (isUserWord) {
        card.classList.add('user-added');
    }
    card.innerHTML = `
        <div class="word-card-header">
            <div class="word-card-bangla">${word} ${isUserWord ? '<span title="You added this word">👤</span>' : ''}</div>
            <div class="word-card-tags">
                ${category ? `<span class="word-card-category">${category}</span>` : ''}
                ${lesson ? `<span class="word-card-category lesson-tag">L${lesson}</span>` : ''}
            </div>
        </div>
        <div class="word-card-japanese">
            <span>${meaning}</span>
            <span class="speak-icon">🔊</span>
        </div>
        <div class="card-actions">
            ${!!en ? `<button class="card-action-btn mnemonic" title="Show Mnemonic">🖼️</button>` : ''}
            <button class="card-action-btn examples" title="Show Examples">📝</button>
            <button class="card-action-btn edit" title="Edit Word">✏️</button>
            <button class="card-action-btn delete" title="Delete Word">🗑️</button>
        </div>
    `;
    return card;
}

function addWord() {
    const word = document.getElementById('word-input').value.trim();
    const meaning = document.getElementById('meaning-input').value.trim();
    const en = document.getElementById('en-input').value.trim();
    const category = document.getElementById('category-select').value;
    if (word && meaning) {
        if (App.data.liveDictionary[word] && !confirm(`The word "${word}" already exists. Do you want to overwrite it?`)) {
            return;
        }
        const lessonNumber = App.config.lessonId ? parseInt(App.config.lessonId, 10) : 0;
        App.data.userWords[word] = { 
            meaning, 
            category,
            en,
            lesson: lessonNumber,
            isUserWord: true,
            dateAdded: new Date().toISOString()
        }; 
        App.data.deletedWords = App.data.deletedWords.filter(d => d !== word);
        saveUserData();
        updateLiveDictionary();
        fetchAndRenderWords();
        document.getElementById('word-input').value = '';
        document.getElementById('meaning-input').value = '';
        document.getElementById('en-input').value = '';
        document.getElementById('category-select').value = '';
    }
}

function deleteWord(word) {
    if (!App.data.deletedWords.includes(word)) {
        App.data.deletedWords.push(word);
    }
    delete App.data.userWords[word];
    App.data.weakWords = App.data.weakWords.filter(w => w !== word);
    saveUserData();
    updateLiveDictionary();
    fetchAndRenderWords();
    renderWeakWordsList();
}

function saveEditedWord() {
    const modal = App.elements.modal;
    const originalWord = modal.querySelector('#edit-original-word').value;
    const newWord = modal.querySelector('#edit-word-input').value.trim();
    const newMeaning = modal.querySelector('#edit-meaning-input').value.trim();
    const newEn = modal.querySelector('#edit-en-input').value.trim();
    const newCategory = modal.querySelector('#edit-category-select').value;
    if (newWord && newMeaning) {
        const originalData = getWordData(originalWord) || {};
        const newWordData = { 
            ...originalData, 
            meaning: newMeaning, 
            category: newCategory,
            en: newEn,
            isUserWord: true
        };
        if (originalWord !== newWord) {
            delete App.data.userWords[originalWord];
            if (App.data.serverDictionary[originalWord]) {
                if (!App.data.deletedWords.includes(originalWord)) {
                    App.data.deletedWords.push(originalWord);
                }
            }
        }
        App.data.userWords[newWord] = newWordData;
        App.data.deletedWords = App.data.deletedWords.filter(d => d !== newWord);
        saveUserData();
        updateLiveDictionary();
        fetchAndRenderWords();
        closeEditModal();
    }
}

function resetApplication() {
    if (confirm("Are you sure you want to delete ALL data? This includes all your personal additions and weak words. This action cannot be undone.")) {
        localStorage.removeItem('N5_USER_DATA');
        alert("Application has been reset. The page will now reload.");
        location.reload();
    }
}

function getWordPool() {
    const allWords = App.data.liveDictionary ? Object.keys(App.data.liveDictionary) : [];
    return App.config.lessonId
        ? allWords.filter(w => getWordData(w).lesson == App.config.lessonId)
        : allWords;
}

async function showExampleSentences(banglaWord) {
    const wordData = getWordData(banglaWord);
    if (!wordData) return;

    const japaneseSearchTerm = (wordData.meaning || '').replace(/\[.*?\]|～|、/g, '').trim();
    const englishSearchTerm = wordData.en || '';

    const modal = document.getElementById('sentence-modal');
    if (!modal) return;
    const wordEl = modal.querySelector('#sentence-modal-word');
    const bodyEl = modal.querySelector('#sentence-modal-body');

    wordEl.textContent = japaneseSearchTerm;
    modal.style.display = 'flex';

    if (!japaneseSearchTerm || !englishSearchTerm) {
        bodyEl.innerHTML = `<p style="color: #ffcdd2;">Cannot search for sentences. This word is missing a required Japanese or English translation.</p>`;
        return;
    }
    
    const submitSentenceRequest = async (fullWordObject) => {
        const btn = document.getElementById('request-sentence-btn');
        if (!btn) return;
        btn.disabled = true;
        btn.textContent = 'Submitting...';
        try {
            const response = await fetch('/.netlify/functions/request-sentence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fullWordObject)
            });
            if (!response.ok) { const errData = await response.json(); throw new Error(errData.error || 'Failed to submit request.'); }
            btn.textContent = 'Request Submitted! ✔️';
            btn.style.backgroundColor = '#5cb85c';
        } catch (error) {
            btn.textContent = 'Submission Failed ❌';
            btn.style.backgroundColor = '#d9534f';
            console.error('Sentence Request Error:', error);
            alert(`Error: ${error.message}`);
        }
    };
    
    let skeletonHTML = '';
    for (let i = 0; i < 3; i++) { skeletonHTML += `<div class="skeleton-sentence"><div class="skeleton-line title"></div><div class="skeleton-line text"></div></div>`; }
    bodyEl.innerHTML = skeletonHTML;

    try {
        const apiUrl = `/.netlify/functions/sentences?jp_term=${encodeURIComponent(japaneseSearchTerm)}&en_term=${encodeURIComponent(englishSearchTerm)}`;
        const response = await fetch(apiUrl);
        if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error || `Server responded with status ${response.status}`); }
        
        const relevantSentences = await response.json();
        
        // --- THIS IS THE MODIFIED LOGIC ---
        
        let html = '';
        const highlightRegex = new RegExp(escapeRegExp(japaneseSearchTerm), 'gi');

        if (relevantSentences.length === 0) {
            html = `<p style="color: #ffcdd2;">No example sentences found for "${japaneseSearchTerm}".</p>`;
        } else {
            relevantSentences.forEach((s, index) => {
                const jpText = s.jp || '';
                const bnText = s.bn || '';
                const jpDisplay = jpText.replace(highlightRegex, (match) => `<strong>${match}</strong>`);
                html += `
                    <div class="sentence-entry">
                        <p class="sentence-japanese">${index + 1}. ${jpDisplay} <span class="speak-icon" onclick="speakJapanese('${jpText.replace(/'/g, "\\'")}')">🔊</span></p>
                        <p class="sentence-bangla">(${bnText})</p>
                    </div>
                `;
            });
        }

        // Now, check if we should add the request button
        if (relevantSentences.length < 3) {
            html += `
                <div style="border-top: 1px solid var(--glass-border); margin-top: 20px; padding-top: 20px; text-align: center;">
                    <p style="color: #ccc;">Want to see more examples for this word?</p>
                    <button id="request-sentence-btn" class="add-button" style="margin-top: 10px;">Request More Sentences</button>
                </div>
            `;
        }
        
        bodyEl.innerHTML = html;

        // If the button was added, attach its event listener
        const requestButton = document.getElementById('request-sentence-btn');
        if (requestButton) {
            requestButton.addEventListener('click', () => {
                const wordObjectForRequest = {
                    bangla: banglaWord,
                    japanese: wordData.meaning,
                    english: wordData.en
                };
                submitSentenceRequest(wordObjectForRequest);
            });
        }

        // --- END OF MODIFIED LOGIC ---

    } catch (error) {
        console.error("Error fetching sentences:", error);
        if (bodyEl) {
            bodyEl.innerHTML = `<p style="color: #ffcdd2;">Could not load sentences: ${error.message}</p>`;
        }
    }
}

function debounce(func, delay = 250) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}
function handleInfiniteScroll() {
    if ((window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 200) {
        const { allWordsForView } = App.config;
        if (allWordsForView.length > document.querySelectorAll('.word-card').length) {
             renderNextBatch();
        }
    }
}
function renderApp() {
    if (!App.elements.appContainer) {
        console.error("Fatal Error: App container not found!");
        return;
    }
    updateHeader();
    App.elements.appContainer.innerHTML = `
        <div class="nav-tabs">
            <button class="nav-tab active" data-tab="dictionary">Dictionary</button>
            <button class="nav-tab" data-tab="weak-words">Weak Words</button>
            <button class="nav-tab" data-tab="quiz">Quiz</button>
            <button class="nav-tab" data-tab="settings">Settings</button>
        </div>
        <div id="dictionary-tab" class="tab-content active"></div>
        <div id="weak-words-tab" class="tab-content"></div>
        <div id="quiz-tab" class="tab-content"></div>
        <div id="settings-tab" class="tab-content"></div>
    `;
    renderDictionaryTab();
    renderWeakWordsTab();
    renderQuizTab();
    renderSettingsTab();
    attachAppEventListeners();
}
function updateHeader() {
    const logoLink = document.querySelector('.logo a');
    if (App.config.lessonId) {
        const lessonInfo = AppConfig.lessons.find(l => l.id == App.config.lessonId);
        if (lessonInfo) {
            logoLink.innerHTML = `N5 日本語辞書 <span class="header-lesson-tag">Lesson ${lessonInfo.id}</span>`;
        }
    } else {
        logoLink.innerHTML = 'N5 日本語辞書';
    }
}
function renderDictionaryTab() {
    const container = document.getElementById('dictionary-tab');
    container.innerHTML = `
        <div class="section-box">
            <h3 style="text-align:center;">Random Word Practice</h3>
            <div class="random-word-container"><div class="flashcard-container"><div id="flashcard-content" class="flashcard-content"><p>Get a random word from the current lesson set, or select words below for a focused study session.</p></div></div><div class="random-word-controls"><button id="get-random-btn" class="control-button">Get Random Word</button><button id="show-meaning-btn" class="control-button" style="display:none;">Show Meaning</button></div></div>
        </div>
        <div class="section-box">
            <h3>Add New Word</h3>
            <div class="add-word-form">
                <div class="input-group">
                    <input type="text" id="word-input" placeholder="Bangla Word">
                </div>
                <div class="input-group">
                    <input type="text" id="meaning-input" placeholder="Japanese Meaning">
                </div>
                <div class="input-group">
                    <input type="text" id="en-input" placeholder="English Meaning">
                </div>
                <div class="input-group">
                    <select id="category-select">
                        <option value="">Category</option>
                        <option value="Noun">Noun</option>
                        <option value="Verb">Verb</option>
                        <option value="Adjective">Adjective</option>
                        <option value="Adverb">Adverb</option>
                        <option value="Phrase">Phrase</option>
                        <option value="Particle">Particle</option>
                        <option value="Conjunction">Conjunction</option>
                        <option value="Counter">Counter</option>
                        <option value="Others">Others</option>
                    </select>
                </div>
                <div class="add-word-action">
                    <button id="add-word-btn" class="add-button">Add</button>
                </div>
            </div>
        </div>
        <div class="section-box" id="word-list-section">
            <div class="study-list-controls"><button id="toggle-select-mode-btn" class="control-button">Select for Study</button><div id="selection-actions" style="display: none;"><button id="start-study-btn" class="add-button">Start Practice (<span id="selected-count">0</span>)</button><button id="clear-selection-btn" class="control-button">Clear</button></div></div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;"><h3 id="word-list-title"></h3><input type="search" id="search-input" placeholder="Search..." style="width: 250px;"></div>
            <div class="word-list-container" id="word-list-container"></div>
        </div>
    `;
    document.getElementById('get-random-btn').addEventListener('click', getRandomWord);
    document.getElementById('show-meaning-btn').addEventListener('click', toggleRandomMeaning);
    document.getElementById('add-word-btn').addEventListener('click', addWord);
    document.getElementById('toggle-select-mode-btn').addEventListener('click', toggleSelectionMode);
    document.getElementById('start-study-btn').addEventListener('click', startStudySession);
    document.getElementById('clear-selection-btn').addEventListener('click', clearSelection);
    document.getElementById('search-input').addEventListener('input', debounce((e) => {
        fetchAndRenderWords(e.target.value.trim());
    }));
    document.getElementById('word-list-container').addEventListener('click', handleWordCardClick);
    window.addEventListener('scroll', handleInfiniteScroll);
}
function renderWeakWordsTab() {
    const container = document.getElementById('weak-words-tab');
    container.innerHTML = `<div class="section-box"><h3 style="text-align:center;">Weak Word Practice</h3><div class="random-word-container"><div class="flashcard-container"><div id="weak-word-flashcard-content" class="flashcard-content"><p>Practice words you've struggled with. Click the button to begin.</p></div></div><div class="random-word-controls"><button id="get-weak-word-btn" class="control-button">Get Weak Word</button><button id="show-weak-meaning-btn" class="control-button" style="display:none;">Show Meaning</button></div></div></div><div class="section-box weak-words-section"><h3 id="weak-words-count-title">Weak Words (${App.data.weakWords.length})</h3><p>You can also manually remove words from this list by clicking the trash icon.</p><div class="weak-words-list" id="weak-words-list"></div></div>`;
    renderWeakWordsList();
    document.getElementById('get-weak-word-btn').addEventListener('click', getWeakWordForPractice);
    document.getElementById('show-weak-meaning-btn').addEventListener('click', toggleWeakWordMeaning);
    document.getElementById('weak-words-list').addEventListener('click', handleWordCardClick);
}
function handleWordCardClick(e) {
    const target = e.target;
    const card = target.closest('.word-card');
    if (!card) return;
    const word = card.dataset.word;
    const actionButton = target.closest('.card-action-btn');
    const speakIcon = target.closest('.speak-icon');
    if (actionButton) {
        e.stopPropagation();
        if (actionButton.classList.contains('examples')) showExampleSentences(word);
        else if (actionButton.classList.contains('mnemonic')) showMnemonic(word);
        else if (actionButton.classList.contains('edit')) openEditModal(word);
        else if (actionButton.classList.contains('delete')) deleteWord(word);
    } else if (speakIcon) {
        e.stopPropagation();
        speakJapanese(getWordData(word).meaning);
    } else {
        handleCardSelection(word); 
    }
}
function handleCardSelection(word) {
    if (!App.config.isSelectionMode) return;
    const card = document.querySelector(`.word-card[data-word="${CSS.escape(word)}"]`);
    if (!card) return;
    const index = App.config.studyList.indexOf(word);
    if (index > -1) {
        App.config.studyList.splice(index, 1);
        card.classList.remove('selected');
    } else {
        App.config.studyList.push(word);
        card.classList.add('selected');
    }
    document.getElementById('selected-count').textContent = App.config.studyList.length;
}
function toggleSelectionMode() {
    App.config.isSelectionMode = !App.config.isSelectionMode;
    const wordListSection = document.getElementById('word-list-section');
    const toggleBtn = document.getElementById('toggle-select-mode-btn');
    const selectionActions = document.getElementById('selection-actions');
    wordListSection.classList.toggle('selection-mode', App.config.isSelectionMode);
    if (App.config.isSelectionMode) {
        toggleBtn.textContent = 'Cancel';
        selectionActions.style.display = 'flex';
    } else {
        toggleBtn.textContent = 'Select for Study';
        selectionActions.style.display = 'none';
        clearSelection();
    }
}
function clearSelection() {
    App.config.studyList = [];
    document.querySelectorAll('.word-card.selected').forEach(c => c.classList.remove('selected'));
    document.getElementById('selected-count').textContent = 0;
}
function startStudySession() {
    if (App.config.studyList.length === 0) {
        alert("Please select at least one word to start a practice session.");
        return;
    }
    const encodedWords = encodeURIComponent(App.config.studyList.join(','));
    const studyUrl = `study.html?words=${encodedWords}`;
    if (window.matchMedia('(display-mode: standalone)').matches) {
        window.location.href = studyUrl;
    } else {
        window.open(studyUrl, '_blank');
    }
    toggleSelectionMode(); 
}
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && App.config.isSelectionMode) {
        toggleSelectionMode();
    }
});
function toggleWeakWordMeaning() {
    const word = App.config.currentRandomWord;
    if (!word) return;
    const btn = document.getElementById('show-weak-meaning-btn');
    const cardContent = document.getElementById('weak-word-flashcard-content');
    if (btn.textContent === 'Show Meaning') {
        const { meaning } = getWordData(word);
        cardContent.innerHTML = `<div class="meaning-display">${meaning}<span class="speak-icon" onclick="speakJapanese('${meaning}')">🔊</span></div>`;
        btn.textContent = 'Show Word';
    } else {
        cardContent.innerHTML = `<div class="word-display">${word}</div>`;
        btn.textContent = 'Show Meaning';
    }
}
function renderQuizTab() {
    document.getElementById('quiz-tab').innerHTML = `
        <div class="section-box quiz-container">
            <h3>Vocabulary Quiz</h3>
            <div id="quiz-content">
                <p>Select a quiz mode to begin.</p>
                <div class="quiz-setup" style="margin: 25px 0; display:flex; justify-content:center; align-items:center; gap: 20px;">
                    <label for="quiz-length-select">Questions:</label>
                    <select id="quiz-length-select" style="width: 100px; background-color: rgba(0, 0, 0, 0.2);">
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                    </select>
                </div>
                <div class="quiz-mode-selection">
                    <button class="control-button bn-jp" data-quiz-type="bangla-to-jp">Bangla → Japanese</button>
                    <button class="control-button jp-bn" data-quiz-type="jp-to-bangla">Japanese → Bangla</button>
                </div>
                <h4 style="width: 100%; text-align: center; margin-top: 25px; color: white;">Grammar Quiz</h4>
                    <button class="control-button" data-quiz-type="particle-quiz" style="background-color: #1c3d7d;">Fill the Particle</button>
            </div>
            <div id="quiz-score-container" style="display:none; margin-top: 20px;">
                <div id="quiz-progress-bar" style="background-color: #555; border-radius: 5px; margin-bottom: 10px;">
                    <div id="quiz-progress-bar-inner" style="width: 0%; height: 10px; background: #E3FFE7;
background: linear-gradient(90deg, rgba(227, 255, 231, 1) 0%, rgba(217, 231, 255, 1) 100%); border-radius: 5px; transition: width 0.5s ease;"></div>
                </div>
                <p>Question: <span id="question-count">0</span> / <span id="total-questions">0</span> | Score: <span id="quiz-score">0</span></p>
            </div>
            <div id="quiz-results-container" style="display:none; text-align: left;"></div>
        </div>`;
    document.querySelector('button[data-quiz-type="bangla-to-jp"]').addEventListener('click', () => startQuiz('bangla-to-jp'));
    document.querySelector('button[data-quiz-type="jp-to-bangla"]').addEventListener('click', () => startQuiz('jp-to-bangla'));
    document.querySelector('button[data-quiz-type="particle-quiz"]').addEventListener('click', () => startParticleQuiz());
}
// In dictionary.js, find and replace the renderSettingsTab function
// --- NEW: Add these functions to dictionary.js ---

// Function to start the particle quiz
function startParticleQuiz() {
    // Reset any previous quiz state
    App.config.quizScore = 0;
    App.config.currentQuiz = {
        type: 'particle-quiz',
        currentQuestionIndex: 0,
        totalQuestions: parseInt(document.getElementById('quiz-length-select').value, 10),
        wrongAnswers: [] // We can store the sentence/particle pair here
    };

    // Show the score container
    document.getElementById('quiz-score-container').style.display = 'block';
    document.getElementById('quiz-results-container').style.display = 'none';
    document.getElementById('quiz-score').textContent = '0';
    document.getElementById('total-questions').textContent = App.config.currentQuiz.totalQuestions;

    displayParticleQuestion();
}

// In dictionary.js, replace the existing displayParticleQuestion function

async function displayParticleQuestion() {
    const { currentQuestionIndex, totalQuestions } = App.config.currentQuiz;
    const quizContent = document.getElementById('quiz-content');

    if (currentQuestionIndex >= totalQuestions) {
        endQuiz();
        return;
    }

    quizContent.innerHTML = `<p>Loading next question...</p>`;

    try {
        const response = await fetch('/.netlify/functions/get-particle-quiz-sentence');
        if (!response.ok) throw new Error('Failed to fetch sentence.');
        const sentence = await response.json();

        // --- USE THE SAME SMARTER REGEX ON THE FRONTEND ---
        const smartRegex = new RegExp(`(?<![ぁ-ん])(${App.config.targetParticles.join('|')})(?![ぁ-ん])`, 'g');
        const matches = sentence.jp.match(smartRegex);

        if (!matches || matches.length === 0) {
            // Fallback: if the smart regex fails for some reason, try again
            console.warn("Smart regex found no particles in sentence:", sentence.jp);
            displayParticleQuestion();
            return;
        }

        // The matches are the actual particles found in the sentence
        const presentParticles = [...new Set(matches)]; // Use Set to get unique particles
        
        // Pick one of the found particles to be the answer
        const particleToTest = presentParticles[Math.floor(Math.random() * presentParticles.length)];
        
        // --- IMPROVED REPLACEMENT LOGIC ---
        // Replace only the first occurrence of the chosen particle to avoid ambiguity
        // in sentences where the same particle appears twice.
        const gappedSentence = sentence.jp.replace(new RegExp(`(?<![ぁ-ん])${particleToTest}(?![ぁ-ん])`), ' [＿＿] ');

        // Create multiple-choice options
        const options = [particleToTest];
        const otherParticles = App.config.targetParticles.filter(p => p !== particleToTest);
        while (options.length < 4 && otherParticles.length > 0) {
            const randomParticle = otherParticles.splice(Math.floor(Math.random() * otherParticles.length), 1)[0];
            options.push(randomParticle);
        }
        options.sort(() => Math.random() - 0.5);

        App.config.currentQuiz.currentQuestionData = {
            sentence: sentence,
            answer: particleToTest
        };

        quizContent.innerHTML = `
            <div class="quiz-bangla-word" style="font-family: 'Noto Sans JP', sans-serif; font-size: 1.4em;">${gappedSentence}</div>
            <p style="color: #ccc; margin: 10px 0;">(${sentence.bn || sentence.en})</p>
            <div id="quiz-options">${options.map(o => `<div class="quiz-option">${o}</div>`).join('')}</div>
        `;

        quizContent.querySelectorAll('.quiz-option').forEach(el => {
            el.addEventListener('click', (e) => checkParticleAnswer(e.target));
        });

    } catch (error) {
        quizContent.innerHTML = `<p style="color: #ff8a80;">Error loading question. Trying again...</p>`;
        setTimeout(displayParticleQuestion, 2000);
    }
    
    document.getElementById('question-count').textContent = currentQuestionIndex + 1;
    const progressPercent = ((currentQuestionIndex + 1) / totalQuestions) * 100;
    document.getElementById('quiz-progress-bar-inner').style.width = `${progressPercent}%`;
}

// In dictionary.js, replace the checkParticleAnswer function

function checkParticleAnswer(element) {
    const { sentence, answer } = App.config.currentQuiz.currentQuestionData;
    const userChoice = element.textContent;
    const isCorrect = userChoice === answer;

    document.querySelectorAll('#quiz-options .quiz-option').forEach(el => el.style.pointerEvents = 'none');

    if (isCorrect) {
        element.classList.add('correct');
        App.config.quizScore++;
        document.getElementById('quiz-score').textContent = App.config.quizScore;
    } else {
        element.classList.add('wrong');
        document.querySelectorAll('#quiz-options .quiz-option').forEach(el => {
            if (el.textContent === answer) el.classList.add('correct');
        });
        
        // --- NEW: Store detailed info for the review screen ---
        App.config.currentQuiz.wrongAnswers.push({
            sentence: sentence,
            answer: answer,
            userChoice: userChoice
        });
    }

    App.config.currentQuiz.currentQuestionIndex++;
    setTimeout(displayParticleQuestion, 1500);
}


async function renderSettingsTab() {
    const settingsContainer = document.getElementById('settings-tab');
    settingsContainer.innerHTML = `<div class="section-box"><p>Loading settings...</p></div>`;

    const getVoices = () => {
        return new Promise(resolve => {
            let voices = window.speechSynthesis.getVoices();
            if (voices.length) {
                resolve(voices);
                return;
            }
            window.speechSynthesis.onvoiceschanged = () => {
                voices = window.speechSynthesis.getVoices();
                resolve(voices);
            };
        });
    };

    const allVoices = await getVoices();
    const japaneseVoices = allVoices.filter(voice => voice.lang === 'ja-JP');
    
    // This part is correct. It correctly defaults to 'basic_default'
    const currentVoice = localStorage.getItem('preferredVoice') || 'basic_default';

    let voiceOptionsHTML = `
        <option value="google" ${currentVoice === 'google' ? 'selected' : ''}>
            High Quality (Google)
        </option>
    `;
    
    if (japaneseVoices.length > 0) {
        // This part is correct
        voiceOptionsHTML += japaneseVoices.map(voice => {
            const isSelected = currentVoice === voice.name ? 'selected' : '';
            return `<option value="${voice.name}" ${isSelected}>
                        Basic - ${voice.name} (${voice.lang})
                    </option>`;
        }).join('');
        
        // --- ADD A GENERIC DEFAULT OPTION IF NO SPECIFIC VOICE IS SELECTED ---
        // This handles the case where the saved preference is the generic 'basic_default'
        if (!japaneseVoices.some(v => v.name === currentVoice) && currentVoice !== 'google') {
             voiceOptionsHTML += `
                <option value="basic_default" selected>
                    Basic (Browser Default)
                </option>
            `;
        } else if (!japaneseVoices.some(v => v.name === currentVoice)) {
             voiceOptionsHTML += `
                <option value="basic_default">
                    Basic (Browser Default)
                </option>
            `;
        }

    } else {
        // --- THIS IS THE CORRECTED PART ---
        // Add the 'selected' check to the fallback option
        voiceOptionsHTML += `
            <option value="basic_default" ${currentVoice === 'basic_default' ? 'selected' : ''}>
                Basic (Browser Default)
            </option>
        `;
    }

    settingsContainer.innerHTML = `
        <div class="section-box">
            <h3>Voice & Sound</h3>
            <div class="input-group">
                <label for="voice-select">Speech Voice</label>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <select id="voice-select" style="flex-grow: 1;">
                        ${voiceOptionsHTML}
                    </select>
                    <button id="test-voice-btn" class="control-button" title="Test selected voice">🔊 Test</button>
                </div>
                <p style="font-size: 0.9em; color: #ccc; margin-top: 8px;">
                    Select your preferred voice. You can test it before saving.
                </p>
            </div>
        </div>
        
        <!-- Rest of the HTML is unchanged -->
        <div class="section-box">
            <h3>Export/Import Data</h3>
            <p>This will backup or restore YOUR added/edited/deleted words.</p>
            <button id="export-btn" class="control-button">Export My Words</button>
            <input type="file" id="import-file" accept=".json" style="display: none">
            <button id="import-btn" class="control-button">Import My Words</button>
        </div>
        <div class="section-box">
            <h3 style="color: #ff8a80;">Danger Zone</h3>
            <p>This will erase all your added words and reset the initial lesson data.</p>
            <button id="reset-btn" class="control-button" style="background-color: #d9534f;">Reset All Data</button>
        </div>
    `;

    // Event Listeners (These are correct and need no changes)
    const voiceSelect = document.getElementById('voice-select');
    
    voiceSelect.addEventListener('change', () => {
        localStorage.setItem('preferredVoice', voiceSelect.value);
    });

    document.getElementById('test-voice-btn').addEventListener('click', () => {
        const selectedVoiceValue = voiceSelect.value;
        const testText = "こんにちは";
        speakJapanese(testText, selectedVoiceValue); 
    });

    document.getElementById('export-btn').addEventListener('click', exportData);
    document.getElementById('import-btn').addEventListener('click', () => document.getElementById('import-file').click());
    document.getElementById('import-file').addEventListener('change', importData);
    document.getElementById('reset-btn').addEventListener('click', resetApplication);
}
function attachAppEventListeners() {
    App.elements.appContainer.querySelector('.nav-tabs').addEventListener('click', (e) => {
        if (e.target.matches('.nav-tab')) {
            const tabName = e.target.dataset.tab;
            if (tabName === 'settings') {
                // Call our new async function to render the settings
                renderSettingsTab(); 
            }
            if (tabName !== 'dictionary') {
                window.removeEventListener('scroll', handleInfiniteScroll);
            } else {
                window.addEventListener('scroll', handleInfiniteScroll);
            }
            if (App.config.currentQuiz.type && tabName !== 'quiz') {
                App.config.quizScore = 0;
                App.config.currentQuiz = {};
                renderQuizTab();
            }
            App.elements.appContainer.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            App.elements.appContainer.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            App.elements.appContainer.querySelector(`#${tabName}-tab`).classList.add('active');
            e.target.classList.add('active');
        }
    });
    App.elements.modal.querySelector('.modal-close').addEventListener('click', () => App.elements.modal.style.display = 'none');
    App.elements.modal.querySelector('#save-edit-btn').addEventListener('click', saveEditedWord);
    App.elements.sentenceModal.querySelector('.modal-close').addEventListener('click', () => App.elements.sentenceModal.style.display = 'none');
    App.elements.mnemonicModal.querySelector('.modal-close').addEventListener('click', () => App.elements.mnemonicModal.style.display = 'none');
}
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function closeSentenceModal() {
    App.elements.sentenceModal.style.display = 'none';
}
function renderWeakWordsList() {
    const container = document.getElementById('weak-words-list');
    if (!container) return;
    container.innerHTML = '';
    document.getElementById('weak-words-count-title').textContent = `Weak Words (${App.data.weakWords.length})`;
    if (App.data.weakWords.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#888;">Your weak words list is empty.</p>';
        return;
    }
    App.data.weakWords.forEach(word => {
        if (getWordData(word)) container.appendChild(createWordCard(word));
    });
}
function getRandomWord() {
    if (App.config.mainPracticeList.length === 0) {
        let wordPool = getWordPool();
        if (wordPool.length === 0) {
            document.getElementById('flashcard-content').innerHTML = `<p>No words to practice in this lesson set.</p>`;
            document.getElementById('show-meaning-btn').style.display = 'none';
            document.getElementById('get-random-btn').textContent = 'Get Random Word';
            return;
        }
        App.config.mainPracticeList = wordPool.sort(() => Math.random() - 0.5);
        document.getElementById('get-random-btn').textContent = 'Next Word';
    }
    App.config.currentRandomWord = App.config.mainPracticeList.pop();
    const content = document.getElementById('flashcard-content');
    content.innerHTML = `<div class="word-display">${App.config.currentRandomWord}</div>`;
    const btn = document.getElementById('show-meaning-btn');
    btn.textContent = 'Show Meaning';
    btn.style.display = 'inline-block';
    if (App.config.mainPracticeList.length === 0) {
        document.getElementById('get-random-btn').textContent = 'Start Over';
    }
}
function getWeakWordForPractice() {
    if (App.config.weakPracticeList.length === 0) {
        if (App.data.weakWords.length === 0) {
            document.getElementById('weak-word-flashcard-content').innerHTML = '<p>No weak words to practice. Well done!</p>';
            document.getElementById('show-weak-meaning-btn').style.display = 'none';
            document.getElementById('get-weak-word-btn').textContent = 'Get Weak Word';
            return;
        }
        App.config.weakPracticeList = [...App.data.weakWords].sort(() => Math.random() - 0.5);
        document.getElementById('get-weak-word-btn').textContent = 'Next Weak Word';
    }
    App.config.currentRandomWord = App.config.weakPracticeList.pop();
    const content = document.getElementById('weak-word-flashcard-content');
    content.innerHTML = `<div class="word-display">${App.config.currentRandomWord}</div>`;
    const btn = document.getElementById('show-weak-meaning-btn');
    btn.textContent = 'Show Meaning';
    btn.style.display = 'inline-block';
    if (App.config.weakPracticeList.length === 0) {
        document.getElementById('get-weak-word-btn').textContent = 'Start Over';
    }
}
function toggleRandomMeaning() {
    const word = App.config.currentRandomWord;
    if (!word) return;
    const btn = document.getElementById('show-meaning-btn');
    const cardContent = document.getElementById('flashcard-content');
    if (btn.textContent === 'Show Meaning') {
        const { meaning } = getWordData(word);
        cardContent.innerHTML = `<div class="meaning-display">${meaning}<span class="speak-icon" onclick="speakJapanese('${meaning}')">🔊</span></div>`;
        btn.textContent = 'Show Word';
        if (!App.data.weakWords.includes(word)) {
            App.data.weakWords.push(word);
            saveUserData();
            renderWeakWordsList();
        }
    } else {
        cardContent.innerHTML = `<div class="word-display">${word}</div>`;
        btn.textContent = 'Show Meaning';
    }
}
function startQuiz(quizType) {
    const wordPool = getWordPool();
    const quizLength = parseInt(document.getElementById('quiz-length-select').value, 10);
    if (wordPool.length < 4) {
        alert('You need at least 4 words in this set to start a quiz!');
        return;
    }
    App.config.quizScore = 0;
    const questions = [];
    const shuffledPool = wordPool.sort(() => Math.random() - 0.5);
    for (let i = 0; i < quizLength && i < shuffledPool.length; i++) {
        const questionWordKey = shuffledPool[i];
        const questionWordData = getWordData(questionWordKey);
        let questionText, correctAnswerText;
        if (quizType === 'jp-to-bangla') {
            questionText = questionWordData.meaning;
            correctAnswerText = questionWordKey;
        } else {
            questionText = questionWordKey;
            correctAnswerText = questionWordData.meaning;
        }
        let options = [correctAnswerText];
        const optionsPool = wordPool.filter(w => w !== questionWordKey);
        while (options.length < 4 && optionsPool.length > 0) {
            const randomOptionKey = optionsPool.splice(Math.floor(Math.random() * optionsPool.length), 1)[0];
            const optionText = (quizType === 'jp-to-bangla') ? randomOptionKey : getWordData(randomOptionKey).meaning;
            if (!options.includes(optionText)) {
                options.push(optionText);
            }
        }
        questions.push({
            word: questionWordKey,
            question: questionText,
            answer: correctAnswerText,
            options: options.sort(() => Math.random() - 0.5)
        });
    }
    App.config.currentQuiz = {
        type: quizType,
        questions: questions,
        wrongAnswers: [],
        currentQuestionIndex: 0,
        totalQuestions: questions.length
    };
    document.getElementById('quiz-score-container').style.display = 'block';
    document.getElementById('quiz-results-container').style.display = 'none';
    document.getElementById('quiz-score').textContent = '0';
    document.getElementById('total-questions').textContent = App.config.currentQuiz.totalQuestions;
    displayQuiz();
}
function displayQuiz() {
    const { questions, currentQuestionIndex, totalQuestions } = App.config.currentQuiz;
    if (currentQuestionIndex >= totalQuestions) {
        endQuiz();
        return;
    }
    const currentQuestion = questions[currentQuestionIndex];
    const quizContent = document.getElementById('quiz-content');
    quizContent.innerHTML = `
        <div class="quiz-bangla-word">${currentQuestion.question}</div>
        <div id="quiz-options">${currentQuestion.options.map(o => `<div class="quiz-option">${o}</div>`).join('')}</div>`;
    quizContent.querySelectorAll('.quiz-option').forEach(el => el.addEventListener('click', (e) => checkAnswer(e.target)));
    document.getElementById('question-count').textContent = currentQuestionIndex + 1;
    const progressPercent = ((currentQuestionIndex + 1) / totalQuestions) * 100;
    document.getElementById('quiz-progress-bar-inner').style.width = `${progressPercent}%`;
}
function checkAnswer(element) {
    const { questions, currentQuestionIndex } = App.config.currentQuiz;
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = element.textContent === currentQuestion.answer;
    document.querySelectorAll('#quiz-options .quiz-option').forEach(el => el.style.pointerEvents = 'none');
    if (isCorrect) {
        element.classList.add('correct');
        App.config.quizScore++;
        document.getElementById('quiz-score').textContent = App.config.quizScore;
    } else {
        element.classList.add('wrong');
        document.querySelectorAll('#quiz-options .quiz-option').forEach(el => {
            if (el.textContent === currentQuestion.answer) el.classList.add('correct');
        });
        App.config.currentQuiz.wrongAnswers.push(currentQuestion.word);
        if (!App.data.weakWords.includes(currentQuestion.word)) {
            App.data.weakWords.push(currentQuestion.word);
            saveUserData();
            renderWeakWordsList();
        }
    }
    App.config.currentQuiz.currentQuestionIndex++;
    setTimeout(displayQuiz, 1500);
}
// In dictionary.js, replace the existing endQuiz function

function endQuiz() {
    const { totalQuestions, wrongAnswers, type } = App.config.currentQuiz;
    const quizScore = App.config.quizScore;
    const quizContent = document.getElementById('quiz-content');
    const resultsContainer = document.getElementById('quiz-results-container');
    
    quizContent.innerHTML = '';
    document.getElementById('quiz-score-container').style.display = 'none';
    resultsContainer.style.display = 'block';

    const percentage = totalQuestions > 0 ? Math.round((quizScore / totalQuestions) * 100) : 0;
    
    // --- START: Main Results Display ---
    let resultsHTML = `
        <h2 style="font-size:1.3em;">Quiz Complete!</h2>
        <p style="font-size: 1em; margin: 10px 0;">
            Final Score: <strong>${quizScore} / ${totalQuestions} (${percentage}%)</strong>
        </p>
    `;

    // --- THIS IS THE BUG FIX & NEW FEATURE ---
    if (wrongAnswers.length > 0) {
        resultsHTML += `<h3>Words to Review:</h3>`;
        
        // --- Review Logic for Vocabulary Quizzes ---
        if (type.startsWith('type-') || type.startsWith('bangla-') || type.startsWith('jp-')) {
            // Get unique wrong words to avoid duplicates in the review list
            const uniqueWrongWords = [...new Set(wrongAnswers)]; 
            resultsHTML += `<div class="word-list-container">
                                ${uniqueWrongWords.map(word => createWordCard(word).outerHTML).join('')}
                            </div>`;
        }
        
        // --- NEW: Review Logic for Particle Quiz ---
        else if (type === 'particle-quiz') {
            resultsHTML += `<div class="particle-review-container">`;
            wrongAnswers.forEach(item => {
                // Highlight the correct particle in the sentence
                const highlightedSentence = item.sentence.jp.replace(
                    item.answer, 
                    `<strong class="highlight-particle">${item.answer}</strong>`
                );
                
                resultsHTML += `
                    <div class="particle-review-item">
                        <p class="sentence-japanese">${highlightedSentence}</p>
                        <p class="sentence-bangla">(${item.sentence.bn || item.sentence.en})</p>
                        <p class="wrong-answer-info">Your Answer: <span class="wrong-particle">${item.userChoice}</span> | Correct: <span class="correct-particle">${item.answer}</span></p>
                    </div>
                `;
            });
            resultsHTML += `</div>`;
        }

    } else {
        // This message now ONLY shows if they truly got everything correct
        resultsHTML += `<p style="color: #4CAF50; font-weight: bold;">Excellent! You got all questions correct!</p>`;
    }
    // --- END FIX ---

    resultsHTML += `<div style="text-align: center; margin-top: 25px;"><button id="play-again-btn" class="add-button">Play Again</button></div>`;
    resultsContainer.innerHTML = resultsHTML;

    // Re-attach event listener for the play again button
    document.getElementById('play-again-btn').addEventListener('click', () => {
        resultsContainer.style.display = 'none';
        renderQuizTab();
    });
}

function openEditModal(word) {
    const wordData = getWordData(word);
    if (!wordData) return;

    const { meaning, category, en } = wordData;
    const modal = App.elements.modal;

    // --- THIS IS THE FIX ---
    // A helper function to convert a string to PascalCase (e.g., "noun" -> "Noun")
    const toPascalCase = (str) => {
        if (!str || typeof str !== 'string') return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    const formattedCategory = toPascalCase(category);
    // --- END OF FIX ---

    modal.querySelector('#edit-original-word').value = word;
    modal.querySelector('#edit-word-input').value = word;
    modal.querySelector('#edit-meaning-input').value = meaning;
    modal.querySelector('#edit-en-input').value = en || '';
    
    // Now we use the correctly formatted category name
    modal.querySelector('#edit-category-select').value = formattedCategory;
    
    modal.style.display = 'flex';
}

// ... (the rest of the file is unchanged)
function closeEditModal() {
    App.elements.modal.style.display = 'none';
}
// FINAL speakJapanese function - Supports dynamic voice selection and testing.

const audioCache = {};
let currentAudio = null;

async function speakJapanese(text, forceVoice = null) {
    if (!text || text.trim() === '') return;

    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }
    window.speechSynthesis.cancel();

    // Use the forced voice if provided (for testing), otherwise get from localStorage
    const voicePreference = forceVoice || localStorage.getItem('preferredVoice') || 'basic_default';

    // If the preference is Google's voice, use the API
    if (voicePreference === 'google') {
        if (audioCache[text]) {
            currentAudio = audioCache[text];
            currentAudio.play();
            return;
        }
        try {
            const response = await fetch(`/.netlify/functions/get-google-speech?text=${encodeURIComponent(text)}`);
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Proxy fetch failed');
            }
            const data = await response.json();
            const audioSrc = `data:audio/mpeg;base64,${data.audioContent}`;
            const audio = new Audio(audioSrc);
            audioCache[text] = audio;
            currentAudio = audio;
            audio.play();
        } catch (error) {
            console.error('High-quality voice failed:', error);
            console.warn('Falling back to basic default voice.');
            speakWithBasicVoice(text, 'basic_default'); // Fallback
        }
    } else {
        // Otherwise, use the browser's basic voice, passing the specific voice name
        speakWithBasicVoice(text, voicePreference);
    }
}

// This helper function can now select a specific voice by name
function speakWithBasicVoice(text, voiceName) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.7;

    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = null;

    if (voiceName && voiceName !== 'basic_default') {
        // Find the specific voice the user selected
        selectedVoice = voices.find(voice => voice.name === voiceName);
    } 
    
    if (!selectedVoice) {
        // Fallback to the first available Japanese voice if the specific one isn't found
        // or if the setting is 'basic_default'
        selectedVoice = voices.find(voice => voice.lang === 'ja-JP');
    }
    
    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }

    window.speechSynthesis.speak(utterance);
}

// Keep the pre-loader
window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
};

window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
};

// Pre-load voices for the basic synthesizer. Some browsers need this.
window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
};
function exportData() {
    const userData = {
        userWords: App.data.userWords,
        deletedWords: App.data.deletedWords
    };
    const dataStr = JSON.stringify(userData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'N5_MyWords_Backup.json';
    a.click();
    URL.revokeObjectURL(url);
}
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            if (importedData.userWords || importedData.deletedWords) {
                if(confirm("This will overwrite your current custom words. Are you sure you want to continue?")) {
                    App.data.userWords = importedData.userWords || {};
                    App.data.deletedWords = importedData.deletedWords || [];
                    saveUserData(); 
                    alert('Your words have been imported successfully! The page will now reload.');
                    location.reload();
                }
            } else { alert('Invalid file format. Make sure it is a valid "My Words" backup file.'); }
        } catch (error) { alert('Error reading file. ' + error.message); }
    };
    reader.readAsText(file);
}
async function showMnemonic(banglaWord) {
    const wordData = getWordData(banglaWord);
    if (!wordData || !wordData.en) {
        alert('No English translation available to search for a mnemonic for this word.');
        return;
    }
    const modal = App.elements.mnemonicModal;
    const modalBody = modal.querySelector('#mnemonic-modal-body');
    modal.style.display = 'flex';
    modalBody.innerHTML = '<p class="image-loading-text">Searching for a visual mnemonic...</p>';

    const englishWord = wordData.en;
    const japaneseWord = wordData.meaning;

    try {
        // Call your new, secure serverless function
        const response = await fetch(`/.netlify/functions/get-image?query=${encodeURIComponent(englishWord)}`);

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || `API error: ${response.statusText}`);
        }
        
        const data = await response.json();
        let imageHtml = `<p class="image-loading-text">No image found for "${englishWord}".</p>`;
        if (data.photos && data.photos.length > 0) {
            const photo = data.photos[0];
            imageHtml = `
                <a href="${photo.url}" target="_blank" rel="noopener noreferrer" class="mnemonic-image-link">
                    <img src="${photo.src.large}" alt="Visual mnemonic for ${englishWord}">
                </a>
                <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer" class="pexels-credit">Photo by ${photo.photographer} on Pexels</a>
            `;
        }
        modalBody.innerHTML = `
            <div class="mnemonic-word-info">
                <div class="mnemonic-bangla">${banglaWord}</div>
                <div class="mnemonic-japanese">${japaneseWord}<span class="speak-icon" onclick="speakJapanese('${japaneseWord}')">🔊</span></div>
            </div>
            ${imageHtml}
        `;
    } catch (error) {
        console.error('Error fetching image from proxy:', error);
        modalBody.innerHTML = `<p class="image-error-text">${error.message}</p>`;
    }
}
function closeMnemonicModal() {
    if (App.elements.mnemonicModal) {
        App.elements.mnemonicModal.style.display = 'none';
    }
}