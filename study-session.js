// study-session.js (With Final Comma/Delimiter Bug Fix)

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
        
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    const renderPageSkeleton = () => {
        const skeletonHTML = `
            <div class="skeleton-study-grid">
                <div class="skeleton-flashcard-box">
                    <div class="skeleton-line title" style="width: 50%; margin: 0 auto;"></div>
                    <div class="skeleton-flashcard-content"></div>
                    <div class="skeleton-line button"></div>
                </div>
                <div class="skeleton-word-list-box">
                    <div class="skeleton-line title" style="width: 70%; margin-bottom: 20px;"></div>
                    <div class="skeleton-list-item"></div>
                    <div class="skeleton-list-item"></div>
                    <div class="skeleton-list-item"></div>
                    <div class="skeleton-list-item"></div>
                </div>
            </div>
        `;
        StudyApp.elements.container.innerHTML = skeletonHTML;
    };
    renderPageSkeleton();

    const urlParams = new URLSearchParams(window.location.search);
    const wordsParam = urlParams.get('words');

    if (!wordsParam) {
        StudyApp.elements.container.innerHTML = '<h1>Error</h1><p>No study list provided. Please return to the main page and start a new session.</p>';
        return;
    }

    try {
        const studyWordsList = decodeURIComponent(wordsParam).split('|');
        StudyApp.data.studyWords = studyWordsList;

        // --- THE FIX IS ON THIS LINE ---
        // We must join with the SAME delimiter ('|') that the backend expects.
        const wordsForApi = encodeURIComponent(studyWordsList.join('|'));
        const response = await fetch(`/.netlify/functions/words?list=${wordsForApi}`);

        if (!response.ok) throw new Error('Failed to fetch dictionary data from the server.');

        StudyApp.data.dictionary = await response.json();
        
        renderStudyPage();

    } catch (e) {
        StudyApp.elements.container.innerHTML = `<h1>Error</h1><p>Could not load the study session data. ${e.message}</p>`;
        return;
    }

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

async function showExampleSentences(banglaWord) {
    const wordData = StudyApp.data.dictionary[banglaWord];
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
        bodyEl.innerHTML = `<p style="color: var(--missing-color);">Cannot search for sentences. This word is missing a required Japanese or English translation.</p>`;
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
            btn.style.backgroundColor = 'var(--danger-color)';
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
        
        let html = '';
        const highlightRegex = new RegExp(escapeRegExp(japaneseSearchTerm), 'gi');

        if (relevantSentences.length === 0) {
            html = `<p style="color: var(--missing-color);">No example sentences found for "${japaneseSearchTerm}".</p>`;
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

        if (relevantSentences.length < 3) {
            html += `
                <div style="border-top: 1px solid var(--glass-border); margin-top: 20px; padding-top: 20px; text-align: center;">
                    <p style="color: var(--text-color-light);">Want to see more examples for this word?</p>
                    <button id="request-sentence-btn" class="add-button" style="margin-top: 10px;">Request More Sentences</button>
                </div>
            `;
        }
        
        bodyEl.innerHTML = html;

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

    } catch (error) {
        console.error("Error fetching sentences:", error);
        if (bodyEl) {
            bodyEl.innerHTML = `<p style="color: var(--missing-color);">Could not load sentences: ${error.message}</p>`;
        }
    }
}

const audioCache = {};
let currentAudio = null;

async function speakJapanese(text, forceVoice = null) {
    if (!text || text.trim() === '') return;
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
    }
    window.speechSynthesis.cancel();
    const voicePreference = forceVoice || localStorage.getItem('preferredVoice') || 'basic_default';
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
            speakWithBasicVoice(text, 'basic_default');
        }
    } else {
        speakWithBasicVoice(text, voicePreference);
    }
}

function speakWithBasicVoice(text, voiceName) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = 0.7;
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = null;
    if (voiceName && voiceName !== 'basic_default') {
        selectedVoice = voices.find(voice => voice.name === voiceName);
    } 
    if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang === 'ja-JP');
    }
    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }
    window.speechSynthesis.speak(utterance);
}

window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
};

function escapeRegExp(string) { return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function closeSentenceModal() { if (StudyApp.elements.sentenceModal) StudyApp.elements.sentenceModal.style.display = 'none'; }

async function showMnemonic(banglaWord) {
    const wordData = StudyApp.data.dictionary[banglaWord];
    if (!wordData || !wordData.en) {
        alert('No English translation available to search for a mnemonic for this word.');
        return;
    }
    const modal = StudyApp.elements.mnemonicModal;
    if (!modal) {
        console.error("Mnemonic modal not found in StudyApp elements.");
        return;
    }
    const modalBody = modal.querySelector('#mnemonic-modal-body');
    modal.style.display = 'flex';
    modalBody.innerHTML = '<p class="image-loading-text">Searching for a visual mnemonic...</p>';
    const englishWord = wordData.en;
    const japaneseWord = wordData.meaning;
    try {
        const response = await fetch(`/.netlify/functions/get-unsplash-image?query=${encodeURIComponent(englishWord)}`);
        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || `API error: ${response.statusText}`);
        }
        const data = await response.json();
        let imageHtml = `<p class="image-loading-text">No image found for "${englishWord}".</p>`;
        if (data.results && data.results.length > 0) {
            const photo = data.results[0];
            imageHtml = `
                <a href="${photo.links.html}" target="_blank" rel="noopener noreferrer" class="mnemonic-image-link">
                    <img src="${photo.urls.regular}" alt="${photo.alt_description || 'Visual mnemonic for ' + englishWord}">
                </a>
                <a href="${photo.user.links.html}" target="_blank" rel="noopener noreferrer" class="pexels-credit">
                    Photo by ${photo.user.name} on Unsplash
                </a>
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
        console.error('Error fetching image from Unsplash proxy:', error);
        modalBody.innerHTML = `<p class="image-error-text">${error.message}</p>`;
    }
}
function closeMnemonicModal() { if (StudyApp.elements.mnemonicModal) StudyApp.elements.mnemonicModal.style.display = 'none'; }