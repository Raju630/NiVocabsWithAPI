// study-session.js (MODIFIED for dynamic loading)

// This function will be the main entry point, called by dictionary.js
async function initializeStudySession(container, wordsToStudy) {

    const StudyApp = {
        data: {
            dictionary: {},
            studyWords: wordsToStudy,
            practiceList: [],
            currentWord: null
        },
        elements: {
            container: container,
            sentenceModal: document.getElementById('sentence-modal'),
            mnemonicModal: document.getElementById('mnemonic-modal'),
        },
        config: {
            pexelsApiKey: '0YZ1YqOAGmfXwoIBl7elGumGGMYqwrOJgwqyqstQuMEGtyPJjiFFNr3K'
        }
    };

    // Helper functions (these are local to this script)
    const speakJapanese = (text) => { /* ... same as before ... */ };
    const escapeRegExp = (string) => { /* ... same as before ... */ };
    const showMnemonic = async (banglaWord) => { /* ... same as before ... */ };
    const showExampleSentences = async (banglaWord) => { /* ... same as before ... */ };

    const goBack = () => {
        // Use the History API to go back, which will be caught by dictionary.js
        window.history.back();
    };

    try {
        const wordsForApi = encodeURIComponent(StudyApp.data.studyWords.join(','));
        const response = await fetch(`/.netlify/functions/words?list=${wordsForApi}`);
        if (!response.ok) throw new Error('Failed to fetch dictionary data.');

        StudyApp.data.dictionary = await response.json();
        renderStudyPage();

    } catch (e) {
        StudyApp.elements.container.innerHTML = `<h1>Error</h1><p>Could not load session data. ${e.message}</p> <button id="back-btn">Back</button>`;
        StudyApp.elements.container.querySelector('#back-btn').addEventListener('click', goBack);
        return;
    }

    function renderStudyPage() {
        const validStudyWords = StudyApp.data.studyWords.filter(word => StudyApp.data.dictionary[word]);
        if (validStudyWords.length === 0) {
             StudyApp.elements.container.innerHTML = `<h1>Error</h1><p>Words not found.</p><button id="back-btn">Back</button>`;
             StudyApp.elements.container.querySelector('#back-btn').addEventListener('click', goBack);
             return;
        }

        const wordListHtml = validStudyWords.map(word => {
            const entry = StudyApp.data.dictionary[word];
            // We need to pass the full function name for onclick to work in the global scope
            return `<div class="study-list-item"><div><span class="word-bangla">${word}</span><span class="word-japanese">${entry.meaning}</span></div><div class="study-item-actions">${!!entry.en ? `<button class="card-action-btn mnemonic" title="Show Mnemonic" onclick="App.showMnemonic('${word.replace(/'/g, "\\'")}')">🖼️</button>` : ''}<button class="card-action-btn examples" title="Show Examples" onclick="App.showExampleSentences('${word.replace(/'/g, "\\'")}')">📝</button></div></div>`;
        }).join('');

        StudyApp.elements.container.innerHTML = `
            <div class="study-session-wrapper">
                <div class="study-session-header">
                    <h1>Study Session</h1>
                    <button id="back-to-dict-btn" class="back-to-dict-btn">← Back to Dictionary</button>
                </div>
                <div class="study-session-grid">
                    <div class="section-box flashcard-practice-area">
                        <h3 style="text-align:center;">Flashcard Practice</h3>
                        <div class="random-word-container"><div class="flashcard-container"><div id="study-flashcard-content" class="flashcard-content"><p>Click the button below to start.</p></div></div><div class="random-word-controls"><button id="get-study-word-btn" class="control-button">Start Practice</button><button id="show-study-meaning-btn" class="control-button" style="display:none;">Show Meaning</button></div></div>
                    </div>
                    <div class="section-box study-word-list-area"><h3>Your Study List (${validStudyWords.length} words)</h3><div class="study-list-container">${wordListHtml}</div></div>
                </div>
            </div>
        `;

        document.getElementById('back-to-dict-btn').addEventListener('click', goBack);
        document.getElementById('get-study-word-btn').addEventListener('click', getRandomStudyWord);
        document.getElementById('show-study-meaning-btn').addEventListener('click', toggleStudyWordMeaning);
    }

    function getRandomStudyWord() { /* ... same as before ... */ }
    function toggleStudyWordMeaning() { /* ... same as before ... */ }
}

// All helper functions need to be defined here to be used by the module
function speakJapanese(text) { if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'ja-JP'; utterance.rate = 0.9; window.speechSynthesis.speak(utterance); } }
function escapeRegExp(string) { return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
// The global App object will handle modals now, so these local versions are not strictly needed
// but we keep them here for structural clarity if you want to reuse this file elsewhere.
async function showMnemonic(banglaWord) { App.showMnemonic(banglaWord); }
async function showExampleSentences(banglaWord) { App.showExampleSentences(banglaWord); }