const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const usernameInput = document.getElementById('username');
const copyLinkBtn = document.getElementById('copy-link-btn');
const newRoomBtn = document.getElementById('new-room-btn');
const messagesDiv = document.getElementById('messages');
const msgInput = document.getElementById('msg-input');
const sendBtn = document.getElementById('send-btn');

let peer = null;
let connections = [];
let myName = 'Anônimo_' + Math.floor(100 + Math.random() * 900);
usernameInput.value = myName;

// Atualiza apelido se o usuário mudar no topo
usernameInput.addEventListener('input', () => {
    myName = usernameInput.value.trim() || 'Anônimo';
});

// Pega o código da sala na URL (#codigo) ou cria um novo na hora
let roomCode = window.location.hash.replace('#', '');
if (!roomCode) {
    roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    window.location.hash = roomCode;
}

const hostId = 'sala-instantanea-' + roomCode;

// Adiciona mensagens na tela
function addMessage(sender, text, type = 'other') {
    const div = document.createElement('div');
    div.classList.add('msg');

    if (type === 'system') {
        div.classList.add('msg-system');
        div.textContent = text;
    } else {
        div.classList.add(type === 'me' ? 'msg-me' : 'msg-other');
        div.innerHTML = `<div class="msg-sender">${escapeHtml(sender)}</div><div>${escapeHtml(text)}</div>`;
    }

    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Inicia a conexão automaticamente
function initRoom() {
    // Tenta ser o criador (Host) da sala
    peer = new Peer(hostId);

    peer.on('open', () => {
        statusDot.className = 'dot online';
        statusText.textContent = `Sala: ${roomCode} (Online)`;
        addMessage('', 'Sala pronta! Escreva abaixo ou clique em "Copiar Link da Sala" para chamar alguém.', 'system');
    });

    // Quando alguém entra na sua sala
    peer.on('connection', (conn) => {
        setupConnection(conn);
    });

    // Se a sala já existe (alguém já abriu o link antes), entra como convidado
    peer.on('error', (err) => {
        if (err.type === 'unavailable-id') {
            peer.destroy();
            joinExistingRoom();
        } else {
            statusText.textContent = 'Modo Local (Offline)';
        }
    });
}

function joinExistingRoom() {
    peer = new Peer();
    peer.on('open', () => {
        const conn = peer.connect(hostId);
        conn.on('open', () => {
            statusDot.className = 'dot online';
            statusText.textContent = `Sala: ${roomCode} (Conectado)`;
            addMessage('', 'Você entrou na conversa!', 'system');
            conn.send({ type: 'join', sender: myName });
            setupConnection(conn);
        });
    });
}

function setupConnection(conn) {
    connections.push(conn);

    conn.on('data', (data) => {
        if (data.type === 'join') {
            addMessage('', `${data.sender} entrou na sala.`, 'system');
            broadcast(data, conn);
        } else if (data.type === 'chat') {
            addMessage(data.sender, data.text, 'other');
            broadcast(data, conn);
        }
    });

    conn.on('close', () => {
        connections = connections.filter(c => c !== conn);
        addMessage('', 'Um participante saiu.', 'system');
    });
}

function broadcast(data, excludeConn) {
    connections.forEach(conn => {
        if (conn !== excludeConn && conn.open) {
            conn.send(data);
        }
    });
}

// Enviar mensagem
function sendMessage() {
    const text = msgInput.value.trim();
    if (!text) return;

    addMessage(myName, text, 'me');
    msgInput.value = '';

    const payload = { type: 'chat', sender: myName, text: text };
    connections.forEach(conn => {
        if (conn.open) conn.send(payload);
    });
}

sendBtn.addEventListener('click', sendMessage);
msgInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Copiar link completo da sala
copyLinkBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(window.location.href);
    copyLinkBtn.textContent = 'Link Copiado!';
    setTimeout(() => copyLinkBtn.textContent = 'Copiar Link da Sala', 2000);
});

// Criar uma nova sala limpa
newRoomBtn.addEventListener('click', () => {
    window.location.hash = '';
    window.location.reload();
});

initRoom();
