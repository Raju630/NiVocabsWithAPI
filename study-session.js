// study-session.js (FINAL - CORRECTED API REQUEST LOGIC)

const StudyApp = {
    data: {
        dictionary: {},
        studyWords: [],
        practiceList: []
    },
    elements: {
        container: document.getElementById('study-app-container'),
        sentenceModal: document.getElementById('sentence-modal'),
        mnemonicModal: document.getElementById('mnemonic-modal'),
    },
    config: {
        pexelsApiKey: '0YZ1YqOAGmfXwoIBl7elGumGGMYqwrOJgwqyqstQuMEGtyPJjiFFNr3K'
    }
};

async function showExampleSentences(banglaWord) {
    const wordData = StudyApp.data.dictionary[banglaWord];
    if (!wordData) return;
    
    const japaneseSearchTerm = wordData.meaning.replace(/\[.*?\]|～|、/g, '').trim();
    const modal = StudyApp.elements.sentenceModal;
    const wordEl = modal.querySelector('#sentence-modal-word');
    const bodyEl = modal.querySelector('#sentence-modal-body');

    wordEl.textContent = japaneseSearchTerm;
    bodyEl.innerHTML = '<p>Loading sentences...</p>';
    modal.style.display = 'flex';

    try {
        const response = await fetch(`/api/sentences?term=${encodeURIComponent(japaneseSearchTerm)}`);
        if (!response.ok) throw new Error("Failed to fetch sentences from the API.");
        
        const relevantSentences = await response.json();

        if (relevantSentences.length === 0) {
            bodyEl.innerHTML = `<p style="color: #ffcdd2;">No example sentences found for "${japaneseSearchTerm}".</p>`;
        } else {
            const highlightRegex = new RegExp(escapeRegExp(japaneseSearchTerm), 'g');
            let html = `<h2>Examples for "${japaneseSearchTerm}"</h2>`;
            relevantSentences.forEach((s, index) => {
                const highlightedSentence = s.jp.replace(highlightRegex, `<strong>${japaneseSearchTerm}</strong>`);
                html += `<div class="sentence-entry"><p class="sentence-japanese">${index + 1}. ${highlightedSentence} <span class="speak-icon" onclick="speakJapanese('${s.jp.replace(/'/g, "\\'")}')">🔊</span></p><p class="sentence-bangla">(${s.bn})</p></div>`;
            });
            bodyEl.innerHTML = html;
        }
    } catch (error) {
        console.error("Error fetching sentences:", error);
        bodyEl.innerHTML = `<p style="color: #ffcdd2;">Could not load sentences from the server.</p>`;
    }
}

// --- All other helper functions (speakJapanese, closeModals, etc.) remain the same ---
function speakJapanese(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
    }
}
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function closeSentenceModal() {
    if (StudyApp.elements.sentenceModal) StudyApp.elements.sentenceModal.style.display = 'none';
}
async function showMnemonic(banglaWord) {
    const wordData = StudyApp.data.dictionary[banglaWord];
    if (!wordData || !wordData.en) return;
    const modal = StudyApp.elements.mnemonicModal;
    const modalBody = modal.querySelector('#mnemonic-modal-body');
    modal.style.display = 'flex';
    modalBody.innerHTML = '<p class="image-loading-text">Searching for a visual mnemonic...</p>';
    try {
        const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(wordData.en)}&per_page=1`, {
            headers: { Authorization: StudyApp.config.pexelsApiKey }
        });
        if (!response.ok) throw new Error(`Pexels API error: ${response.statusText}`);
        const data = await response.json();
        let imageHtml = `<p class="image-loading-text">No image found for "${wordData.en}".</p>`;
        if (data.photos && data.photos.length > 0) {
            const photo = data.photos[0];
            imageHtml = `<a href="${photo.url}" target="_blank" rel="noopener noreferrer" class="mnemonic-image-link"><img src="${photo.src.large}" alt="Visual for ${wordData.en}"></a><a href="https://www.pexels.com" target="_blank" class="pexels-credit">Photo by ${photo.photographer} on Pexels</a>`;
        }
        modalBody.innerHTML = `<div class="mnemonic-word-info"><div class="mnemonic-bangla">${banglaWord}</div><div class="mnemonic-japanese">${wordData.meaning}<span class="speak-icon" onclick="speakJapanese('${wordData.meaning}')">🔊</span></div></div>${imageHtml}`;
    } catch (error) {
        modalBody.innerHTML = `<p class="image-error-text">${error.message}</p>`;
    }
}
function closeMnemonicModal() {
    if (StudyApp.elements.mnemonicModal) StudyApp.elements.mnemonicModal.style.display = 'none';
}


document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const wordsParam = urlParams.get('words');

    if (!wordsParam) {
        StudyApp.elements.container.innerHTML = '<h1>Error</h1><p>No study list provided. Please return to the main page and start a new session.</p>';
        return;
    }

    try {
        const studyWordsList = decodeURIComponent(wordsParam).split(',');
        StudyApp.data.studyWords = studyWordsList;

        // --- THE CRITICAL CHANGE IS HERE ---
        // We now use a specific 'list' parameter instead of the generic 'search' parameter.
        const wordsForApi = encodeURIComponent(studyWordsList.join(','));
        const response = await fetch(`/api/words?list=${wordsForApi}`);
        // --- END OF CHANGE ---

        if (!response.ok) throw new Error('Failed to fetch dictionary data from the server.');

        StudyApp.data.dictionary = await response.json();
        
        renderStudyPage();

    } catch (e) {
        StudyApp.elements.container.innerHTML = `<h1>Error</h1><p>Could not load the study session data. ${e.message}</p>`;
        return;
    }

    // --- The rest of the file (render logic, etc.) remains the same ---
    let currentStudyWord = null;
    function renderStudyPage() {
        const validStudyWords = StudyApp.data.studyWords.filter(word => StudyApp.data.dictionary[word]);
        if (validStudyWords.length === 0) {
             StudyApp.elements.container.innerHTML = `<h1>Error</h1><p>None of the selected words could be found in the dictionary.</p>`;
             return;
        }
        const wordListHtml = validStudyWords.map(word => {
            const entry = StudyApp.data.dictionary[word];
            const hasEnglishTerm = !!entry.en;
            return `<div class="study-list-item"><div><span class="word-bangla">${word}</span><span class="word-japanese">${entry.meaning}</span></div><div class="study-item-actions">${hasEnglishTerm ? `<button class="card-action-btn mnemonic" title="Show Mnemonic" onclick="showMnemonic('${word.replace(/'/g, "\\'")}')">🖼️</button>` : ''}<button class="card-action-btn examples" title="Show Examples" onclick="showExampleSentences('${word.replace(/'/g, "\\'")}')">📝</button></div></div>`;
        }).join('');
        StudyApp.elements.container.innerHTML = `
            <div class="study-session-grid">
                <div class="section-box flashcard-practice-area">
                    <h3 style="text-align:center;">Flashcard Practice</h3>
                    <div class="random-word-container"><div class="flashcard-container"><div id="flashcard-content" class="flashcard-content"><p>Click the button below to start.</p></div></div><div class="random-word-controls"><button id="get-study-word-btn" class="control-button">Start Practice</button><button id="show-study-meaning-btn" class="control-button" style="display:none;">Show Meaning</button></div></div>
                </div>
                <div class="section-box study-word-list-area"><h3>Your Study List (${validStudyWords.length} words)</h3><div class="study-list-container">${wordListHtml}</div></div>
            </div>`;
        document.getElementById('get-study-word-btn').addEventListener('click', getRandomStudyWord);
        document.getElementById('show-study-meaning-btn').addEventListener('click', toggleStudyWordMeaning);
    }
    function getRandomStudyWord() {
        const getBtn = document.getElementById('get-study-word-btn');
        if (StudyApp.data.practiceList.length === 0) {
            const validWords = StudyApp.data.studyWords.filter(word => StudyApp.data.dictionary[word]);
            StudyApp.data.practiceList = [...validWords].sort(() => Math.random() - 0.5);
            getBtn.textContent = 'Next Word';
        }
        currentStudyWord = StudyApp.data.practiceList.pop();
        if (!currentStudyWord) {
            getBtn.textContent = 'Start Over';
            document.getElementById('flashcard-content').innerHTML = '<p>Round complete! Click "Start Over" to practice again.</p>';
            document.getElementById('show-study-meaning-btn').style.display = 'none';
            return;
        }
        document.getElementById('flashcard-content').innerHTML = `<div class="word-display">${currentStudyWord}</div>`;
        const showMeaningBtn = document.getElementById('show-study-meaning-btn');
        showMeaningBtn.textContent = 'Show Meaning';
        showMeaningBtn.style.display = 'inline-block';
        if (StudyApp.data.practiceList.length === 0) getBtn.textContent = 'Start Over';
    }
    function toggleStudyWordMeaning() {
        if (!currentStudyWord) return;
        const btn = document.getElementById('show-study-meaning-btn');
        const cardContent = document.getElementById('flashcard-content');
        if (btn.textContent === 'Show Meaning') {
            const entry = StudyApp.data.dictionary[currentStudyWord];
            if(entry) {
                cardContent.innerHTML = `<div class="meaning-display">${entry.meaning}<span class="speak-icon" onclick="speakJapanese('${entry.meaning}')">🔊</span></div>`;
                btn.textContent = 'Show Word';
            }
        } else {
            cardContent.innerHTML = `<div class="word-display">${currentStudyWord}</div>`;
            btn.textContent = 'Show Meaning';
        }
    }
    if (StudyApp.elements.sentenceModal) {
        StudyApp.elements.sentenceModal.querySelector('.modal-close').addEventListener('click', closeSentenceModal);
    }
    if (StudyApp.elements.mnemonicModal) {
        StudyApp.elements.mnemonicModal.querySelector('.modal-close').addEventListener('click', closeMnemonicModal);
    }
});