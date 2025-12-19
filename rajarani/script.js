let players = JSON.parse(localStorage.getItem('rr_players')) || [];
let currentRound = 1, totalRounds = 5, assignedRoles = [], currentTurn = 0, timerInterval, selectedSuspect = null;

const playSnd = (id) => { const s = document.getElementById(id); if(s) { s.currentTime = 0; s.play().catch(()=>{}); } };
const stopSnd = (id) => { const s = document.getElementById(id); if(s) { s.pause(); s.currentTime = 0; } };

function save() { localStorage.setItem('rr_players', JSON.stringify(players)); }

// --- UI MODALS ---
function toggleInfoModal() { document.getElementById('infoModal').classList.toggle('hidden'); }

function toggleScoreModal() {
    const m = document.getElementById('scoreModal');
    if(m.classList.contains('hidden')) {
        const sorted = [...players].sort((a,b) => b.score - a.score);
        document.getElementById('modalScoreList').innerHTML = sorted.map(p => `
            <div class="bg-slate-900/40 p-5 rounded-3xl border border-slate-800">
                <div class="flex justify-between items-center mb-3">
                    <span class="font-bold uppercase text-xs tracking-widest">${p.name}</span>
                    <span class="text-yellow-500 font-mono font-bold">${p.score} <span class="text-[8px] opacity-50">PTS</span></span>
                </div>
                <div class="flex gap-2 overflow-x-auto no-scrollbar">
                    ${(p.history || []).map(h => `<span class="history-dot">${h}</span>`).join('') || '<span class="italic text-[10px] opacity-30">No history</span>'}
                </div>
            </div>`).join('');
        m.classList.remove('hidden');
    } else m.classList.add('hidden');
}

// --- SYSTEM ---
function fullReset() {
    if(confirm("RESTART EVERYTHING? All players and scores will be deleted.")) {
        localStorage.clear();
        location.reload();
    }
}
function shareResults() {
    const sorted = [...players].sort((a,b) => b.score - a.score);
    const gameUrl = window.location.href; // Automatically gets your current game link
    
    let text = "👑 *RAJA RANI EMPIRE STANDINGS* 👑\n\n";
    
    sorted.forEach((p, i) => {
        const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "👤";
        text += `${medal} ${p.name}: ${p.score} Pts\n`;
    });
    
    text += `\n🎮 Play here: ${gameUrl}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Empire Standings',
            text: text,
            url: gameUrl // Some apps use the dedicated URL field
        }).catch((error) => console.log('Error sharing', error));
    } else {
        // Fallback for desktop browsers
        navigator.clipboard.writeText(text);
        alert("Rankings and Game URL copied to clipboard!");
    }
}

// --- GAME LOGIC ---
function confirmRounds() {
    totalRounds = parseInt(document.getElementById('roundInput').value) || 5;
    showScreen('setup');
    renderPlayerList();
}

function addPlayer() {
    const n = document.getElementById('playerName'), p = document.getElementById('playerPass');
    if (!n.value || p.value.length !== 2) return;
    players.push({ name: n.value.trim().toUpperCase(), pass: p.value, score: 0, history: [], stats: {} });
    n.value = ""; p.value = ""; renderPlayerList(); save();
}

function renderPlayerList() {
    document.getElementById('playerList').innerHTML = players.map((p, i) => `
        <div class="bg-slate-900/60 p-4 rounded-2xl flex justify-between items-center border border-slate-800/50">
            <span class="font-bold tracking-tight">👤 ${p.name}</span>
            <button onclick="players.splice(${i}, 1); renderPlayerList(); save();" class="text-red-500 font-bold px-3">✕</button>
        </div>`).join('');
    document.getElementById('startBtn').classList.toggle('hidden', players.length < 4);
}

function startGame() { startRound(); }

function startRound() {
    let pool = ["RAJA 👑", "RANI 👸", "KAVALAN 👮", "THIRUDAN 👤"];
    while(pool.length < players.length) pool.push("MAKKAL 👥");
    assignedRoles = pool.sort(() => Math.random() - 0.5);
    currentTurn = 0;
    showScreen('passwordScreen');
    prepareTurn();
}

function prepareTurn() {
    document.getElementById('pinEntryArea').classList.remove('hidden');
    document.getElementById('roleDisplayArea').classList.add('hidden');
    document.getElementById('passPhoneArea').classList.add('hidden');
    document.getElementById('turnIndicator').innerText = players[currentTurn].name;
    document.getElementById('checkPass').value = "";
}

function checkPassword() {
    if (document.getElementById('checkPass').value === players[currentTurn].pass) {
        const role = assignedRoles[currentTurn];
        document.getElementById('roleShow').innerText = role;
        document.getElementById('pinEntryArea').classList.add('hidden');
        document.getElementById('roleDisplayArea').classList.remove('hidden');
        
        if(role.includes("KAVALAN")) playSnd('sndSiren');
        else playSnd('sndReveal');
    } else {
        alert("Incorrect PIN");
        document.getElementById('checkPass').value = "";
    }
}

function hideRole() {
    stopSnd('sndSiren');
    document.getElementById('roleDisplayArea').classList.add('hidden');
    document.getElementById('passPhoneArea').classList.remove('hidden');
}

function nextPlayer() {
    currentTurn++;
    if (currentTurn < players.length) prepareTurn();
    else startPolicePhase();
}

function startPolicePhase() {
    showScreen('policeScreen');
    document.getElementById('mainBody').classList.add('siren-bg');
    playSnd('sndSiren');
    const kIdx = assignedRoles.indexOf('KAVALAN 👮');
    document.getElementById('policeName').innerText = players[kIdx].name;
    document.getElementById('suspectContainer').innerHTML = players.map((p, i) => i === kIdx ? '' : `
        <button onclick="handleSelect(${i}, this)" class="sus-btn w-full p-5 rounded-2xl bg-slate-900 border border-slate-800 flex justify-between items-center active:scale-95 transition-all">
            <span class="font-bold">${p.name}</span>
            <div class="w-5 h-5 rounded-full border-2 border-slate-700"></div>
        </button>`).join('');
    let t = 30;
    timerInterval = setInterval(() => {
        t--; document.getElementById('timerDisplay').innerText = t+"s";
        if(t <= 0) { clearInterval(timerInterval); submitGuess(true); }
    }, 1000);
}

function handleSelect(idx, el) {
    selectedSuspect = idx;
    document.querySelectorAll('.sus-btn').forEach(b => {
        b.classList.remove('border-blue-500', 'bg-blue-900/20');
        b.querySelector('div').classList.replace('bg-blue-500', 'bg-transparent');
    });
    el.classList.add('border-blue-500', 'bg-blue-900/20');
    el.querySelector('div').classList.add('bg-blue-500');
    document.getElementById('arrestBtn').classList.remove('opacity-20', 'pointer-events-none');
}

function submitGuess(isTimeout) {
    clearInterval(timerInterval); stopSnd('sndSiren'); document.getElementById('mainBody').classList.remove('siren-bg');
    const tIdx = assignedRoles.indexOf('THIRUDAN 👤'), kIdx = assignedRoles.indexOf('KAVALAN 👮');
    
    players.forEach((p, i) => {
        const emo = assignedRoles[i].split(' ')[1];
        if(!p.history) p.history = [];
        p.history.push(emo);
        p.score += assignedRoles[i].includes('RAJA') ? 1000 : assignedRoles[i].includes('RANI') ? 500 : assignedRoles[i].includes('MAKKAL') ? 300 : 0;
    });

    const win = !isTimeout && selectedSuspect === tIdx;
    if (win) { players[kIdx].score += 250; playSnd('sndWin'); } 
    else { players[tIdx].score += 250; playSnd('sndFail'); }
    
    save();
    document.getElementById('verdictTitle').innerText = win ? "ARRESTED!" : "ESCAPED!";
    document.getElementById('verdictDesc').innerText = "THE THIEF WAS " + players[tIdx].name;
    document.getElementById('verdictIcon').innerText = win ? "🚓" : "🎭";
    document.getElementById('verdictOverlay').classList.remove('hidden');
}

function closeVerdict() {
    document.getElementById('verdictOverlay').classList.add('hidden');
    if (currentRound >= totalRounds) showCelebration();
    else { currentRound++; startRound(); }
}

function showCelebration() {
    showScreen('celebrationScreen');
    confetti({ particleCount: 200, spread: 100, origin: { y: 0.8 } });
    const sorted = [...players].sort((a,b) => b.score - a.score);
    document.getElementById('podium').innerHTML = sorted.map((p, i) => `
        <div class="bg-slate-900/80 p-5 rounded-3xl border ${i===0?'border-yellow-500':'border-slate-800'} flex justify-between items-center">
            <span class="font-royal text-sm">${i+1}. ${p.name}</span>
            <span class="text-yellow-500 font-bold font-mono">${p.score} PTS</span>
        </div>`).join('');
}

function showScreen(id) {
    ['roundSetup', 'setup', 'passwordScreen', 'policeScreen', 'celebrationScreen'].forEach(s => document.getElementById(s).classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

// Service Worker for Offline
if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js'); }); }

// Bootstrap
window.onload = () => { if(players.length > 0) { showScreen('setup'); renderPlayerList(); } };
